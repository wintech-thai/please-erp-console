import { NextRequest, NextResponse } from 'next/server'

// ── PostgreSQL backend (via C# API) ──────────────────────────────────────────

function fillTimelineBuckets(buckets: any[], intervalStr: string, fromMs: number, toMs: number): any[] {
  const match = intervalStr.match(/^(\d+)([smhd])$/)
  if (!match) return buckets
  const val = parseInt(match[1])
  const unit = match[2]
  const stepMs = val * (unit === 's' ? 1000 : unit === 'm' ? 60_000 : unit === 'h' ? 3_600_000 : 86_400_000)
  const bucketMap = new Map<number, any>()
  for (const b of buckets) bucketMap.set(Number(b.key), b)
  const filled: any[] = []
  const startAligned = Math.floor(fromMs / stepMs) * stepMs
  for (let ts = startAligned; ts <= toMs; ts += stepMs) {
    filled.push(bucketMap.get(ts) ?? { key: ts, key_as_string: new Date(ts).toISOString(), doc_count: 0, group_by_api: { buckets: [] } })
  }
  return filled
}

function extractInterval(esPayload: any): string | undefined {
  return esPayload?.aggs?.timeline?.date_histogram?.fixed_interval
}

function extractTimeRange(esPayload: any): { fromDate?: string; toDate?: string } {
  const must: any[] = esPayload?.query?.bool?.must || []
  const rangeClause = must.find((m: any) => m.range?.['@timestamp'])
  if (!rangeClause) return {}
  const ts = rangeClause.range['@timestamp']
  return { fromDate: ts.gte, toDate: ts.lte }
}

function extractSearch(esPayload: any): string | undefined {
  const must: any[] = esPayload?.query?.bool?.must || []
  const mm = must.find((m: any) => m.multi_match || m.match)
  return mm?.multi_match?.query ?? mm?.match?.['data.userInfo.UserName'] ?? mm?.match?.['data.api.ApiName'] ?? mm?.match?.['data.CfClientIp']
}

async function handlePostgres(req: NextRequest): Promise<Response> {
  const orgId = req.headers.get('x-org-id')
  if (!orgId) return NextResponse.json({ status: 'ERROR', message: 'Missing Org ID' }, { status: 400 })

  const body = await req.json()
  const { esPayload } = body

  const { fromDate, toDate } = extractTimeRange(esPayload)
  const interval = extractInterval(esPayload)
  const search = extractSearch(esPayload)
  const from: number = esPayload?.from ?? 0
  const size: number = esPayload?.size ?? 25
  const returnDocs = size > 0

  const apiBase = process.env.BACKEND_URL || ''
  const webRole = process.env.WEB_ROLE || 'ADMIN'
  const isAdmin = webRole === 'ADMIN'
  const accessToken = req.cookies.get('accessToken')?.value
  const incomingAuth = req.headers.get('Authorization')
  const authHeader = incomingAuth
    ? incomingAuth
    : accessToken
      ? `Bearer ${Buffer.from(accessToken).toString('base64')}`
      : ''

  const payload: Record<string, unknown> = {
    FromDate: fromDate,
    ToDate: toDate,
    FullTextSearch: search ?? '',
    Limit: returnDocs ? size : 0,
    Offset: returnDocs ? Math.floor(from / (size || 1)) + 1 : 1,
    ReturnDocs: returnDocs,
    Interval: interval,
    GroupBy: 'api',
  }

  const auditLogUrl = isAdmin
    ? `${apiBase}/admin-api/AdminAuditLog/org/global/action/QueryAuditLogs`
    : `${apiBase}/api/AuditLog/org/${orgId}/action/QueryAuditLogs`

  const apiRes = await fetch(auditLogUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Onix-Application-Type': 'PLEASE-ERP',
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
    body: JSON.stringify(payload),
  })

  if (!apiRes.ok) {
    const text = await apiRes.text()
    console.error('[audit-log] backend error:', apiRes.status, text)
    return NextResponse.json({ status: 'ERROR', message: text, httpStatus: apiRes.status }, { status: apiRes.status })
  }

  const result = await apiRes.json()

  if (interval && result.aggregations?.timeline?.buckets) {
    const now = Date.now()
    const fromMs = fromDate ? new Date(fromDate).getTime() : now - 86_400_000
    const toMs = toDate ? new Date(toDate).getTime() : now
    result.aggregations.timeline.buckets = fillTimelineBuckets(
      result.aggregations.timeline.buckets,
      interval,
      fromMs,
      toMs
    )
  }

  return NextResponse.json(result)
}

// ── Router ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    return await handlePostgres(req)
  } catch (error: any) {
    console.error('Audit log query error:', error)
    return NextResponse.json({ status: 'ERROR', message: error.message }, { status: 500 })
  }
}

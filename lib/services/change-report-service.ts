import { getStorageAdapter } from '../storage-adapter'
import type { ChangeReport, CreateChangeReportPayload } from '@/types/change-report'
import { generateId } from '@/lib/utils'

export async function createChangeReport(payload: CreateChangeReportPayload): Promise<ChangeReport> {
  const adapter = getStorageAdapter()
  
  const report: ChangeReport = {
    id: generateId(),
    type: payload.type,
    url: payload.url,
    content: payload.content,
    status: 'open',
    createdAt: new Date().toISOString(),
  }

  const dbData = {
    id: report.id,
    type: report.type,
    url: report.url,
    content: report.content,
    status: report.status,
    created_at: report.createdAt,
  }

  await adapter.saveItem('change_reports', dbData)
  
  return report
}

export async function getOpenChangeReports(): Promise<ChangeReport[]> {
  const adapter = getStorageAdapter()
  const rawData = await adapter.query<any>('change_reports', {})
  
  return rawData
    .filter((r: any) => r.status === 'open')
    .map((r: any) => ({
      id: r.id,
      type: r.type,
      url: r.url,
      content: r.content,
      status: r.status,
      createdAt: r.created_at,
    }))
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

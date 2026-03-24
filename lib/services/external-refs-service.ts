/**
 * lib/services/external-refs-service.ts
 * Bidirectional mapping between local Mira entities and external provider records.
 * All reads/writes go through the storage adapter (SOP-6 + SOP-9).
 */

import type { ExternalRef, ExternalProvider } from '@/types/external-ref'
import { getStorageAdapter } from '@/lib/storage-adapter'
import { generateId } from '@/lib/utils'

type CreateExternalRefInput = Omit<ExternalRef, 'id' | 'createdAt'>

/** Create and persist a new ExternalRef. Returns the created record. */
export async function createExternalRef(data: CreateExternalRefInput): Promise<ExternalRef> {
  const adapter = getStorageAdapter()
  const ref: ExternalRef = {
    id: generateId(),
    createdAt: new Date().toISOString(),
    ...data,
  }
  return adapter.saveItem<ExternalRef>('externalRefs', ref)
}

/** All ExternalRefs for a specific local entity. */
export async function getExternalRefsForEntity(
  entityType: ExternalRef['entityType'],
  entityId: string
): Promise<ExternalRef[]> {
  const adapter = getStorageAdapter()
  const refs = await adapter.getCollection<ExternalRef>('externalRefs')
  return refs.filter((r) => r.entityType === entityType && r.entityId === entityId)
}

/** Reverse lookup by provider + external ID. */
export async function findByExternalId(
  provider: ExternalProvider,
  externalId: string
): Promise<ExternalRef | undefined> {
  const adapter = getStorageAdapter()
  const refs = await adapter.getCollection<ExternalRef>('externalRefs')
  return refs.find((r) => r.provider === provider && r.externalId === externalId)
}

/** Reverse lookup by external number. */
export async function findByExternalNumber(
  provider: ExternalProvider,
  entityType: ExternalRef['entityType'],
  externalNumber: number
): Promise<ExternalRef | undefined> {
  const adapter = getStorageAdapter()
  const refs = await adapter.getCollection<ExternalRef>('externalRefs')
  return refs.find(
    (r) =>
      r.provider === provider &&
      r.entityType === entityType &&
      r.externalNumber === externalNumber
  )
}

/** Delete an ExternalRef by its local ID. */
export async function deleteExternalRef(id: string): Promise<void> {
  const adapter = getStorageAdapter()
  await adapter.deleteItem('externalRefs', id)
}

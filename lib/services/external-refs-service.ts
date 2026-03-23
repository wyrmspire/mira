/**
 * lib/services/external-refs-service.ts
 * Bidirectional mapping between local Mira entities and external provider records
 * (GitHub issues/PRs, Vercel deployments, etc.).
 *
 * Primary use-case: GitHub webhook event arrives with a PR number → look up
 * which local project it belongs to.
 *
 * All reads/writes go through lib/storage.ts (SOP-6).
 */

import type { ExternalRef, ExternalProvider } from '@/types/external-ref'
import { getCollection, saveCollection } from '@/lib/storage'
import { generateId } from '@/lib/utils'

type CreateExternalRefInput = Omit<ExternalRef, 'id' | 'createdAt'>

/** Create and persist a new ExternalRef. Returns the created record. */
export function createExternalRef(data: CreateExternalRefInput): ExternalRef {
  const refs = getCollection('externalRefs')
  const ref: ExternalRef = {
    id: `ref-${generateId()}`,
    createdAt: new Date().toISOString(),
    ...data,
  }
  refs.push(ref)
  saveCollection('externalRefs', refs)
  return ref
}

/** All ExternalRefs for a specific local entity (e.g. all refs for project "proj-001"). */
export function getExternalRefsForEntity(
  entityType: ExternalRef['entityType'],
  entityId: string
): ExternalRef[] {
  const refs = getCollection('externalRefs')
  return refs.filter((r) => r.entityType === entityType && r.entityId === entityId)
}

/**
 * Reverse lookup — given a provider + external ID (e.g. GitHub issue number "42"),
 * find the matching local entity reference.
 *
 * @param provider  'github' | 'vercel' | 'supabase'
 * @param externalId  The external system's identifier string (can be a number stringified)
 */
export function findByExternalId(
  provider: ExternalProvider,
  externalId: string
): ExternalRef | undefined {
  const refs = getCollection('externalRefs')
  return refs.find((r) => r.provider === provider && r.externalId === externalId)
}

/**
 * Reverse lookup by external number (e.g. GitHub PR number as a JS number).
 * Convenience wrapper around findByExternalId.
 */
export function findByExternalNumber(
  provider: ExternalProvider,
  entityType: ExternalRef['entityType'],
  externalNumber: number
): ExternalRef | undefined {
  const refs = getCollection('externalRefs')
  return refs.find(
    (r) =>
      r.provider === provider &&
      r.entityType === entityType &&
      r.externalNumber === externalNumber
  )
}

/** Delete an ExternalRef by its local ID. No-op if not found. */
export function deleteExternalRef(id: string): void {
  const refs = getCollection('externalRefs')
  const filtered = refs.filter((r) => r.id !== id)
  saveCollection('externalRefs', filtered)
}

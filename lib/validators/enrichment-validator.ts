// lib/validators/enrichment-validator.ts
import { NexusIngestPayload, NEXUS_ATOM_TYPES } from '@/types/enrichment';

/**
 * Validates the ingest payload from Nexus.
 */
export function validateNexusIngestPayload(body: any): { 
  valid: boolean; 
  error?: string; 
  data?: NexusIngestPayload 
} {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Payload must be an object' };
  }

  // 1. Required Top-level Fields
  if (!body.delivery_id || typeof body.delivery_id !== 'string') {
    return { valid: false, error: 'Missing or invalid delivery_id (idempotency key)' };
  }

  if (!Array.isArray(body.atoms) || body.atoms.length === 0) {
    return { valid: false, error: 'Payload must contain a non-empty atoms array' };
  }

  // 2. Validate Atoms
  for (let i = 0; i < body.atoms.length; i++) {
    const atom = body.atoms[i];
    
    if (!atom || typeof atom !== 'object') {
      return { valid: false, error: `Atom at index ${i} must be an object` };
    }

    if (!atom.atom_type || !NEXUS_ATOM_TYPES.includes(atom.atom_type)) {
      return { valid: false, error: `Atom at index ${i} has missing or invalid atom_type: ${atom.atom_type}` };
    }

    if (!atom.title || typeof atom.title !== 'string') {
      return { valid: false, error: `Atom at index ${i} missing or invalid title` };
    }

    if (!atom.content || typeof atom.content !== 'string') {
      return { valid: false, error: `Atom at index ${i} missing or invalid content` };
    }

    // key_ideas must be an array if present (it's required by the NexusAtomPayload interface)
    if (!Array.isArray(atom.key_ideas)) {
      return { valid: false, error: `Atom at index ${i} key_ideas must be an array` };
    }
  }

  // 3. Optional IDs validation
  if (body.request_id && typeof body.request_id !== 'string') {
    return { valid: false, error: 'Invalid request_id' };
  }

  if (body.target_experience_id && typeof body.target_experience_id !== 'string') {
    return { valid: false, error: 'Invalid target_experience_id' };
  }

  if (body.target_step_id && typeof body.target_step_id !== 'string') {
    return { valid: false, error: 'Invalid target_step_id' };
  }

  return { valid: true, data: body as NexusIngestPayload };
}

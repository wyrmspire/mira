// lib/services/enrichment-service.ts
import { 
  EnrichmentRequest, 
  EnrichmentRequestRow, 
  EnrichmentDelivery, 
  EnrichmentDeliveryRow 
} from '@/types/enrichment';
import { getStorageAdapter } from '@/lib/storage-adapter';
import { generateId } from '@/lib/utils';
import { EnrichmentRequestStatus, EnrichmentDeliveryStatus } from '@/lib/constants';

function requestFromDB(row: EnrichmentRequestRow): EnrichmentRequest {
  return {
    id: row.id,
    userId: row.user_id,
    goalId: row.goal_id,
    experienceId: row.experience_id,
    stepId: row.step_id,
    requestedGap: row.requested_gap,
    requestContext: row.request_context || {},
    atomTypesRequested: row.atom_types_requested || [],
    status: row.status,
    nexusRunId: row.nexus_run_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function requestToDB(request: Partial<EnrichmentRequest>): Partial<EnrichmentRequestRow> {
  const row: any = {};
  if (request.id) row.id = request.id;
  if (request.userId) row.user_id = request.userId;
  if (request.goalId !== undefined) row.goal_id = request.goalId;
  if (request.experienceId !== undefined) row.experience_id = request.experienceId;
  if (request.stepId !== undefined) row.step_id = request.stepId;
  if (request.requestedGap) row.requested_gap = request.requestedGap;
  if (request.requestContext) row.request_context = request.requestContext;
  if (request.atomTypesRequested) row.atom_types_requested = request.atomTypesRequested;
  if (request.status) row.status = request.status;
  if (request.nexusRunId !== undefined) row.nexus_run_id = request.nexusRunId;
  if (request.createdAt) row.created_at = request.createdAt;
  if (request.updatedAt) row.updated_at = request.updatedAt;
  return row;
}

function deliveryFromDB(row: EnrichmentDeliveryRow): EnrichmentDelivery {
  return {
    id: row.id,
    requestId: row.request_id,
    idempotencyKey: row.idempotency_key,
    sourceService: row.source_service,
    atomType: row.atom_type,
    atomPayload: row.atom_payload,
    targetExperienceId: row.target_experience_id,
    targetStepId: row.target_step_id,
    mappedEntityType: row.mapped_entity_type,
    mappedEntityId: row.mapped_entity_id,
    status: row.status,
    deliveredAt: row.delivered_at,
  };
}

function deliveryToDB(delivery: Partial<EnrichmentDelivery>): Partial<EnrichmentDeliveryRow> {
  const row: any = {};
  if (delivery.id) row.id = delivery.id;
  if (delivery.requestId !== undefined) row.request_id = delivery.requestId;
  if (delivery.idempotencyKey) row.idempotency_key = delivery.idempotencyKey;
  if (delivery.sourceService) row.source_service = delivery.sourceService;
  if (delivery.atomType) row.atom_type = delivery.atomType;
  if (delivery.atomPayload) row.atom_payload = delivery.atomPayload;
  if (delivery.targetExperienceId !== undefined) row.target_experience_id = delivery.targetExperienceId;
  if (delivery.targetStepId !== undefined) row.target_step_id = delivery.targetStepId;
  if (delivery.mappedEntityType !== undefined) row.mapped_entity_type = delivery.mappedEntityType;
  if (delivery.mappedEntityId !== undefined) row.mapped_entity_id = delivery.mappedEntityId;
  if (delivery.status) row.status = delivery.status;
  if (delivery.deliveredAt) row.delivered_at = delivery.deliveredAt;
  return row;
}

export async function createEnrichmentRequest(data: Partial<EnrichmentRequest>): Promise<EnrichmentRequest> {
  const adapter = getStorageAdapter();
  const now = new Date().toISOString();
  const request: Partial<EnrichmentRequest> = {
    ...data,
    id: data.id || generateId(),
    status: data.status || 'pending',
    createdAt: now,
    updatedAt: now,
  };
  const row = requestToDB(request);
  const result = await adapter.saveItem<EnrichmentRequestRow>('enrichment_requests', row as EnrichmentRequestRow);
  return requestFromDB(result);
}

export async function updateEnrichmentRequestStatus(id: string, status: EnrichmentRequestStatus, nexusRunId?: string): Promise<void> {
  const adapter = getStorageAdapter();
  const updates: Partial<EnrichmentRequestRow> = { status };
  if (nexusRunId) updates.nexus_run_id = nexusRunId;
  await adapter.updateItem('enrichment_requests', id, updates);
}

export async function getEnrichmentRequestById(id: string): Promise<EnrichmentRequest | null> {
  const adapter = getStorageAdapter();
  const results = await adapter.query<EnrichmentRequestRow>('enrichment_requests', { id });
  return results.length > 0 ? requestFromDB(results[0]) : null;
}

export async function getEnrichmentRequestsForExperience(experienceId: string): Promise<EnrichmentRequest[]> {
  const adapter = getStorageAdapter();
  const results = await adapter.query<EnrichmentRequestRow>('enrichment_requests', { experience_id: experienceId });
  return results.map(requestFromDB);
}

export async function createEnrichmentDelivery(data: Partial<EnrichmentDelivery>): Promise<EnrichmentDelivery> {
  const adapter = getStorageAdapter();
  const now = new Date().toISOString();
  const delivery: Partial<EnrichmentDelivery> = {
    ...data,
    id: data.id || generateId(),
    status: data.status || 'received',
    deliveredAt: now,
  };
  const row = deliveryToDB(delivery);
  const result = await adapter.saveItem<EnrichmentDeliveryRow>('enrichment_deliveries', row as EnrichmentDeliveryRow);
  return deliveryFromDB(result);
}

export async function getDeliveryByIdempotencyKey(key: string): Promise<EnrichmentDelivery | null> {
  const adapter = getStorageAdapter();
  const results = await adapter.query<EnrichmentDeliveryRow>('enrichment_deliveries', { idempotency_key: key });
  return results.length > 0 ? deliveryFromDB(results[0]) : null;
}

export async function updateDeliveryStatus(
  id: string, 
  status: EnrichmentDeliveryStatus, 
  mappedEntityType?: string, 
  mappedEntityId?: string
): Promise<void> {
  const adapter = getStorageAdapter();
  const updates: Partial<EnrichmentDeliveryRow> = { status };
  if (mappedEntityType) updates.mapped_entity_type = mappedEntityType;
  if (mappedEntityId) updates.mapped_entity_id = mappedEntityId;
  await adapter.updateItem('enrichment_deliveries', id, updates);
}

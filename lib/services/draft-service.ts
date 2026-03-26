import { getStorageAdapter } from '@/lib/storage-adapter'
import { generateId } from '@/lib/utils'
import { Artifact } from '@/types/interaction'

export interface DraftMetadata {
  step_id: string
  instance_id: string
  saved_at: string
}

/**
 * Service for managing step-level work-in-progress drafts.
 * Drafts are stored in the artifacts table with artifact_type = 'step_draft'.
 */
export async function saveDraft(instanceId: string, stepId: string, userId: string, content: Record<string, any>): Promise<void> {
  const adapter = getStorageAdapter()
  
  // 1. Fetch existing drafts for this instance to find a match
  const artifacts = await adapter.query<Artifact>('artifacts', { 
    instance_id: instanceId,
    artifact_type: 'step_draft'
  })
  
  const existingArtifact = artifacts.find(a => a.metadata?.step_id === stepId)
  
  const metadata: DraftMetadata = {
    step_id: stepId,
    instance_id: instanceId,
    saved_at: new Date().toISOString()
  }
  
  const contentStr = JSON.stringify(content)
  
  if (existingArtifact) {
    // 2. Update existing draft
    await adapter.updateItem<Artifact>('artifacts', existingArtifact.id, {
      content: contentStr,
      metadata
    })
  } else {
    // 3. Create new draft
    const newArtifact: Omit<Artifact, 'id'> = {
      instance_id: instanceId,
      artifact_type: 'step_draft',
      title: `Draft for step ${stepId}`,
      content: contentStr,
      metadata
    }
    await adapter.saveItem<Artifact>('artifacts', {
      ...newArtifact,
      id: generateId()
    } as Artifact)
  }
}

export async function getDraft(instanceId: string, stepId: string): Promise<Record<string, any> | null> {
  const adapter = getStorageAdapter()
  
  const artifacts = await adapter.query<Artifact>('artifacts', { 
    instance_id: instanceId,
    artifact_type: 'step_draft'
  })
  
  const artifact = artifacts.find(a => a.metadata?.step_id === stepId)
  
  if (!artifact) return null
  
  try {
    return JSON.parse(artifact.content)
  } catch (e) {
    console.error('[DraftService] Failed to parse draft content:', e)
    return null
  }
}

export async function getDraftsForInstance(instanceId: string): Promise<Record<string, Record<string, any>>> {
  const adapter = getStorageAdapter()
  
  const artifacts = await adapter.query<Artifact>('artifacts', { 
    instance_id: instanceId,
    artifact_type: 'step_draft'
  })
  
  const drafts: Record<string, Record<string, any>> = {}
  
  for (const artifact of artifacts) {
    const stepId = artifact.metadata?.step_id
    if (stepId) {
      try {
        drafts[stepId] = JSON.parse(artifact.content)
      } catch (e) {
        console.warn(`[DraftService] Failed to parse draft content for step ${stepId}:`, e)
      }
    }
  }
  
  return drafts
}

export async function deleteDraft(instanceId: string, stepId: string): Promise<void> {
  const adapter = getStorageAdapter()
  
  const artifacts = await adapter.query<Artifact>('artifacts', { 
    instance_id: instanceId,
    artifact_type: 'step_draft'
  })
  
  const artifact = artifacts.find(a => a.metadata?.step_id === stepId)
  
  if (artifact) {
    await adapter.deleteItem('artifacts', artifact.id)
  }
}

// lib/gateway/gateway-types.ts

/**
 * Union of all capabilities that the GPT can discover via GET /api/gpt/discover.
 */
export type DiscoverCapability = 
  | 'templates'
  | 'create_experience'
  | 'create_ephemeral'
  | 'create_idea'
  | 'step_payload'
  | 'resolution'
  | 'create_outline'
  | 'dispatch_research'
  | 'tutor_chat'
  | 'grade_checkpoint';

/**
 * Response shape for the discovery endpoint.
 * Provides the schema and example needed for GPT to correctly call gateway endpoints.
 */
export interface DiscoverResponse {
  capability: DiscoverCapability;
  endpoint: string;
  description: string;
  schema: any;
  example: any;
  /** When to use this capability instead of others */
  when_to_use?: string;
  /** Contextually relevant capabilities to explore next */
  relatedCapabilities?: string[];
}

/**
 * Common request shape for all POST gateway endpoints.
 * Discriminated by 'type' (for /create) or 'action' (for /update or /plan).
 */
export interface GatewayRequest {
  type?: string;
  action?: string;
  payload: Record<string, any>;
}

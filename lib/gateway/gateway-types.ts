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
  | 'goal'
  | 'tutor_chat'
  | 'grade_checkpoint'
  | 'create_knowledge'
  | 'skill_domain'
  | 'create_map_node'
  | 'create_map_edge'
  | 'create_map_cluster'
  | 'update_map_node'
  | 'delete_map_node'
  | 'delete_map_edge'
  | 'read_map'
  | 'assess_gaps'
  | 'update_step'
  | 'reorder_steps'
  | 'delete_step'
  | 'transition'
  | 'link_knowledge'
  | 'update_knowledge'
  | 'update_skill_domain'
  | 'transition_goal';


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

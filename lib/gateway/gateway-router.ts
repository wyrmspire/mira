import { 
  createExperienceInstance, 
  injectEphemeralExperience, 
  addStep, 
  updateExperienceStep, 
  reorderExperienceSteps, 
  deleteExperienceStep, 
  transitionExperienceStatus 
} from '@/lib/services/experience-service';
import { createIdea } from '@/lib/services/ideas-service';
import { createKnowledgeUnit } from '@/lib/services/knowledge-service';
import { createSkillDomain } from '@/lib/services/skill-domain-service';

// Note: Lane 4 builds this service. We import it to ensure we provide the link_knowledge capability.
// If it fails to import (e.g. file doesn't exist yet), it will be a TSC error later which Lane 2 or 7 will fix.
import { linkStepToKnowledge } from '@/lib/services/step-knowledge-link-service'; 

/**
 * Dispatches creation requests to the appropriate services.
 */
export async function dispatchCreate(type: string, payload: any) {
  switch (type) {
    case 'experience': {
      // Normalize camelCase GPT payload → snake_case ExperienceInstance
      const instanceData: any = {
        user_id: payload.userId ?? payload.user_id,
        template_id: payload.templateId ?? payload.template_id,
        title: payload.title ?? 'Untitled Experience',
        goal: payload.goal ?? '',
        instance_type: 'persistent' as const,
        status: 'proposed' as const,
        resolution: payload.resolution,
        reentry: payload.reentry ?? null,
        idea_id: payload.ideaId ?? payload.idea_id ?? null,
        previous_experience_id: payload.previousExperienceId ?? payload.previous_experience_id ?? null,
        next_suggested_ids: [],
        friction_level: null,
        source_conversation_id: payload.source_conversation_id ?? null,
        generated_by: payload.generated_by ?? 'gpt',
        realization_id: null,
        published_at: null,
        curriculum_outline_id: payload.curriculum_outline_id ?? null,
      };

      if (!instanceData.resolution) {
        throw new Error('Resolution is required. Call GET /api/gpt/discover?capability=resolution for valid values.');
      }
      if (!instanceData.template_id) {
        throw new Error('templateId is required. Call GET /api/gpt/discover?capability=templates for valid IDs.');
      }
      if (!instanceData.user_id) {
        throw new Error('userId is required.');
      }

      const newInstance = await createExperienceInstance(instanceData);

      // Create inline steps if provided
      if (payload.steps && Array.isArray(payload.steps)) {
        for (let i = 0; i < payload.steps.length; i++) {
          const step = payload.steps[i];
          const st = step.step_type ?? step.stepType ?? step.type;
          if (!st || st === 'step') continue;
          
          const { type: _tp, step_type: _st, stepType: _stc, title, payload: nestedPayload, completion_rule, ...rest } = step;
          await addStep(newInstance.id, {
            step_type: st,
            title: title ?? '',
            payload: nestedPayload ?? rest,
            completion_rule: completion_rule ?? null,
          });
        }
      }

      if (instanceData.previous_experience_id) {
        const { linkExperiences } = await import('@/lib/services/graph-service');
        await linkExperiences(instanceData.previous_experience_id, newInstance.id, 'chain');
      }
      return newInstance;
    }
    case 'ephemeral':
      return injectEphemeralExperience(payload);
    case 'idea':
      return createIdea(payload);
    case 'goal': {
      const { createGoal } = await import('@/lib/services/goal-service');
      const goal = await createGoal(payload);
      // Auto-create skill domains from the domains array (best-effort, won't fail the goal)
      if (payload.domains && Array.isArray(payload.domains)) {
        const domainResults: string[] = [];
        try {
          const { createSkillDomain: createDomain } = await import('@/lib/services/skill-domain-service');
          for (const domainName of payload.domains) {
            try {
              await createDomain({
                userId: goal.userId,
                goalId: goal.id,
                name: domainName,
                description: '',
                linkedUnitIds: [],
                linkedExperienceIds: []
              });
              domainResults.push(domainName);
            } catch (innerErr: any) {
              console.warn(`[gateway/create] Skill domain "${domainName}" failed:`, innerErr.message);
            }
          }
        } catch (err) {
          console.warn('[gateway/create] Skill domain service unavailable:', err);
        }
        return { ...goal, _domainsCreated: domainResults };
      }
      return goal;
    }
    case 'step': {
      if (!payload.experienceId && !payload.instanceId) {
        throw new Error('Missing experienceId (or instanceId) for step creation');
      }
      const st = payload.step_type ?? payload.stepType ?? payload.type;
      if (!st || st === 'step') {
        throw new Error('Missing explicit step_type (e.g. lesson, challenge, checkpoint) for step creation');
      }

      // SOP-41: Filter metadata out of step payload to prevent pollution
      const STEP_CONTENT_KEYS: Record<string, string[]> = {
        lesson: ['sections'],
        challenge: ['objectives'],
        checkpoint: ['questions', 'knowledge_unit_id', 'passing_threshold', 'on_fail'],
        reflection: ['prompts'],
        questionnaire: ['questions'],
        essay_tasks: ['content', 'tasks'],
        plan_builder: ['sections'],
      };
      
      const { 
        type: _tp, 
        experienceId, 
        instanceId, 
        step_type: _st, 
        stepType: _stc, 
        title, 
        payload: nestedPayload, 
        completion_rule, 
        ...rest 
      } = payload;

      const contentKeys = STEP_CONTENT_KEYS[st] || [];
      const stepPayload: any = nestedPayload && Object.keys(nestedPayload).length > 0 ? { ...nestedPayload } : {};
      
      if (!nestedPayload || Object.keys(nestedPayload).length === 0) {
        for (const key of contentKeys) {
          if (rest[key] !== undefined) {
            stepPayload[key] = rest[key];
          }
        }
      }
      
      return addStep(payload.experienceId ?? payload.instanceId, {
        step_type: st,
        title: title ?? '',
        payload: stepPayload,
        completion_rule: completion_rule ?? null
      });
    }
    case 'knowledge': {
      const { createKnowledgeUnit } = await import('@/lib/services/knowledge-service');
      // Normalize camelCase GPT payload → snake_case KnowledgeUnit
      const knowledgeData: any = {
        ...payload,
        user_id: payload.userId ?? payload.user_id,
        unit_type: payload.unitType ?? payload.unit_type,
        key_ideas: payload.keyIdeas ?? payload.key_ideas,
        common_mistake: payload.commonMistake ?? payload.common_mistake,
        action_prompt: payload.actionPrompt ?? payload.action_prompt,
        retrieval_questions: payload.retrievalQuestions ?? payload.retrieval_questions,
        linked_experience_ids: payload.linkedExperienceIds ?? payload.linked_experience_ids,
        source_experience_id: payload.sourceExperienceId ?? payload.source_experience_id,
        subtopic_seeds: payload.subtopicSeeds ?? payload.subtopic_seeds,
        mastery_status: payload.masteryStatus ?? payload.mastery_status,
      };
      
      if (!knowledgeData.user_id) {
        throw new Error('userId is required for knowledge creation.');
      }
      
      return createKnowledgeUnit(knowledgeData);
    }
    case 'skill_domain': {
      if (!payload.userId && !payload.user_id) {
        throw new Error('Missing userId for skill_domain creation.');
      }
      if (!payload.goalId && !payload.goal_id) {
        throw new Error('Missing goalId for skill_domain creation. Create a goal first via type="goal".');
      }
      if (!payload.name) {
        throw new Error('Missing name for skill_domain creation.');
      }
      return createSkillDomain({
        userId: payload.userId ?? payload.user_id,
        goalId: payload.goalId ?? payload.goal_id,
        name: payload.name,
        description: payload.description ?? '',
        linkedUnitIds: payload.linkedUnitIds ?? [],
        linkedExperienceIds: payload.linkedExperienceIds ?? [],
      });
    }
    case 'map_node': {
      const { createNode, getBoards, createBoard } = await import('@/lib/services/mind-map-service');
      let boardId = payload.boardId;
      if (!boardId) {
        const boards = await getBoards(payload.userId);
        if (boards.length > 0) {
          boardId = boards[0].id;
        } else {
          const newBoard = await createBoard(payload.userId, 'Default Board');
          boardId = newBoard.id;
        }
      }
      return createNode(payload.userId, boardId, {
        label: payload.label,
        description: payload.description,
        content: payload.content,
        color: payload.color,
        positionX: payload.position_x,
        positionY: payload.position_y,
        nodeType: 'ai_generated'
      });
    }
    case 'map_edge': {
      const { createEdge, getBoards, createBoard } = await import('@/lib/services/mind-map-service');
      let edgeBoardId = payload.boardId;
      if (!edgeBoardId) {
        const boards = await getBoards(payload.userId);
        if (boards.length > 0) {
          edgeBoardId = boards[0].id;
        } else {
          const newBoard = await createBoard(payload.userId, 'Default Board');
          edgeBoardId = newBoard.id;
        }
      }
      return createEdge(edgeBoardId, payload.sourceNodeId, payload.targetNodeId);
    }
    case 'map_cluster': {
      const { createNode, createEdge, getBoards, createBoard } = await import('@/lib/services/mind-map-service');
      const { userId, boardId: providedBoardId, centerNode, childNodes } = payload;
      
      let boardId = providedBoardId;
      if (!boardId) {
        const boards = await getBoards(userId);
        if (boards.length > 0) {
          boardId = boards[0].id;
        } else {
          const newBoard = await createBoard(userId, 'Default Board');
          boardId = newBoard.id;
        }
      }

      // 1. Create center node
      const center = await createNode(userId, boardId, {
        label: centerNode.label,
        description: centerNode.description,
        content: centerNode.content,
        color: centerNode.color,
        positionX: centerNode.position_x ?? 0,
        positionY: centerNode.position_y ?? 0,
        nodeType: 'ai_generated'
      });

      // 2. Create child nodes with radial layout
      const radius = 180; // Optimized spacing
      const createdChildren = [];
      const createdEdges = [];

      if (childNodes && Array.isArray(childNodes)) {
        const count = childNodes.length;
        for (let i = 0; i < count; i++) {
          const child = childNodes[i];
          const angle = (2 * Math.PI * i) / count;
          const x = (center.positionX ?? 0) + radius * Math.cos(angle);
          const y = (center.positionY ?? 0) + radius * Math.sin(angle);

          const newChild = await createNode(userId, boardId, {
            label: child.label,
            description: child.description,
            content: child.content,
            color: child.color,
            positionX: x,
            positionY: y,
            nodeType: 'ai_generated',
            parentNodeId: center.id
          });

          // 3. Auto-link edge from center to child
          const edge = await createEdge(boardId, center.id, newChild.id);
          
          createdChildren.push(newChild);
          createdEdges.push(edge);
        }
      }

      return {
        center,
        children: createdChildren,
        edges: createdEdges
      };
    }
    default:
      throw new Error(`Unknown create type: "${type}"`);
  }
}

/**
 * Dispatches update requests to the appropriate services.
 */
export async function dispatchUpdate(action: string, payload: any) {
  switch (action) {
    case 'update_step':
      if (!payload.stepId) throw new Error('Missing stepId');
      return updateExperienceStep(payload.stepId, payload.stepPayload ?? payload.updates);
    
    case 'reorder_steps':
      if (!payload.experienceId || !payload.orderedIds) {
        throw new Error('Missing experienceId or orderedIds');
      }
      return reorderExperienceSteps(payload.experienceId, payload.orderedIds);
    
    case 'delete_step':
      if (!payload.stepId) throw new Error('Missing stepId');
      return deleteExperienceStep(payload.stepId);
    
    case 'transition':
      if (!payload.experienceId || !payload.transitionAction) {
        throw new Error('Missing experienceId or transitionAction');
      }
      return transitionExperienceStatus(payload.experienceId, payload.transitionAction);
    
    case 'link_knowledge':
      if (!payload.stepId || !payload.knowledgeUnitId) {
        throw new Error('Missing stepId or knowledgeUnitId');
      }
      return linkStepToKnowledge(payload.stepId, payload.knowledgeUnitId, payload.linkType || 'teaches');

    case 'update_knowledge':
      if (!payload.unitId) throw new Error('Missing unitId for knowledge update');
      if (payload.mastery_status) {
        const { updateMasteryStatus } = await import('@/lib/services/knowledge-service');
        return updateMasteryStatus(payload.userId, payload.unitId, payload.mastery_status);
      }
      const { enrichKnowledgeUnit } = await import('@/lib/services/knowledge-service');
      return enrichKnowledgeUnit(payload.unitId, payload.updates);

    case 'update_skill_domain':
      if (!payload.domainId) throw new Error('Missing domainId for skill domain update');
      const { updateSkillDomain, linkKnowledgeUnit, linkExperience } = await import('@/lib/services/skill-domain-service');
      
      if (payload.action === 'link_unit') {
        return linkKnowledgeUnit(payload.domainId, payload.unitId);
      }
      if (payload.action === 'link_experience') {
        return linkExperience(payload.domainId, payload.experienceId);
      }
      if (payload.action === 'recompute_mastery') {
        const { updateDomainMastery } = await import('@/lib/experience/skill-mastery-engine');
        const { getSkillDomain } = await import('@/lib/services/skill-domain-service');
        const domain = await getSkillDomain(payload.domainId);
        if (!domain) throw new Error('Skill domain not found');
        return updateDomainMastery(domain.goalId, payload.domainId);
      }
      return updateSkillDomain(payload.domainId, payload.updates);
    case 'update_map_node':
      if (!payload.nodeId) throw new Error('Missing nodeId');
      const { updateNode } = await import('@/lib/services/mind-map-service');
      return updateNode(payload.nodeId, {
        label: payload.label,
        description: payload.description,
        content: payload.content,
        color: payload.color,
        nodeType: payload.nodeType,
        metadata: payload.metadata,
      });

    case 'delete_map_node':
      if (!payload.nodeId) throw new Error('Missing nodeId');
      const { deleteNode } = await import('@/lib/services/mind-map-service');
      return deleteNode(payload.nodeId);

    case 'delete_map_edge':
      if (!payload.edgeId) throw new Error('Missing edgeId');
      const { deleteEdge } = await import('@/lib/services/mind-map-service');
      return deleteEdge(payload.edgeId);

    case 'transition_goal': {
      if (!payload.goalId) throw new Error('Missing goalId for goal transition');
      if (!payload.transitionAction) throw new Error('Missing transitionAction for goal transition (e.g. activate, pause, complete, archive)');
      const { transitionGoalStatus } = await import('@/lib/services/goal-service');
      return transitionGoalStatus(payload.goalId, payload.transitionAction);
    }

    default:
      throw new Error(`Unknown update action: "${action}"`);
  }
}

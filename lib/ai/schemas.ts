import { z } from 'zod';

export const SynthesisOutputSchema = z.object({
  narrative: z.string().describe('2-3 sentence summary of what happened and what it means'),
  keySignals: z.array(z.string()).describe('3-5 key behavioral signals observed'),
  frictionAssessment: z.string().describe('One sentence: was the user engaged, struggling, or coasting?'),
  nextCandidates: z.array(z.string()).describe('2-3 suggested next experience types with reasoning')
});

export const FacetExtractionOutputSchema = z.object({
  facets: z.array(z.object({
    facetType: z.enum(['interest', 'skill', 'goal', 'preferred_mode', 'preferred_depth', 'friction_pattern']),
    value: z.string(),
    confidence: z.number().min(0).max(1),
    evidence: z.string()
  }))
});

export const SuggestionOutputSchema = z.object({
  suggestions: z.array(z.object({
    templateClass: z.string(),
    reason: z.string(),
    confidence: z.number(),
    suggestedResolution: z.object({
      depth: z.string(),
      mode: z.string(),
      timeScope: z.string(),
      intensity: z.string()
    })
  }))
});

export const CompressedStateOutputSchema = z.object({
  compressedNarrative: z.string().describe('Token-efficient narrative summary of user state'),
  prioritySignals: z.array(z.string()).describe('Top 3-5 signals the GPT should act on'),
  suggestedOpeningTopic: z.string().describe('What the GPT should bring up first')
});

export const KnowledgeEnrichmentOutputSchema = z.object({
  retrieval_questions: z.array(z.object({
    question: z.string(),
    answer: z.string(),
    difficulty: z.enum(['easy', 'medium', 'hard']),
  })),
  cross_links: z.array(z.object({
    related_domain: z.string(),
    reason: z.string(),
  })),
  skill_tags: z.array(z.string()),
});

// --- Lane 5: Tutor Chat + Checkpoint Grading Schemas ---

export const TutorChatInputSchema = z.object({
  stepId: z.string(),
  knowledgeUnitContent: z.string().describe('Full content of the linked knowledge unit'),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).describe('Prior turns in this tutoring session'),
  userMessage: z.string().describe('The learner\'s latest question or message'),
});

export const TutorChatOutputSchema = z.object({
  response: z.string().describe('The tutor\'s concise, contextual answer'),
  masterySignal: z.enum(['struggling', 'progressing', 'confident']).optional()
    .describe('Signal inferred from learner\'s message about their comprehension level'),
  suggestedFollowup: z.string().optional()
    .describe('A follow-up question the tutor could pose to deepen understanding'),
});

export const GradeCheckpointInputSchema = z.object({
  question: z.string().describe('The checkpoint question that was asked'),
  expectedAnswer: z.string().describe('The canonical correct answer'),
  userAnswer: z.string().describe('What the learner wrote'),
  unitContext: z.string().optional().describe('Relevant knowledge unit content for grading context'),
});

export const GradeCheckpointOutputSchema = z.object({
  correct: z.boolean().describe('Whether the answer is substantially correct'),
  feedback: z.string().describe('Brief, encouraging feedback explaining the grade'),
  misconception: z.string().optional().describe('The specific misconception if the answer is wrong'),
  confidence: z.number().min(0).max(1).describe('Grader\'s confidence in this verdict (0–1)'),
});

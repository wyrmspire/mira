```yaml
openapi: 3.1.0
info:
  title: Mira Studio API
  description: API for the Mira experience engine. Create experiences, fetch user state, record ideas.
  version: 1.0.0
servers:
  - url: https://mira.mytsapi.us
    description: Cloudflare tunnel to local dev

paths:
  /api/gpt/state:
    get:
      operationId: getGPTState
      summary: Get the user's current experience state for re-entry
      description: >
        Returns a compressed state packet with active experiences, re-entry prompts,
        friction signals, and suggested next steps. Call this at the start of every
        conversation to understand what the user has been doing.
      parameters:
        - name: userId
          in: query
          required: false
          schema:
            type: string
            default: "a0000000-0000-0000-0000-000000000001"
          description: User ID. Defaults to the dev user.
      responses:
        "200":
          description: GPT state packet
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/GPTStatePacket"
        "500":
          description: Server error

  /api/experiences/inject:
    post:
      operationId: injectEphemeral
      summary: Create an ephemeral experience (instant, no review)
      description: >
        Creates an ephemeral experience that renders instantly in the user's app.
        Skips the proposal/review pipeline. Use for micro-challenges, quick prompts,
        trend reactions, or any experience that should appear immediately.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/InjectEphemeralRequest"
      responses:
        "201":
          description: Experience created
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ExperienceInstance"
        "400":
          description: Missing required fields
        "500":
          description: Server error

  /api/experiences:
    get:
      operationId: listExperiences
      summary: List experience instances
      description: >
        Returns all experience instances, optionally filtered by status or type.
        Use this to check what experiences exist before creating new ones.
      parameters:
        - name: userId
          in: query
          required: false
          schema:
            type: string
            default: "a0000000-0000-0000-0000-000000000001"
        - name: status
          in: query
          required: false
          schema:
            type: string
            enum:
              - proposed
              - drafted
              - ready_for_review
              - approved
              - published
              - active
              - completed
              - archived
              - superseded
              - injected
        - name: type
          in: query
          required: false
          schema:
            type: string
            enum:
              - persistent
              - ephemeral
      responses:
        "200":
          description: Array of experience instances
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/ExperienceInstance"
        "500":
          description: Server error

    post:
      operationId: createPersistentExperience
      summary: Create a persistent experience (goes through proposal pipeline)
      description: >
        Creates a persistent experience in 'proposed' status. The user will see it
        in their library and can accept/start it. Use for substantial experiences
        that are worth returning to. Always include steps and a reentry contract.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CreatePersistentRequest"
      responses:
        "201":
          description: Experience created
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ExperienceInstance"
        "400":
          description: Missing required fields
        "500":
          description: Server error

  /api/ideas:
    get:
      operationId: listIdeas
      summary: List captured ideas
      parameters:
        - name: status
          in: query
          required: false
          schema:
            type: string
      responses:
        "200":
          description: Array of ideas
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: "#/components/schemas/Idea"

    post:
      operationId: captureIdea
      summary: Capture a new idea from conversation
      description: >
        Saves a raw idea from the conversation. Ideas can later be evolved
        into full experiences through the drill pipeline or direct proposal.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CaptureIdeaRequest"
      responses:
        "201":
          description: Idea captured
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    $ref: "#/components/schemas/Idea"

  /api/synthesis:
    get:
      operationId: getLatestSynthesis
      summary: Get the latest synthesis snapshot
      description: >
        Returns the most recent synthesis snapshot for the user. This is a compressed
        summary of recent experience outcomes, signals, and next candidates.
      parameters:
        - name: userId
          in: query
          required: false
          schema:
            type: string
            default: "a0000000-0000-0000-0000-000000000001"
      responses:
        "200":
          description: Synthesis snapshot
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/SynthesisSnapshot"
        "404":
          description: No snapshot found
        "500":
          description: Server error

  /api/interactions:
    post:
      operationId: recordInteraction
      summary: Record a user interaction event
      description: >
        Records telemetry about what the user did within an experience.
        Use sparingly — the frontend handles most interaction recording.
        This is available if you need to record a GPT-side event.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/RecordInteractionRequest"
      responses:
        "201":
          description: Interaction recorded
        "400":
          description: Missing required fields
        "500":
          description: Server error

  /api/experiences/{id}:
    get:
      operationId: getExperienceById
      summary: Get a single experience instance with its steps
      description: >
        Returns a specific experience instance by ID, including all of its steps.
        Use this to inspect step content, check completion state, or load context
        before re-entry.
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
          description: Experience instance ID
      responses:
        "200":
          description: Experience instance with steps
          content:
            application/json:
              schema:
                allOf:
                  - $ref: "#/components/schemas/ExperienceInstance"
                  - type: object
                    properties:
                      steps:
                        type: array
                        items:
                          $ref: "#/components/schemas/ExperienceStepRecord"
        "404":
          description: Experience not found
        "500":
          description: Server error

  /api/experiences/{id}/status:
    patch:
      operationId: transitionExperienceStatus
      summary: Transition an experience to a new lifecycle state
      description: >
        Moves an experience through its lifecycle state machine. Valid transitions:
        - proposed → approve → publish → activate (or use approve+publish+activate shortcut)
        - active → complete
        - completed → archive
        - injected → start (ephemeral)
        The action must be a valid transition from the current status.
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
          description: Experience instance ID
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - action
              properties:
                action:
                  type: string
                  enum: [draft, submit_for_review, request_changes, approve, publish, activate, complete, archive, supersede, start]
                  description: "The transition action to apply"
      responses:
        "200":
          description: Updated experience instance
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ExperienceInstance"
        "400":
          description: Action is required
        "422":
          description: Invalid transition or instance not found
        "500":
          description: Server error

  /api/webhook/gpt:
    post:
      operationId: sendIdea
      summary: Send an idea via the GPT webhook (legacy envelope format)
      description: >
        Captures a new idea using the webhook envelope format with source/event/data
        fields. The idea will appear in the Send page. This is an alternative to the
        direct POST /api/ideas endpoint — use whichever format is more convenient.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - source
                - event
                - data
              properties:
                source:
                  type: string
                  enum: [gpt]
                  description: Always "gpt"
                event:
                  type: string
                  enum: [idea_captured]
                  description: Always "idea_captured"
                data:
                  type: object
                  required:
                    - title
                    - rawPrompt
                    - gptSummary
                  properties:
                    title:
                      type: string
                      description: "Short idea title (3-8 words)"
                    rawPrompt:
                      type: string
                      description: "The user's original words"
                    gptSummary:
                      type: string
                      description: "Your structured 2-4 sentence summary"
                    vibe:
                      type: string
                      description: "Energy/aesthetic — e.g. 'playful', 'ambitious', 'urgent'"
                    audience:
                      type: string
                      description: "Who this is for"
                    intent:
                      type: string
                      description: "What the user wants to achieve"
                timestamp:
                  type: string
                  format: date-time
                  description: ISO 8601 timestamp
      responses:
        "201":
          description: Idea captured
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    $ref: "#/components/schemas/Idea"
                  message:
                    type: string
        "400":
          description: Invalid payload

components:
  schemas:
    Resolution:
      type: object
      required:
        - depth
        - mode
        - timeScope
        - intensity
      properties:
        depth:
          type: string
          enum: [light, medium, heavy]
          description: "light = minimal chrome, medium = progress bar + title, heavy = full header with goal"
        mode:
          type: string
          enum: [illuminate, practice, challenge, build, reflect]
          description: "illuminate = learn, practice = do, challenge = push, build = create, reflect = think"
        timeScope:
          type: string
          enum: [immediate, session, multi_day, ongoing]
          description: "How long this experience is expected to take"
        intensity:
          type: string
          enum: [low, medium, high]
          description: "How demanding the experience is"

    ReentryContract:
      type: object
      required:
        - trigger
        - prompt
        - contextScope
      properties:
        trigger:
          type: string
          enum: [time, completion, inactivity, manual]
          description: "When the re-entry should fire"
        prompt:
          type: string
          description: "What you (GPT) should say or propose when re-entering"
        contextScope:
          type: string
          enum: [minimal, full, focused]
          description: "How much context to load for re-entry"

    ExperienceStep:
      type: object
      required:
        - type
        - title
        - payload
      properties:
        type:
          type: string
          enum: [questionnaire, lesson, challenge, plan_builder, reflection, essay_tasks]
          description: "The renderer type for this step"
        title:
          type: string
          description: "Step title shown to the user"
        payload:
          type: object
          description: "Step-specific content. Format depends on type."
        completion_rule:
          type: string
          nullable: true
          description: "Optional rule for when this step counts as complete"

    ExperienceStepRecord:
      type: object
      description: "A saved experience step as stored in the database"
      properties:
        id:
          type: string
          format: uuid
        instance_id:
          type: string
          format: uuid
        step_order:
          type: integer
          description: "0-indexed position of this step in the experience"
        step_type:
          type: string
          enum: [questionnaire, lesson, challenge, plan_builder, reflection, essay_tasks]
        title:
          type: string
        payload:
          type: object
        completion_rule:
          type: string
          nullable: true

    InjectEphemeralRequest:
      type: object
      required:
        - templateId
        - userId
        - resolution
        - steps
      properties:
        templateId:
          type: string
          description: "Template ID (see template list in instructions)"
        userId:
          type: string
          default: "a0000000-0000-0000-0000-000000000001"
        title:
          type: string
          description: "Experience title"
        goal:
          type: string
          description: "What this experience achieves"
        resolution:
          $ref: "#/components/schemas/Resolution"
        steps:
          type: array
          items:
            $ref: "#/components/schemas/ExperienceStep"
          minItems: 1

    CreatePersistentRequest:
      type: object
      required:
        - templateId
        - userId
        - resolution
        - steps
      properties:
        templateId:
          type: string
          description: "Template ID (see template list in instructions)"
        userId:
          type: string
          default: "a0000000-0000-0000-0000-000000000001"
        title:
          type: string
          description: "Experience title"
        goal:
          type: string
          description: "What this experience achieves"
        resolution:
          $ref: "#/components/schemas/Resolution"
        reentry:
          $ref: "#/components/schemas/ReentryContract"
        previousExperienceId:
          type: string
          nullable: true
          description: "ID of the experience this follows in a chain"
        steps:
          type: array
          items:
            $ref: "#/components/schemas/ExperienceStep"
          minItems: 1

    ExperienceInstance:
      type: object
      properties:
        id:
          type: string
          format: uuid
        user_id:
          type: string
        template_id:
          type: string
        title:
          type: string
        goal:
          type: string
        instance_type:
          type: string
          enum: [persistent, ephemeral]
        status:
          type: string
          enum: [proposed, drafted, ready_for_review, approved, published, active, completed, archived, superseded, injected]
        resolution:
          $ref: "#/components/schemas/Resolution"
        reentry:
          $ref: "#/components/schemas/ReentryContract"
          nullable: true
        previous_experience_id:
          type: string
          nullable: true
        next_suggested_ids:
          type: array
          items:
            type: string
        friction_level:
          type: string
          enum: [low, medium, high]
          nullable: true
        created_at:
          type: string
          format: date-time
        published_at:
          type: string
          format: date-time
          nullable: true

    GPTStatePacket:
      type: object
      properties:
        latestExperiences:
          type: array
          items:
            $ref: "#/components/schemas/ExperienceInstance"
          description: "Recent experience instances"
        activeReentryPrompts:
          type: array
          items:
            type: object
            properties:
              instanceId:
                type: string
              instanceTitle:
                type: string
              prompt:
                type: string
              trigger:
                type: string
              contextScope:
                type: string
          description: "Active re-entry prompts from completed or idle experiences"
        frictionSignals:
          type: array
          items:
            type: object
            properties:
              instanceId:
                type: string
              level:
                type: string
                enum: [low, medium, high]
          description: "Friction levels observed in recent experiences"
        suggestedNext:
          type: array
          items:
            type: string
          description: "Suggested next experience IDs"
        synthesisSnapshot:
          $ref: "#/components/schemas/SynthesisSnapshot"
          nullable: true
        proposedExperiences:
          type: array
          items:
            $ref: "#/components/schemas/ExperienceInstance"
          description: "Experiences in proposed status awaiting user acceptance"

    SynthesisSnapshot:
      type: object
      properties:
        id:
          type: string
        user_id:
          type: string
        source_type:
          type: string
        source_id:
          type: string
        summary:
          type: string
        key_signals:
          type: object
        next_candidates:
          type: array
          items:
            type: string
        created_at:
          type: string

    Idea:
      type: object
      properties:
        id:
          type: string
        title:
          type: string
        rawPrompt:
          type: string
          description: "The raw text from the conversation that triggered this idea"
        gptSummary:
          type: string
          description: "GPT's structured summary of the idea"
        vibe:
          type: string
          description: "The energy or feel of the idea"
        audience:
          type: string
          description: "Who this idea is for"
        intent:
          type: string
          description: "What the user wants to achieve"
        status:
          type: string
          enum: [captured, drilling, arena, icebox, shipped, killed]
        createdAt:
          type: string

    CaptureIdeaRequest:
      type: object
      required:
        - title
        - rawPrompt
        - gptSummary
      properties:
        title:
          type: string
          description: "Short idea title"
        rawPrompt:
          type: string
          description: "The raw text from the conversation that triggered this idea. Quote or paraphrase what the user said."
        gptSummary:
          type: string
          description: "Your structured summary of the idea — what it is, why it matters, what it could become."
        vibe:
          type: string
          description: "The energy or feel — e.g. 'ambitious', 'playful', 'urgent', 'exploratory'"
        audience:
          type: string
          description: "Who this idea is for — e.g. 'self', 'team', 'public'"
        intent:
          type: string
          description: "What the user wants from this — e.g. 'explore', 'build', 'learn', 'solve'"

    RecordInteractionRequest:
      type: object
      required:
        - instanceId
        - eventType
      properties:
        instanceId:
          type: string
          description: "Experience instance ID"
        stepId:
          type: string
          nullable: true
          description: "Step ID if the event is step-specific"
        eventType:
          type: string
          enum: [step_viewed, answer_submitted, task_completed, step_skipped, time_on_step, experience_started, experience_completed]
        eventPayload:
          type: object
          description: "Event-specific data"
```

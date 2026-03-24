# Mira Interaction Capture — Contract

> Documentation for the telemetry layer of the Mira Experience Engine.

This document defines the interface and behaviors for tracking user interactions within an Experience. It is used by the `useInteractionCapture` hook and implemented by the `/api/interactions` endpoint.

---

## API Endpoint

**`POST /api/interactions`**

### Request Body Schema
```json
{
  "instanceId": "string (UUID)",
  "stepId": "string (UUID) | optional",
  "eventType": "InteractionEventType",
  "eventPayload": "object (JSONB) | optional"
}
```

---

## Event Types & Payloads

### 1. `step_viewed`
- **Trigger**: Fired when a user enters/views a specific step in an experience.
- **`stepId`**: Required.
- **Payload**: None required.
- **Example**:
  ```json
  {
    "instanceId": "...",
    "stepId": "step_1",
    "eventType": "step_viewed"
  }
  ```

### 2. `answer_submitted`
- **Trigger**: Fired when a user submits data for a specific step (e.g., questionnaire responses).
- **`stepId`**: Required.
- **Payload**: `{ answers: Record<string, any> }`
- **Example**:
  ```json
  {
    "instanceId": "...",
    "stepId": "step_1",
    "eventType": "answer_submitted",
    "eventPayload": {
      "answers": { "q1": "val1", "q2": "val2" }
    }
  }
  ```

### 3. `task_completed`
- **Trigger**: Fired when a specific task or objective within a step is marked as complete.
- **`stepId`**: Required.
- **Payload**: Optional metadata about completion.
- **Example**:
  ```json
  {
    "instanceId": "...",
    "stepId": "step_2",
    "eventType": "task_completed"
  }
  ```

### 4. `step_skipped`
- **Trigger**: Fired when a user chooses to skip an optional step.
- **`stepId`**: Required.
- **Payload**: None required.
- **Example**:
  ```json
  {
    "instanceId": "...",
    "stepId": "step_3",
    "eventType": "step_skipped"
  }
  ```

### 5. `time_on_step`
- **Trigger**: Fired when a user leaves a step (navigates away or finishes). Measures active dwell time.
- **`stepId`**: Required.
- **Payload**: `{ durationMs: number }`
- **Example**:
  ```json
  {
    "instanceId": "...",
    "stepId": "step_1",
    "eventType": "time_on_step",
    "eventPayload": { "durationMs": 45000 }
  }
  ```

### 6. `experience_started`
- **Trigger**: Fired once when the experience is first loaded in the workspace.
- **`stepId`**: Optional (usually null).
- **Payload**: None required.
- **Example**:
  ```json
  {
    "instanceId": "...",
    "eventType": "experience_started"
  }
  ```

### 7. `experience_completed`
- **Trigger**: Fired when the user reaches the final "complete" state of the entire experience.
- **`stepId`**: Optional (usually null).
- **Payload**: None required.
- **Example**:
  ```json
  {
    "instanceId": "...",
    "eventType": "experience_completed"
  }
  ```

---

## Usage in Renderers (Lane 6 Integration)

Renderers should use the `useInteractionCapture` hook:

1.  **Initialize**: `const telemetry = useInteractionCapture(instanceId)`
2.  **Mount**: `useEffect(() => telemetry.trackExperienceStart(), [])`
3.  **Step Entry**: `useEffect(() => { telemetry.trackStepView(currentStepId); telemetry.startStepTimer(currentStepId); return () => telemetry.endStepTimer(currentStepId); }, [currentStepId])`
4.  **Submission**: Pass `telemetry.trackAnswer`, `telemetry.trackComplete`, and `telemetry.trackSkip` down to individual step components.
5.  **Finalize**: Call `telemetry.trackExperienceComplete()` when the experience orchestrator reaches the end state.

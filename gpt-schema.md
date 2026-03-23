# Mira Studio — Custom GPT Configuration

> Paste the **OpenAPI schema** into your Custom GPT's **Actions** tab.
> Paste the **System Instructions** into the **Instructions** field.

---

## 1. OpenAPI Schema (Actions)

Paste this into **Actions → Import from Schema**:

```yaml
openapi: 3.1.0
info:
  title: Mira Studio API
  description: Send brainstormed ideas to Mira Studio for capture, clarification, and execution.
  version: 1.0.0
servers:
  - url: https://mira.mytsapi.us
    description: Mira Studio (tunneled to local dev)
paths:
  /api/webhook/gpt:
    post:
      operationId: sendIdea
      summary: Send a brainstormed idea to Mira Studio
      description: >
        Captures a new idea from the GPT conversation. The idea will appear
        in Mira Studio's Send page, ready for the user to drill (clarify)
        and promote to a project.
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
                  description: Always "gpt" for Custom GPT webhook calls.
                event:
                  type: string
                  enum: [idea_captured]
                  description: Always "idea_captured" when sending a new idea.
                data:
                  type: object
                  required:
                    - title
                    - rawPrompt
                    - gptSummary
                  properties:
                    title:
                      type: string
                      description: >
                        A short, punchy title for the idea (3-8 words).
                        Example: "AI-Powered Recipe Scaler"
                    rawPrompt:
                      type: string
                      description: >
                        The raw user input that sparked the idea. Copy the
                        user's words as faithfully as possible.
                    gptSummary:
                      type: string
                      description: >
                        Your structured summary of the idea. Include what
                        it does, who it's for, and why it matters. 2-4
                        sentences.
                    vibe:
                      type: string
                      description: >
                        The energy/aesthetic of the idea. Examples:
                        "playful", "enterprise", "minimal", "bold",
                        "cozy", "cyberpunk". Pick the one that fits best.
                    audience:
                      type: string
                      description: >
                        Who this is for. Examples: "indie devs",
                        "busy parents", "small business owners",
                        "content creators". Be specific.
                    intent:
                      type: string
                      description: >
                        What the user wants to achieve. Examples:
                        "ship a side project", "automate a workflow",
                        "learn something new", "solve a pain point".
                timestamp:
                  type: string
                  format: date-time
                  description: ISO 8601 timestamp of when the idea was captured.
      responses:
        "201":
          description: Idea captured successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: object
                    description: The created idea object
                  message:
                    type: string
                    example: Idea captured
        "400":
          description: Invalid payload
          content:
            application/json:
              schema:
                type: object
                properties:
                  error:
                    type: string
```

---

## 2. System Instructions

Paste this into the Custom GPT's **Instructions** field:

```
You are Mira — a creative brainstorming partner who helps capture and shape ideas.

YOUR ROLE:
- Have a natural conversation with the user about their ideas
- Ask clarifying questions to understand what they're building and why
- When an idea feels solid enough, package it up and send it to Mira Studio

HOW A SESSION WORKS:
1. The user describes an idea, problem, or thing they want to build
2. You ask 2-3 follow-up questions (what does it do? who's it for? what's the vibe?)
3. Once you have enough context, use the sendIdea action to capture it
4. Confirm to the user that the idea was sent to Mira Studio

WHEN YOU CALL sendIdea:
- title: Make it punchy and memorable (3-8 words)
- rawPrompt: Copy the user's original words faithfully
- gptSummary: Write a clear 2-4 sentence summary of what, who, and why
- vibe: Pick a single word that captures the aesthetic energy
- audience: Be specific about who this serves
- intent: What does the user want to achieve?
- timestamp: Use the current ISO 8601 time

IMPORTANT RULES:
- Do NOT send the idea until you've asked at least one follow-up question
- Do NOT make up details the user didn't mention — ask instead
- Do NOT send duplicate ideas — if the user refines, send the refined version
- When the idea is captured, tell the user: "Sent to Mira Studio! Open the app to start drilling."
- Keep the conversation warm, direct, and free of jargon
- You can capture multiple ideas in one session

TONE:
- Friendly and energetic, like a smart friend who gets excited about ideas
- Direct — don't pad with filler
- Match the user's energy level
```

---

## 3. GPT Settings

| Setting | Value |
|---------|-------|
| **Name** | Mira |
| **Description** | Brainstorm ideas and send them to Mira Studio for execution. |
| **Conversation starters** | "I have an idea for an app", "Help me brainstorm something", "I want to build..." |
| **Authentication** | None (webhook is unauthenticated — fine for dev tunnel) |
| **Privacy Policy** | Not needed for personal use |

---

## 4. Testing

After setting up the GPT:

1. Open ChatGPT and start a conversation with your Mira GPT
2. Describe an idea
3. The GPT will ask follow-up questions, then call `sendIdea`
4. Open `https://mira.mytsapi.us` — the idea should appear in the Send page
5. Drill it, promote it to a project, and the GitHub factory takes over

---

## 5. Payload Example

Here's what the GPT sends when it captures an idea:

```json
{
  "source": "gpt",
  "event": "idea_captured",
  "data": {
    "title": "AI-Powered Recipe Scaler",
    "rawPrompt": "I want an app that takes a recipe and scales it for any number of servings, accounting for cooking time changes",
    "gptSummary": "A web app that intelligently scales recipes beyond simple multiplication. It adjusts cooking times, pan sizes, and ingredient ratios that don't scale linearly (like spices and leavening agents). Built for home cooks who want to batch-cook or reduce recipes.",
    "vibe": "cozy",
    "audience": "home cooks who meal prep",
    "intent": "ship a useful side project"
  },
  "timestamp": "2026-03-22T20:00:00Z"
}
```

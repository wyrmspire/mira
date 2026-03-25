# Schema Fix Suggestions (schfix.md)

The GPT experienced a failure because the `ExperienceStep` schema defined `payload` simply as a generic `type: object` without `additionalProperties: true`, OR it was confused by the `prompt.html` which showed the step shape directly rather than nested inside `payload`.

**1. The Root Cause:**
The GPT's Action wrapper (OpenAI's strict OpenAPI validator) strips or blocks payloads that don't match the schema exactly. Since we defined `payload` as:
```yaml
        payload:
          type: object
          description: "Step-specific content. Format depends on type."
```
OpenAI often strips keys out of generic objects if `additionalProperties: true` is missing, or the GPT tries to put the fields (like `questions`) at the top level of the step because `prompt.html` was ambiguous.

**2. The Fix for public/prompt.html:**
Update the instructional string to explicitly show the required `payload` key wrapping the type-specific data.
*Example:* 
`**Questionnaire**: { "type": "questionnaire", "title": "...", "payload": { "questions": [...] } }`

**3. The Fix for public/openapi.yaml:**
Update the schema for `ExperienceStep.payload` to explicitly allow free-form fields so OpenAI doesn't strip them:
```yaml
        payload:
          type: object
          additionalProperties: true
          description: "Step-specific content inside 'payload' key..."
```
Alternatively, we could define a discriminator or `oneOf` for the payload, but `additionalProperties: true` is the easiest way to tell the GPT "put whatever JSON you want here".

I am making these fixes now.

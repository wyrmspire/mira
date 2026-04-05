import fs from 'fs';
const baseUrl = "http://localhost:3000/api/gpt";
const results = [];

async function runTest(name, url, method, payload) {
  try {
    const isDirect = url.startsWith('/experiences');
    const fullUrl = isDirect ? `http://localhost:3000/api${url}` : `${baseUrl}${url}`;
    const res = await fetch(fullUrl, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: payload ? JSON.stringify(payload) : undefined
    });
    
    let body;
    try {
        body = await res.json();
    } catch {
        body = await res.text();
    }

    const result = { name, url, payload, status: res.status, statusText: res.statusText, response: body };
    results.push(result);
    return result;
  } catch (err) {
    results.push({ name, url, payload, error: err.toString() });
  }
}

async function main() {
    // 1. Discovery -> outline -> one experience
    const r1 = await runTest("1. Outline creation (Pricing Fundamentals)", "/plan", "POST", {
        action: "create_outline",
        topic: "SaaS Pricing Strategy",
        domain: "Business",
        subtopics: [
            { title: "Pricing Fundamentals", description: "Understanding value metrics and pricing models.", order: 1 }
        ],
        pedagogicalIntent: "build_understanding"
    });

    const r1b = await runTest("1b. Create First Experience", "/create", "POST", {
        type: "ephemeral",
        title: "Pricing Fundamentals for SaaS",
        goal: "Understand value metrics and basic pricing models.",
        resolution: { depth: "medium", mode: "illuminate", timeScope: "session", intensity: "medium" },
        reentry: { trigger: "completion", prompt: "How did that go?", contextScope: "minimal" },
        steps: [
            {
                step_type: "lesson",
                title: "What is a Value Metric?",
                blocks: [
                    { type: "content", content: "A value metric is the way you measure the value your customer receives." }
                ]
            }
        ]
    });

    // 2. Create a lesson with block mechanics
    const r2 = await runTest("2. Create lesson with all Sprint 22 blocks", "/create", "POST", {
        type: "ephemeral",
        title: "Beginner Lesson: Customer Interviews",
        goal: "Master the mechanics of open-ended customer interviews.",
        resolution: { depth: "heavy", mode: "practice", timeScope: "session", intensity: "high" },
        reentry: { trigger: "completion", prompt: "Ready to move on?", contextScope: "minimal" },
        steps: [
            {
                step_type: "lesson",
                title: "Interview Mechanics",
                blocks: [
                    { 
                      type: "prediction", 
                      question: "What is the biggest mistake in customer interviews?", 
                      reveal_content: "Asking leading questions! It biases the user completely." 
                    },
                    { 
                      type: "exercise", 
                      title: "Write an open-ended question", 
                      instructions: "Write a question avoiding bias.", 
                      validation_criteria: "Must not be a yes/no question." 
                    },
                    { 
                      type: "checkpoint", 
                      question: "True or False: You should pitch your solution first.", 
                      expected_answer: "False", 
                      explanation: "Never pitch first. Always explore the problem." 
                    }
                ]
            },
            {
                step_type: "reflection",
                title: "Reflect on Bias",
                blocks: [
                    { type: "content", content: "Reflection time." }
                ],
                prompts: [ { prompt: "What are you most nervous about when interviewing?" } ]
            }
        ]
    });

    // 3. Fast-path lightweight experience
    const r3 = await runTest("3. Fast-path lightweight experience", "/create", "POST", {
        type: "ephemeral",
        title: "Better Outreach Emails",
        goal: "Draft a concise outreach email.",
        resolution: { depth: "light", mode: "illuminate", timeScope: "immediate", intensity: "low" },
        reentry: { trigger: "completion", prompt: "Done?", contextScope: "minimal" },
        steps: [
            { 
              step_type: "lesson", 
              title: "The Hook", 
              sections: [ { heading: "Rule 1", body: "Keep it under 3 sentences.", type: "text" } ]
            },
            { 
              step_type: "challenge", 
              title: "Draft It", 
              payload: { challenge_prompt: "Draft an email.", success_criteria: ["Under 3 lines"] }
            }
        ]
    });

    // 4. Fire-and-forget enrichment
    const r4 = await runTest("4. Dispatch background research", "/plan", "POST", {
        action: "dispatch_research",
        topic: "Unit Economics (CAC/LTV ratios)",
        pedagogicalIntent: "explore_concept"
    });

    // 5. Step revision / lesson surgery
    if (r2.response && r2.response.steps && r2.response.steps.length > 0) {
        const expId = r2.response.id;
        const stepId = r2.response.steps[0].id;
        const r5 = await runTest("5. Step Surgery", "/update", "POST", {
            action: "update_step",
            experienceId: expId,
            stepId: stepId,
            stepPayload: {
               title: "Interview Mechanics - Worked Example",
               blocks: [
                   { type: "content", content: "Let's look at a worked example instead of abstraction." },
                   { type: "checkpoint", question: "Did the interviewer bias the user here?", expected_answer: "Yes", explanation: "They implicitly stated what the user should feel." }
               ]
            }
        });

        const rS = await runTest("5b. Verify Surgery", `/experiences/${expId}`, "GET", null);
        if (rS && rS.status === 200) {
            const updatedStep = rS.response.steps?.find(s => s.id === stepId);
            if (updatedStep?.title === "Interview Mechanics - Worked Example") {
                console.log("✅ Step surgery verified!");
            }
        }
    }

    // 6. State hydration check (W2)
    await runTest("6. GPT State Hydration", "/state?userId=a0000000-0000-0000-0000-000000000001", "GET");

    fs.writeFileSync('api_result.json', JSON.stringify(results, null, 2));
}

main();

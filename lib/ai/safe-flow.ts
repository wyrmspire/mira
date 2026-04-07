/**
 * Wraps a Genkit flow execution with error handling and API key checks.
 * Returns the flow result or a fallback if it fails.
 */
export async function runFlowSafe<TInput, TOutput>(
  flow: { run: (input: TInput) => Promise<TOutput> },
  input: TInput,
  handler?: (output: TOutput) => Promise<any>
): Promise<any> {
  try {
    if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_GENAI_API_KEY) {
      console.warn('AI API Key is not set. Flow execution skipped.');
      return null;
    }
    
    const output = await flow.run(input);
    
    if (handler) {
      return await handler(output);
    }
    
    return output;
  } catch (error: any) {
    console.error(`[AI/safe-flow] Flow execution failed:`, error.message);
    return null;
  }
}

export async function runFlowSafe<T>(flowFn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY is not set. Flow execution skipped.');
      return fallback;
    }
    return await flowFn();
  } catch (error) {
    console.error('Flow execution failed:', error);
    return fallback;
  }
}

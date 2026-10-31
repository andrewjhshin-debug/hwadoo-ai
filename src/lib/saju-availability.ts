// Default closed: an existing API key alone never enables paid saju processing.
export function sajuReady() {
  return process.env.SAJU_API_PAID_CONFIRMED === "true" && !!(process.env.SAJU_GEMINI_API_KEY || process.env.GEMINI_API_KEY);
}

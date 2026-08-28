export const SHEETS_RATE_LIMIT_MESSAGE =
  "Google Sheets rate limit reached. Wait a minute and try again.";

function isSheetsRateLimitError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { code?: number; status?: string; message?: string };
  return (
    err.code === 429 ||
    err.status === "RESOURCE_EXHAUSTED" ||
    (typeof err.message === "string" &&
      err.message.toLowerCase().includes("quota exceeded"))
  );
}

export async function withSheetsRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (!isSheetsRateLimitError(error)) {
      throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, 3000));

    try {
      return await fn();
    } catch (retryError) {
      if (isSheetsRateLimitError(retryError)) {
        throw new Error(SHEETS_RATE_LIMIT_MESSAGE);
      }
      throw retryError;
    }
  }
}

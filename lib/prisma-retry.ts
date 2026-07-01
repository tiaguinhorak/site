import "server-only";

const RETRYABLE_CODES = new Set(["P1001", "P1008", "P1011", "P1017"]);

function isRetryablePrismaError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string" &&
    RETRYABLE_CODES.has((error as { code: string }).code)
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Retries transient PostgreSQL / pool errors (e.g. P1017 connection closed). */
export async function withPrismaRetry<T>(
  operation: () => Promise<T>,
  retries = 2,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isRetryablePrismaError(error) || attempt >= retries) {
        throw error;
      }
      await sleep(75 * (attempt + 1));
    }
  }

  throw lastError;
}

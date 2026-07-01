import "server-only";

const RETRYABLE_CODES = new Set(["P1001", "P1008", "P1011", "P1017"]);

function errorText(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const parts = [error.message];
  if (error.cause instanceof Error) parts.push(error.cause.message);
  return parts.join(" ").toLowerCase();
}

function isRetryableDbError(error: unknown): boolean {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string" &&
    RETRYABLE_CODES.has((error as { code: string }).code)
  ) {
    return true;
  }

  const text = errorText(error);
  return (
    text.includes("connection terminated") ||
    text.includes("connection timeout") ||
    text.includes("connection unexpectedly") ||
    text.includes("econnreset") ||
    text.includes("etimedout") ||
    text.includes("connect etimedout") ||
    text.includes("socket hang up") ||
    text.includes("too many connections") ||
    text.includes("cannot acquire connection")
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Retries transient PostgreSQL / pool errors (timeouts, closed connections). */
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
      if (!isRetryableDbError(error) || attempt >= retries) {
        throw error;
      }
      await sleep(150 * (attempt + 1));
    }
  }

  throw lastError;
}

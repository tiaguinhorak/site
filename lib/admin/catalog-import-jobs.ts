import "server-only";

type ImportJobType = "stickers" | "skins";

export type CatalogImportJobStatus = "running" | "done" | "failed";

export type CatalogImportJob = {
  id: string;
  userId: string;
  type: ImportJobType;
  status: CatalogImportJobStatus;
  result?: Record<string, unknown>;
  error?: string;
  startedAt: number;
  finishedAt?: number;
};

const JOB_TTL_MS = 60 * 60 * 1000;

type JobStore = Map<string, CatalogImportJob>;

function jobStore(): JobStore {
  const g = globalThis as typeof globalThis & { __clutchCatalogImportJobs?: JobStore };
  if (!g.__clutchCatalogImportJobs) {
    g.__clutchCatalogImportJobs = new Map();
  }
  return g.__clutchCatalogImportJobs;
}

function pruneOldJobs(store: JobStore) {
  const now = Date.now();
  for (const [id, job] of store.entries()) {
    if (job.finishedAt && now - job.finishedAt > JOB_TTL_MS) {
      store.delete(id);
    }
  }
}

export function createCatalogImportJob(userId: string, type: ImportJobType): CatalogImportJob {
  const store = jobStore();
  pruneOldJobs(store);

  const job: CatalogImportJob = {
    id: crypto.randomUUID(),
    userId,
    type,
    status: "running",
    startedAt: Date.now(),
  };

  store.set(job.id, job);
  return job;
}

export function getCatalogImportJob(jobId: string): CatalogImportJob | null {
  return jobStore().get(jobId) ?? null;
}

export function completeCatalogImportJob(
  jobId: string,
  result: Record<string, unknown>,
): CatalogImportJob | null {
  const store = jobStore();
  const job = store.get(jobId);
  if (!job) return null;

  job.status = "done";
  job.result = result;
  job.finishedAt = Date.now();
  store.set(jobId, job);
  return job;
}

export function failCatalogImportJob(jobId: string, error: string): CatalogImportJob | null {
  const store = jobStore();
  const job = store.get(jobId);
  if (!job) return null;

  job.status = "failed";
  job.error = error;
  job.finishedAt = Date.now();
  store.set(jobId, job);
  return job;
}

import { z } from "zod";

const processingAuthorizationSchema = z
  .object({ confirmExternalProcessing: z.literal(true) })
  .strict();

export class ProcessingAuthorizationError extends Error {
  constructor() {
    super("External processing confirmation is required");
    this.name = "ProcessingAuthorizationError";
  }
}

export function requireProcessingAuthorization(value: unknown) {
  if (!processingAuthorizationSchema.safeParse(value).success) {
    throw new ProcessingAuthorizationError();
  }
}

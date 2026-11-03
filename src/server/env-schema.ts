import { z } from "zod";

const optionalNonEmptyString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().trim().min(1).optional(),
);

const optionalUrl = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.url().optional(),
);

const optionalBoolean = z.preprocess(
  (value) =>
    value === "true" ? true : value === "false" || value === "" ? false : value,
  z.boolean().default(false),
);

export const serverEnvironmentSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: optionalUrl,
    BETTER_AUTH_SECRET: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.string().min(32).optional(),
    ),
    BETTER_AUTH_URL: optionalUrl,
    AUTH_ALLOW_SIGN_UP: optionalBoolean,
    PRIVATE_STORAGE_BUCKET: optionalNonEmptyString,
    PRIVATE_STORAGE_REGION: optionalNonEmptyString,
    PRIVATE_STORAGE_ENDPOINT: optionalUrl,
    PRIVATE_STORAGE_ACCESS_KEY_ID: optionalNonEmptyString,
    PRIVATE_STORAGE_SECRET_ACCESS_KEY: optionalNonEmptyString,
    CLOCKED_API_KEY: optionalNonEmptyString,
    CLOCKED_BASE_URL: z.url().default("https://clocked.rezolve.ai/clocked"),
  })
  .superRefine((environment, context) => {
    if (
      environment.NODE_ENV === "production" &&
      environment.BETTER_AUTH_URL &&
      new URL(environment.BETTER_AUTH_URL).protocol !== "https:"
    ) {
      context.addIssue({
        code: "custom",
        message: "BETTER_AUTH_URL must use HTTPS in production",
        path: ["BETTER_AUTH_URL"],
      });
    }
  })
  .readonly();

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

export function parseServerEnvironment(
  input: Record<string, string | undefined>,
): ServerEnvironment {
  return serverEnvironmentSchema.parse(input);
}

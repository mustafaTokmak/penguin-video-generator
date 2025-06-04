import { z } from "zod";

const envSchema = z.object({
  FAL_API_KEY: z.string().min(1, "Fal AI API key is required"),
  OPENAI_API_KEY: z.string().min(1, "OpenAI API key is required"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.string().default("3000").transform(Number),
  RATE_LIMIT_MAX_REQUESTS: z.string().default("10").transform(Number),
  RATE_LIMIT_WINDOW_MS: z.string().default("60000").transform(Number),
  // Social Media API Keys (optional)
  INSTAGRAM_ACCESS_TOKEN: z.string().optional(),
  INSTAGRAM_BUSINESS_ACCOUNT_ID: z.string().optional(),
  TIKTOK_ACCESS_TOKEN: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

let config: EnvConfig | null = null;

export function getConfig(): EnvConfig {
  if (!config) {
    try {
      console.log("process.env", process.env);
      config = envSchema.parse(process.env);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Environment validation error:", error.errors);
        throw new Error(
          `Invalid environment configuration: ${error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`,
        );
      }
      throw error;
    }
  }
  return config;
}

export function isProduction(): boolean {
  return getConfig().NODE_ENV === "production";
}

export function isDevelopment(): boolean {
  return getConfig().NODE_ENV === "development";
}

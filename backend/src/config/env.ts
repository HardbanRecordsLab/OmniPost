import { z } from 'zod';

// Define the schema for environment variables
const envSchema = z.object({
  API_KEY: z.string().min(1, 'API_KEY is required'),
  DATABASE_URL: z.string().url('Invalid DATABASE_URL'),
  REDIS_URL: z.string().url('Invalid REDIS_URL'),
  // Add more env variables as needed
});

// Validate and parse the environment variables
const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('Environment variable validation errors:', parsedEnv.error.errors);
  process.exit(1);
}

export const env = parsedEnv.data;
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  WS_PORT: z.string().default('3001'),
  
  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().default('6379'),
  REDIS_PASSWORD: z.string().optional(),
  
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('60000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100'),
  
  // Security
  CORS_ORIGIN: z.string().default('*'),
  TRUST_PROXY: z.string().default('false'),
  
  // Moderation
  ENABLE_AI_MODERATION: z.string().default('false'),
  OPENAI_API_KEY: z.string().optional(),
  
  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

const env = envSchema.parse(process.env);

export const config = {
  env: env.NODE_ENV,
  port: parseInt(env.PORT, 10),
  wsPort: parseInt(env.WS_PORT, 10),
  
  redis: {
    host: env.REDIS_HOST,
    port: parseInt(env.REDIS_PORT, 10),
    password: env.REDIS_PASSWORD,
  },
  
  rateLimit: {
    windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS, 10),
    maxRequests: parseInt(env.RATE_LIMIT_MAX_REQUESTS, 10),
  },
  
  security: {
    corsOrigin: env.CORS_ORIGIN,
    trustProxy: env.TRUST_PROXY === 'true',
  },
  
  moderation: {
    enableAI: env.ENABLE_AI_MODERATION === 'true',
    openaiApiKey: env.OPENAI_API_KEY,
  },
  
  logLevel: env.LOG_LEVEL,
  
  isDev: env.NODE_ENV === 'development',
  isProd: env.NODE_ENV === 'production',
} as const;
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    BLOB_READ_WRITE_TOKEN: z.string().min(1),
    DATABASE_URL: z.string().url(),
    OPENAI_API_KEY: z.string().min(1),
    WHATSAPP_WEBHOOK_SECRET: z.string().min(1),
  },
  runtimeEnv: {
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
    DATABASE_URL: process.env.DATABASE_URL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    WHATSAPP_WEBHOOK_SECRET: process.env.WHATSAPP_WEBHOOK_SECRET,
  },
});

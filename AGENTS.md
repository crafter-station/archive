# Agent Notes

## Commands

- Use Bun; the lockfile is `bun.lock`. Install with `bun install`.
- `bun run dev` starts the Next.js app at `http://localhost:3000`.
- `bun run lint` runs `biome check`; `bun run format` runs `biome format --write`.
- `bun run build` is the main type/build verification. There is no test script or test config in this repo currently.
- Drizzle commands require `DATABASE_URL`: `bun run db:generate`, `bun run db:migrate`, `bun run db:studio`.
- Run Trigger.dev locally with `bunx trigger.dev@latest dev`.

## Next.js 16

- This repo uses Next.js `16.2.6` and React `19.2.4`. APIs and file conventions may differ from older Next.js assumptions.
- Before changing framework-sensitive code, read the relevant guide in `node_modules/next/dist/docs/` and heed deprecation notices.
- App Router props are async here: pages type `params` and `searchParams` as promises and `await` them.

## App Structure

- Public routes are `src/app/page.tsx` for the chat archive and `src/app/[date]/page.tsx` for daily logs/entities.
- Both public pages are `dynamic = "force-dynamic"` because they read database-backed live archive data.
- WhatsApp ingestion is `POST /api/webhooks/whatsapp` in `src/app/api/webhooks/whatsapp/route.ts`; it requires `x-webhook-signature` to exactly match `WHATSAPP_WEBHOOK_SECRET`.
- The webhook currently only archives the configured group JID in `src/lib/whatsapp-constants.ts`.
- The scheduled archive agent is `src/trigger/chat-log-agent.ts`; Trigger config only scans `./src/trigger`.

## Data And Env

- Required server env is validated in `src/env.ts`: `DATABASE_URL`, `OPENAI_API_KEY`, `BLOB_READ_WRITE_TOKEN`, `WHATSAPP_WEBHOOK_SECRET`.
- Import `env` from `@/env` in app code instead of reading `process.env` directly, except config files like `drizzle.config.ts`.
- Database schema lives in `src/db/schema.ts`; generated migrations live in `drizzle/`. After schema edits, run `bun run db:generate` and include the migration.
- Drizzle uses Neon HTTP via `src/db/client.ts`, not a local Postgres client.
- App timestamps are stored as UTC timezone-aware timestamps; display/grouping logic uses `America/Bogota` from `src/lib/log-windows.ts`.

## Agent Behavior

- The log agent uses AI SDK `generateText` with model `gpt-5.5`, TOON-encoded context, and tools from `src/lib/log-agent-tools.ts`.
- Trigger task `chat-log-agent` runs every 30 minutes in `America/Bogota`, has queue concurrency `1`, and skips windows already completed.
- The public `logs.final_response` should stay short and user-facing; do not expose memory/tool/database internals there.

## Styling And Quality

- Formatting is Biome 2 with 2-space indentation and import organization enabled.
- Tailwind is v4; `biome.json` disables `noUnknownAtRules` for Tailwind directives.
- `next.config.ts` only allows Next images from `*.public.blob.vercel-storage.com` and `avatar.vercel.sh`; add remote image hosts there before using `next/image` for new external sources.

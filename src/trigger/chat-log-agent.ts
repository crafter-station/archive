import { logger, schedules, tasks } from "@trigger.dev/sdk/v3";

import { LOG_AGENT_MODEL, runLogAgent } from "@/lib/log-agent";
import {
  completeLog,
  createOrReuseRunningLog,
  failLog,
  getCompletedLog,
  getMessagesForAgentContext,
  getPreviousLog,
  hasPendingAudioTranscriptions,
} from "@/lib/log-agent-queries";
import { DEFAULT_LOG_TIMEZONE, getLogWindow } from "@/lib/log-windows";

const AUDIO_TRANSCRIPTION_RECHECK_DELAY = "5m";

export const chatLogAgentTask = schedules.task({
  id: "chat-log-agent",
  cron: { pattern: "*/30 * * * *", timezone: DEFAULT_LOG_TIMEZONE },
  maxDuration: 600,
  queue: { concurrencyLimit: 1 },
  run: async (payload, { ctx }) => {
    const window = getLogWindow(payload.timestamp, DEFAULT_LOG_TIMEZONE);
    const completed = await getCompletedLog(
      window.windowStartUtc,
      window.windowEndUtc,
    );

    if (completed) {
      logger.log("Log window already completed", { logId: completed.id });
      return { logId: completed.id, status: "completed" };
    }

    const previousLog = await getPreviousLog(
      window.previousWindowStartUtc,
      window.windowStartUtc,
    );
    const log = await createOrReuseRunningLog({
      ...window,
      previousLogId: previousLog?.id ?? null,
      triggerRunId: ctx.run.id,
    });

    try {
      const hasPendingAudio = await hasPendingAudioTranscriptions(
        window.windowStartUtc,
        window.windowEndUtc,
      );

      if (hasPendingAudio) {
        logger.log("Log window has pending audio transcriptions", {
          logId: log.id,
        });
        await tasks.trigger(
          "chat-log-agent",
          { timestamp: window.windowEndUtc },
          {
            delay: AUDIO_TRANSCRIPTION_RECHECK_DELAY,
            idempotencyKey: `chat-log-agent:audio-recheck:${window.windowEndUtc.toISOString()}`,
            idempotencyKeyTTL: "10m",
          },
        );

        return { logId: log.id, status: "waiting_for_audio" };
      }

      const messages = await getMessagesForAgentContext(
        window.contextStartUtc,
        window.windowEndUtc,
      );
      const finalResponse = await runLogAgent({
        logId: log.id,
        messages,
        previousLogText: previousLog?.finalResponse ?? null,
        timezone: window.timezone,
        windowEndUtc: window.windowEndUtc,
        windowStartUtc: window.windowStartUtc,
      });

      await completeLog({
        finalResponse,
        logId: log.id,
        model: LOG_AGENT_MODEL,
      });

      return { logId: log.id, status: "completed" };
    } catch (error) {
      await failLog(log.id, error);
      throw error;
    }
  },
});

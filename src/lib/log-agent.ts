import { openai } from "@ai-sdk/openai";
import { encode } from "@toon-format/toon";
import { generateText, stepCountIs } from "ai";
import {
  listActiveMemories,
  listEvents,
  listResources,
  listShips,
} from "@/lib/log-agent-queries";
import { createLogAgentTools } from "@/lib/log-agent-tools";
import { formatLocalDateTime } from "@/lib/log-windows";

export const LOG_AGENT_MODEL = "gpt-5.5";

type AgentMessage = Awaited<
  ReturnType<
    typeof import("@/lib/log-agent-queries").getMessagesForAgentContext
  >
>[number];

function messageText(message: AgentMessage) {
  if (message.messageType !== "text" && message.caption) {
    return message.caption;
  }

  return message.body ?? message.caption ?? "";
}

export function serializeMessagesForLogAgent(
  messages: AgentMessage[],
  timezone: string,
) {
  return messages
    .map((message) => ({
      id: message.id,
      whatsappMessageId: message.whatsappMessageId,
      participantId: message.senderParticipantId,
      sender: message.sender.displayName ?? message.sender.jid,
      sentAt: message.sentAt
        ? formatLocalDateTime(message.sentAt, timezone)
        : null,
      receivedAt: formatLocalDateTime(message.receivedAt, timezone),
      text: messageText(message),
    }))
    .filter((message) => message.text.trim().length > 0);
}

export async function runLogAgent({
  logId,
  messages,
  previousLogText,
  timezone,
  windowEndUtc,
  windowStartUtc,
}: {
  logId: string;
  messages: AgentMessage[];
  previousLogText: string | null;
  timezone: string;
  windowEndUtc: Date;
  windowStartUtc: Date;
}) {
  const [memories, existingShips, existingResources, existingEvents] =
    await Promise.all([
      listActiveMemories(),
      listShips(),
      listResources(),
      listEvents(),
    ]);

  const system = `You maintain a rolling log and structured memory for a LATAM community chat.

Definitions:
- A ship is a live internet artifact crafted by a community member: GitHub repo, website, demo, product page, LinkedIn/Instagram post, or similar.
- A resource is a tutorial, book, documentation, product, or link that can help others.
- An event is a future or current scheduled gathering, call, stream, launch, workshop, or deadline.

Rules:
- You have memories injected below. Create, update, or remove memories when long-lived facts change.
- Prefer updating existing ships/resources/events over creating duplicates.
- Only remove memories. Do not delete ships, resources, or events.
- Every ship/resource/event must cite sourceMessageId and sourceParticipantId from the provided messages.
- Interpret ambiguous LATAM dates/times in ${timezone}. If a message explicitly says another timezone/location, use that timezone and explain it in interpretation.
- For events, store startsAtUtc as an ISO UTC datetime when the date and time are known. Also store timezone, localDate, localTime, and interpretation.
- If only an event date is known, store localDate and leave startsAtUtc/localTime null.
- The final response is shown publicly in the Logs tab. It must be casual, human, and short: 1-3 sentences max.
- Mention only the core things people would care about from this window.
- Do not mention internal work like memories, tool calls, database updates, IDs, or categories.
- Do not force sections like "Ships", "Resources", "Events", or "Memory updates". Users can open those tabs for details.
- If nothing meaningful happened, write one natural sentence like "No notable activity in this window."`;

  const prompt = `Use the following TOON data as the full context for this run.\n\n${encode(
    {
      existingEvents: existingEvents.map((event) => ({
        id: event.id,
        link: event.sourceMessage?.whatsappMessageId,
        localDate: event.localDate,
        localTime: event.localTime,
        startsAtUtc: event.startsAtUtc?.toISOString() ?? null,
        title: event.title,
      })),
      existingResources: existingResources.map((resource) => ({
        id: resource.id,
        link: resource.link,
        title: resource.title,
      })),
      existingShips: existingShips.map((ship) => ({
        id: ship.id,
        link: ship.link,
        title: ship.title,
      })),
      memories: memories.map((memory) => ({
        category: memory.category,
        content: memory.content,
        id: memory.id,
        importance: memory.importance,
        key: memory.key,
      })),
      messages: serializeMessagesForLogAgent(messages, timezone),
      previousLogText,
      timezone,
      window: {
        end: windowEndUtc.toISOString(),
        endLocal: formatLocalDateTime(windowEndUtc, timezone),
        start: windowStartUtc.toISOString(),
        startLocal: formatLocalDateTime(windowStartUtc, timezone),
      },
    },
    { delimiter: "\t", keyFolding: "safe" },
  )}`;

  const result = await generateText({
    model: openai(LOG_AGENT_MODEL),
    prompt,
    stopWhen: stepCountIs(8),
    system,
    tools: createLogAgentTools(logId),
    experimental_telemetry: { isEnabled: true },
  });

  return result.text.trim();
}

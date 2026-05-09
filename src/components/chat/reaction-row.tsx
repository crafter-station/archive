import type { ChatMessage } from "@/lib/chat-queries";
import { getParticipantLabel } from "@/lib/whatsapp-participants";

type ReactionRowProps = {
  reactions: ChatMessage["reactions"];
};

export function ReactionRow({ reactions }: ReactionRowProps) {
  const grouped = groupReactions(reactions);

  if (grouped.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {grouped.map((reaction) => (
        <span
          className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-xs shadow-sm"
          key={reaction.emoji}
          title={reaction.names.join(", ")}
        >
          <span>{reaction.emoji}</span>
          <span className="text-muted-foreground">{reaction.count}</span>
        </span>
      ))}
    </div>
  );
}

function groupReactions(reactions: ChatMessage["reactions"]) {
  const grouped = new Map<string, { count: number; names: string[] }>();

  for (const reaction of reactions) {
    if (!reaction.emoji) {
      continue;
    }

    const current = grouped.get(reaction.emoji) ?? { count: 0, names: [] };
    current.count += 1;
    current.names.push(getParticipantLabel(reaction.participant));
    grouped.set(reaction.emoji, current);
  }

  return Array.from(grouped, ([emoji, value]) => ({ emoji, ...value }));
}

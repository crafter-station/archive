import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { type Participant, participants } from "@/db/schema";
import type { WhatsAppMessage } from "@/lib/whatsapp-types";

type ParticipantIdentity = {
  jid: string;
  displayName: string;
  phoneNumber: string | null;
};

export async function upsertParticipantFromMessage(message: WhatsAppMessage) {
  const identity = getParticipantIdentity(message);

  return upsertParticipant(identity);
}

export async function upsertParticipant(identity: ParticipantIdentity) {
  const existing = await getParticipantByJid(identity.jid);
  const displayName = shouldReplaceDisplayName(existing, identity)
    ? identity.displayName
    : existing?.displayName;
  const [participant] = await db
    .insert(participants)
    .values({
      jid: identity.jid,
      displayName,
      phoneNumber: identity.phoneNumber,
    })
    .onConflictDoUpdate({
      target: participants.jid,
      set: {
        displayName,
        phoneNumber: identity.phoneNumber,
        updatedAt: new Date(),
      },
    })
    .returning();

  return participant;
}

export function getParticipantIdentity(
  message: WhatsAppMessage,
): ParticipantIdentity {
  const jid = getSenderJid(message);
  const fallback = getPhoneNumber(jid) ?? jid;

  return {
    jid,
    displayName: getDisplayName(message, fallback),
    phoneNumber: getPhoneNumber(jid),
  };
}

export function getSenderJid(message: WhatsAppMessage) {
  return (
    message.key?.participant ??
    message.key?.participantPn ??
    message.remoteJid ??
    message.key?.remoteJid ??
    "unknown"
  );
}

export function getChatJid(message: WhatsAppMessage) {
  return message.remoteJid ?? message.key?.remoteJid ?? getSenderJid(message);
}

export async function getParticipantByJid(jid: string) {
  const [participant] = await db
    .select()
    .from(participants)
    .where(eq(participants.jid, jid))
    .limit(1);

  return participant;
}

function getDisplayName(message: WhatsAppMessage, fallback: string) {
  const pushName = message.pushName?.trim();

  if (pushName) {
    return pushName;
  }

  return fallback;
}

function getPhoneNumber(jid: string) {
  const [localPart] = jid.split("@");

  if (!localPart || !/^\d+$/.test(localPart)) {
    return null;
  }

  return localPart;
}

export function getParticipantLabel(
  participant: Pick<Participant, "displayName" | "jid">,
) {
  return participant.displayName ?? participant.jid;
}

function shouldReplaceDisplayName(
  existing: Participant | undefined,
  identity: ParticipantIdentity,
) {
  if (!existing?.displayName) {
    return true;
  }

  return (
    existing.displayName === existing.jid ||
    existing.displayName === identity.phoneNumber
  );
}

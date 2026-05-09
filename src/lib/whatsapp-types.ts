export type WebhookPayload = {
  event?: string;
  timestamp?: number;
  data?: {
    groupId?: string;
    remoteJid?: string;
    messages?: WhatsAppMessage | WhatsAppMessage[];
  };
};

export type WhatsAppMessage = {
  id?: string;
  key?: {
    id?: string;
    remoteJid?: string;
    participant?: string;
    participantPn?: string;
    fromMe?: boolean;
  };
  messageTimestamp?: number;
  pushName?: string;
  messageBody?: string;
  message?: Record<string, unknown>;
  remoteJid?: string;
};

export type MediaInfo = {
  url?: string;
  mimetype?: string;
  mediaKey?: string;
  fileName?: string;
  caption?: string;
  directPath?: string;
  isAnimated?: boolean;
  fileLength?: number | string;
  fileSha256?: string;
  jpegThumbnail?: string;
  width?: number;
  height?: number;
  seconds?: number;
};

export type MediaMessage = {
  field: string;
  type: "image" | "video" | "audio" | "document" | "sticker";
  info: MediaInfo;
};

export type ReactionInfo = {
  emoji: string | null;
  messageId: string;
  participantJid: string;
};

export type ReplyInfo = {
  messageId: string;
  participantJid: string;
  quotedText?: string;
};

export const mediaFields: Record<string, MediaMessage["type"]> = {
  imageMessage: "image",
  videoMessage: "video",
  audioMessage: "audio",
  documentMessage: "document",
  stickerMessage: "sticker",
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

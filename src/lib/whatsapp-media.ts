import { createDecipheriv, hkdfSync } from "node:crypto";
import path from "node:path";
import { put } from "@vercel/blob";

import {
  isRecord,
  type MediaInfo,
  type MediaMessage,
  mediaFields,
} from "@/lib/whatsapp-types";

export type UploadedMedia = {
  blobPath: string;
  blobUrl: string;
  fileName: string;
  fileSize: number;
  media: MediaMessage;
  sortOrder: number;
};

export function extractMediaMessages(message?: Record<string, unknown>) {
  if (!message) {
    return [];
  }

  const media: MediaMessage[] = [];

  for (const [field, type] of Object.entries(mediaFields)) {
    const info = message[field];

    if (isMediaInfo(info)) {
      media.push({ field, type, info });
    }
  }

  return media;
}

export async function uploadWhatsAppMedia({
  chatJid,
  media,
  sortOrder,
  whatsappMessageId,
}: {
  chatJid: string;
  media: MediaMessage;
  sortOrder: number;
  whatsappMessageId: string;
}): Promise<UploadedMedia> {
  if (!media.info.url && !media.info.directPath) {
    throw new Error(`Media ${media.field} is missing a download URL`);
  }

  if (!media.info.mediaKey) {
    throw new Error(`Media ${media.field} is missing a media key`);
  }

  const response = await fetch(getMediaUrl(media.info));

  if (!response.ok) {
    throw new Error(`Media download failed with status ${response.status}`);
  }

  const encrypted = Buffer.from(await response.arrayBuffer());
  const decrypted = decryptMedia(encrypted, media.info.mediaKey, media.type);
  const fileName = getFileName(media, whatsappMessageId, sortOrder);
  const blobPath = [
    "whatsapp",
    safePathSegment(chatJid),
    safePathSegment(whatsappMessageId),
    fileName,
  ].join("/");
  const blob = await put(blobPath, decrypted, {
    access: "public",
    allowOverwrite: true,
    contentType: media.info.mimetype,
  });

  return {
    blobPath,
    blobUrl: blob.url,
    fileName,
    fileSize: decrypted.byteLength,
    media,
    sortOrder,
  };
}

export function getMediaCaption(media: MediaMessage[]) {
  return media.find((item) => item.info.caption)?.info.caption;
}

export function getMediaSummary(media: MediaMessage[]) {
  if (media.length === 0) {
    return undefined;
  }

  if (media.length === 1) {
    return `Message type: ${formatMediaLabel(media[0])}`;
  }

  return `Album: ${media.length} items`;
}

export function getExtension(media: MediaMessage) {
  if (media.type === "sticker" && media.info.isAnimated) {
    return ".webp";
  }

  if (media.info.fileName) {
    return (
      path.extname(media.info.fileName) ||
      extensionFromMime(media.info.mimetype, media.type)
    );
  }

  return extensionFromMime(media.info.mimetype, media.type);
}

export function formatMediaLabel(media: MediaMessage) {
  if (media.type === "sticker" && media.info.isAnimated) {
    return "animated sticker / gif";
  }

  return media.type;
}

function getMediaUrl(info: MediaInfo) {
  if (info.url && info.url !== "https://web.whatsapp.net") {
    return info.url;
  }

  if (info.directPath) {
    return `https://mmg.whatsapp.net${info.directPath}`;
  }

  return info.url ?? "";
}

function decryptMedia(
  encrypted: Buffer,
  mediaKey: string,
  type: MediaMessage["type"],
) {
  const info = getHkdfInfo(type);
  const keyMaterial = Buffer.from(
    hkdfSync(
      "sha256",
      Buffer.from(mediaKey, "base64"),
      Buffer.alloc(0),
      info,
      112,
    ),
  );
  const iv = keyMaterial.subarray(0, 16);
  const cipherKey = keyMaterial.subarray(16, 48);
  const ciphertext = encrypted.subarray(0, encrypted.length - 10);
  const decipher = createDecipheriv("aes-256-cbc", cipherKey, iv);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

function getHkdfInfo(type: MediaMessage["type"]) {
  switch (type) {
    case "image":
    case "sticker":
      return "WhatsApp Image Keys";
    case "video":
      return "WhatsApp Video Keys";
    case "audio":
      return "WhatsApp Audio Keys";
    case "document":
      return "WhatsApp Document Keys";
  }
}

function getFileName(
  media: MediaMessage,
  whatsappMessageId: string,
  sortOrder: number,
) {
  const providedName = media.info.fileName
    ? safePathSegment(media.info.fileName)
    : undefined;

  if (providedName) {
    return `${sortOrder}-${providedName}`;
  }

  return `${sortOrder}-${safePathSegment(whatsappMessageId)}${getExtension(media)}`;
}

function extensionFromMime(
  mimetype: string | undefined,
  type: MediaMessage["type"],
) {
  switch (mimetype) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "video/mp4":
      return ".mp4";
    case "audio/ogg":
      return ".ogg";
    case "application/pdf":
      return ".pdf";
    default:
      return type === "document" ? ".bin" : `.${type}`;
  }
}

function isMediaInfo(value: unknown): value is MediaInfo {
  return (
    isRecord(value) &&
    (typeof value.url === "string" || typeof value.directPath === "string") &&
    typeof value.mediaKey === "string"
  );
}

function safePathSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

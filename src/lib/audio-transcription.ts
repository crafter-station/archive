import path from "node:path";
import { env } from "@/env";

const TRANSCRIPTION_MODEL = "gpt-4o-transcribe";

export async function transcribeAudioFromUrl(input: {
  audioUrl: string;
  fileName?: string | null;
  mimeType?: string | null;
}) {
  const audioResponse = await fetch(input.audioUrl);

  if (!audioResponse.ok) {
    throw new Error(
      `Failed to download audio for transcription (${audioResponse.status})`,
    );
  }

  const audioBuffer = await audioResponse.arrayBuffer();
  const mimeType = normalizeMimeType(input.mimeType);
  const fileName = getAudioFileName(input.fileName, mimeType);
  const formData = new FormData();
  formData.append("model", TRANSCRIPTION_MODEL);
  formData.append(
    "file",
    new Blob([audioBuffer], { type: mimeType }),
    fileName,
  );

  const response = await fetch(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: formData,
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Audio transcription failed (${response.status}): ${errorText}`,
    );
  }

  const data = (await response.json()) as { text?: string };

  return data.text?.trim() ?? null;
}

function getAudioFileName(fileName?: string | null, mimeType?: string | null) {
  const extension = extensionFromMimeType(mimeType);

  if (fileName?.trim()) {
    const parsed = path.parse(fileName.trim());
    return `${parsed.name}${extension}`;
  }

  return `audio${extension}`;
}

function normalizeMimeType(mimeType?: string | null) {
  const normalized = mimeType?.split(";")[0]?.trim().toLowerCase();
  return normalized || "audio/ogg";
}

function extensionFromMimeType(mimeType?: string | null) {
  if (!mimeType) {
    return ".ogg";
  }

  const mapped: Record<string, string> = {
    "audio/aac": ".aac",
    "audio/m4a": ".m4a",
    "audio/mp4": ".mp4",
    "audio/mpeg": ".mp3",
    "audio/ogg": ".ogg",
    "audio/wav": ".wav",
    "audio/webm": ".webm",
  };

  if (mapped[mimeType]) {
    return mapped[mimeType];
  }

  const ext = path.extname(mimeType);
  return ext.length > 0 ? ext : ".ogg";
}

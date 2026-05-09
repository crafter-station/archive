import { env } from "@/env";

const TRANSCRIPTION_MODEL = "gpt-4o-transcribe";

export async function transcribeAudioFromUrl(audioUrl: string) {
  const audioResponse = await fetch(audioUrl);

  if (!audioResponse.ok) {
    throw new Error(
      `Failed to download audio for transcription (${audioResponse.status})`,
    );
  }

  const audioBuffer = await audioResponse.arrayBuffer();
  const formData = new FormData();
  formData.append("model", TRANSCRIPTION_MODEL);
  formData.append("file", new Blob([audioBuffer]), "audio.ogg");

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

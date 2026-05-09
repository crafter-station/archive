import Image from "next/image";

import type { ChatMessage } from "@/lib/chat-queries";
import { cn } from "@/lib/utils";

type MessageMediaProps = {
  media: ChatMessage["media"];
};

export function MessageMedia({ media }: MessageMediaProps) {
  if (media.length === 0) {
    return null;
  }

  const isAlbum = media.length > 1;
  const isStickerSet = media.every((item) => item.mediaType === "sticker");

  return (
    <div
      className={cn(
        "gap-1 overflow-hidden rounded-xl",
        isAlbum && !isStickerSet
          ? "grid w-[min(72vw,22rem)] grid-cols-2"
          : "flex w-fit flex-col",
      )}
    >
      {media.map((item) => (
        <MediaItem isAlbum={isAlbum} item={item} key={item.id} />
      ))}
    </div>
  );
}

function MediaItem({
  isAlbum,
  item,
}: {
  isAlbum: boolean;
  item: ChatMessage["media"][number];
}) {
  const isSticker = item.mediaType === "sticker";

  if (item.mediaType === "image" || item.mediaType === "sticker") {
    return (
      <a
        className={cn(
          "relative block overflow-hidden",
          isSticker
            ? "size-44 max-w-[70vw] bg-transparent"
            : "w-[min(72vw,22rem)] bg-muted",
          !isSticker && !isAlbum && "rounded-xl",
          isAlbum && !isSticker && "aspect-square w-full",
        )}
        href={item.blobUrl}
        rel="noreferrer"
        style={
          isAlbum ? undefined : { aspectRatio: getAspectRatio(item, isSticker) }
        }
        target="_blank"
      >
        <Image
          alt={item.fileName ?? item.mediaType}
          className={cn(isSticker ? "object-contain" : "object-cover")}
          fill
          sizes={isSticker ? "11rem" : "(max-width: 768px) 72vw, 22rem"}
          src={item.blobUrl}
        />
      </a>
    );
  }

  if (item.mediaType === "video") {
    return (
      // biome-ignore lint/a11y/useMediaCaption: WhatsApp video webhooks do not provide caption tracks.
      <video
        className="max-h-[28rem] w-[min(72vw,22rem)] rounded-xl bg-muted"
        controls
        src={item.blobUrl}
      />
    );
  }

  if (item.mediaType === "audio") {
    return (
      // biome-ignore lint/a11y/useMediaCaption: WhatsApp audio webhooks do not provide caption tracks.
      <audio
        className="w-[min(72vw,22rem)] rounded-xl bg-muted"
        controls
        src={item.blobUrl}
      />
    );
  }

  return (
    <a
      className="flex w-[min(72vw,22rem)] items-center justify-between gap-3 rounded-xl border border-border bg-background/70 px-3 py-2 text-sm transition-colors hover:bg-muted"
      href={item.blobUrl}
      rel="noreferrer"
      target="_blank"
    >
      <span className="min-w-0 truncate">
        {item.fileName ?? `${item.mediaType} attachment`}
      </span>
      <span className="shrink-0 text-xs text-muted-foreground">
        {item.mimeType ?? "download"}
      </span>
    </a>
  );
}

function getAspectRatio(
  item: ChatMessage["media"][number],
  isSticker: boolean,
) {
  if (item.width && item.height) {
    return `${item.width} / ${item.height}`;
  }

  return isSticker ? "1 / 1" : "4 / 3";
}

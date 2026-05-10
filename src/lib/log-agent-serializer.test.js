import { describe, expect, test } from "bun:test";
import { serializeMessagesForLogAgent } from "./log-agent-serializer.ts";

function createMessage(overrides) {
  return {
    id: "message-1",
    whatsappMessageId: "wa-message-1",
    chatJid: "group@g.us",
    senderParticipantId: "participant-1",
    messageType: "text",
    body: "hello",
    caption: null,
    sentAt: new Date("2026-05-10T15:00:00.000Z"),
    receivedAt: new Date("2026-05-10T15:00:05.000Z"),
    replyToMessageId: null,
    replyToWhatsappMessageId: null,
    replyToParticipantJid: null,
    quotedText: null,
    rawPayload: {},
    createdAt: new Date("2026-05-10T15:00:06.000Z"),
    updatedAt: new Date("2026-05-10T15:00:06.000Z"),
    sender: {
      id: "participant-1",
      jid: "participant-1@s.whatsapp.net",
      displayName: "Anthony",
      phoneNumber: null,
      createdAt: new Date("2026-05-10T15:00:06.000Z"),
      updatedAt: new Date("2026-05-10T15:00:06.000Z"),
    },
    media: [],
    ...overrides,
  };
}

describe("serializeMessagesForLogAgent", () => {
  test("serializes captioned images and filters non-image media", () => {
    const result = serializeMessagesForLogAgent(
      [
        createMessage({
          id: "message-1",
          whatsappMessageId: "wa-message-1",
          senderParticipantId: "participant-1",
          messageType: "image",
          body: null,
          caption: "Launch flyer",
          media: [
            {
              id: "media-2",
              messageId: "message-1",
              mediaType: "document",
              mimeType: "application/pdf",
              fileName: "deck.pdf",
              fileSize: 1234,
              sha256: null,
              blobUrl: "https://blob.example/deck.pdf",
              blobPath: "messages/deck.pdf",
              width: null,
              height: null,
              durationSeconds: null,
              sortOrder: 2,
              rawMediaPayload: null,
              createdAt: new Date("2026-05-10T15:00:05.000Z"),
            },
            {
              id: "media-1",
              messageId: "message-1",
              mediaType: "image",
              mimeType: "image/jpeg",
              fileName: "flyer.jpg",
              fileSize: 4321,
              sha256: null,
              blobUrl: "https://blob.example/flyer.jpg",
              blobPath: "messages/flyer.jpg",
              width: 1080,
              height: 1350,
              durationSeconds: null,
              sortOrder: 1,
              rawMediaPayload: null,
              createdAt: new Date("2026-05-10T15:00:04.000Z"),
            },
            {
              id: "media-3",
              messageId: "message-1",
              mediaType: "image",
              mimeType: "image/png",
              fileName: "screenshot.png",
              fileSize: 9876,
              sha256: null,
              blobUrl: "https://blob.example/screenshot.png",
              blobPath: "messages/screenshot.png",
              width: 1200,
              height: 900,
              durationSeconds: null,
              sortOrder: 3,
              rawMediaPayload: null,
              createdAt: new Date("2026-05-10T15:00:06.000Z"),
            },
          ],
        }),
        createMessage({
          id: "message-2",
          whatsappMessageId: "wa-message-2",
          senderParticipantId: "participant-2",
          body: "  ",
          caption: null,
          media: [],
          sender: {
            id: "participant-2",
            jid: "participant-2@s.whatsapp.net",
            displayName: null,
            phoneNumber: null,
            createdAt: new Date("2026-05-10T15:00:06.000Z"),
            updatedAt: new Date("2026-05-10T15:00:06.000Z"),
          },
        }),
      ],
      "America/Bogota",
    );

    expect(result.messages).toEqual([
      expect.objectContaining({
        id: "message-1",
        caption: "Launch flyer",
        text: "Launch flyer",
      }),
    ]);
    expect(result.messageImages.map((image) => image.sortOrder)).toEqual([
      1, 3,
    ]);
    expect(result.messageImages).toEqual([
      expect.objectContaining({
        messageId: "message-1",
        blobPath: "messages/flyer.jpg",
        caption: "Launch flyer",
        mimeType: "image/jpeg",
        sortOrder: 1,
      }),
      expect.objectContaining({
        messageId: "message-1",
        blobPath: "messages/screenshot.png",
        caption: "Launch flyer",
        mimeType: "image/png",
        sortOrder: 3,
      }),
    ]);
    expect(result).not.toHaveProperty("images");
  });
});

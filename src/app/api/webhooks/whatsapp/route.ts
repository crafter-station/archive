import { env } from "@/env";
import { processWhatsAppWebhook } from "@/lib/whatsapp-webhook";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("x-webhook-signature");

  if (signature !== env.WHATSAPP_WEBHOOK_SECRET) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  const rawBody = await request.text();
  const payload = JSON.parse(rawBody);

  console.log("WhatsApp webhook data:", JSON.stringify(payload.data, null, 2));
  await processWhatsAppWebhook(payload, rawBody);

  return Response.json({ received: true });
}

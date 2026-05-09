import { ChatShell } from "@/components/chat/chat-shell";
import { getGroupChatMessages, getMessageThread } from "@/lib/chat-queries";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams: Promise<{
    thread?: string;
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const { thread } = await searchParams;
  const [messages, messageThread] = await Promise.all([
    getGroupChatMessages(),
    getMessageThread(thread),
  ]);

  return <ChatShell messages={messages} thread={messageThread} />;
}

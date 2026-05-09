import { redirect } from "next/navigation";

import { DEFAULT_LOG_TIMEZONE, formatLocalDate } from "@/lib/log-windows";

export const dynamic = "force-dynamic";

export default function Home() {
  redirect(`/${formatLocalDate(new Date(), DEFAULT_LOG_TIMEZONE)}`);
}

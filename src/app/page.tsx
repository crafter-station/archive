import { redirect } from "next/navigation";

import { DEFAULT_LOG_TIMEZONE, formatLocalDate } from "@/lib/log-windows";

export const revalidate = 60;

export default function Home() {
  redirect(`/${formatLocalDate(new Date(), DEFAULT_LOG_TIMEZONE)}`);
}

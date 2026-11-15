import { redirect } from "next/navigation";
import { readDB } from "@/lib/store";

export const dynamic = "force-dynamic";

export default function Home() {
  const db = readDB();
  redirect(db.settings.onboarded ? "/today" : "/welcome");
}

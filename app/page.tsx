import { redirect } from "next/navigation";
import { readDB } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Home() {
  const db = await readDB();
  redirect(db.settings.onboarded ? "/today" : "/welcome");
}

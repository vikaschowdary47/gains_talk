import { readDB } from "@/lib/store";
import WelcomeClient from "./WelcomeClient";

export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const db = await readDB();
  return <WelcomeClient initialApps={db.settings.apps} />;
}

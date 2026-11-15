import { readDB } from "@/lib/store";
import WelcomeClient from "./WelcomeClient";

export const dynamic = "force-dynamic";

export default function WelcomePage() {
  const db = readDB();
  return <WelcomeClient initialApps={db.settings.apps} />;
}

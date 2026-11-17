import { readDB } from "@/lib/store";
import { igToken } from "@/lib/instagram";
import ImportInstagram from "./ImportInstagram";

export const dynamic = "force-dynamic";

export default async function ImportInstagramPage({ searchParams }: { searchParams: Promise<{ first?: string }> }) {
  const { first } = await searchParams;
  const db = await readDB();
  return <ImportInstagram connected={Boolean(igToken(db))} first={first === "1"} />;
}

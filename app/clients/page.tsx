import { readDB } from "@/lib/store";
import { clientRows } from "@/lib/queries";
import ClientsClient from "./ClientsClient";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const db = await readDB();
  return <ClientsClient rows={clientRows(db)} />;
}

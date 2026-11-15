import { readDB } from "@/lib/store";
import { clientRows } from "@/lib/queries";
import ClientsClient from "./ClientsClient";

export const dynamic = "force-dynamic";

export default function ClientsPage() {
  const db = readDB();
  return <ClientsClient rows={clientRows(db)} />;
}

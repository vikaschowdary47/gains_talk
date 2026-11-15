import Link from "next/link";

export default function NotFound() {
  return (
    <main className="app plain">
      <div className="pad stack center" style={{ alignItems: "center", marginTop: 80 }}>
        <h1 className="h1">Not found</h1>
        <p className="lead">That message or client isn&apos;t here anymore.</p>
        <Link href="/today" className="btn btn-primary">Back to Today</Link>
      </div>
    </main>
  );
}

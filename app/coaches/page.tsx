import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "GainsTalk for coaches: never lose a client to a missed message",
  description: "GainsTalk pulls your client DMs into one list, drafts replies in your voice and tells you who's gone quiet. Free for early coaches.",
};

const css = `
.lp{font-family:var(--text);color:#15172e;background:#f4f4f8;min-height:100vh}
.lp a{color:inherit}
.lp-wrap{max-width:1120px;margin:0 auto;padding:0 20px}
.lp-hero{background:#15172e;color:#fff;border-radius:0 0 36px 36px;padding-bottom:80px}
.lp-nav{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:20px 0;flex-wrap:wrap}
.lp-logo{display:flex;align-items:center;gap:10px;font-family:var(--display);font-weight:800;font-size:21px;text-decoration:none}
.lp-btn{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 22px;border-radius:999px;font-weight:700;font-size:16px;text-decoration:none;border:0;cursor:pointer;font-family:inherit}
.lp-btn:focus-visible,.lp input:focus-visible,.lp select:focus-visible{outline:3px solid #7be0b8;outline-offset:2px}
.lp-white{background:#fff;color:#15172e!important}
.lp-mint{background:#7be0b8;color:#0b3a29!important;font-size:17px;min-height:52px}
.lp-blue{background:#3049f0;color:#fff!important;width:100%;min-height:52px;font-size:17px}
.lp-blue:hover{background:#2236b8}
.lp-grid2{display:flex;flex-wrap:wrap;gap:44px;align-items:center;padding-top:36px}
.lp-col{flex:1 1 420px;min-width:0}
.lp h1{font-family:var(--display);font-size:clamp(38px,6vw,58px);line-height:1.04;font-weight:800;letter-spacing:-1.5px;margin:18px 0}
.lp h2{font-family:var(--display);font-size:clamp(28px,4vw,40px);line-height:1.1;font-weight:800;letter-spacing:-.8px;margin:0}
.lp h3{font-family:var(--display);font-size:21px;font-weight:800;margin:0}
.lp-lead{font-size:19px;line-height:1.55;color:#c9cbe3;max-width:520px;margin:0}
.lp-pill{display:inline-block;padding:6px 14px;border-radius:999px;background:rgba(123,224,184,.16);color:#a9e8c9;font-size:14px;font-weight:600}
.lp-phone{max-width:420px;margin:0 auto;background:#f4f4f8;color:#15172e;border-radius:28px;padding:18px;display:flex;flex-direction:column;gap:12px}
.lp-card{background:#fff;border-radius:22px;padding:24px;display:flex;flex-direction:column;gap:10px}
.lp-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:18px}
.lp-chips{display:flex;flex-wrap:wrap;gap:10px;justify-content:center}
.lp-chip{padding:9px 16px;border-radius:999px;font-weight:700;font-size:15px}
.lp-muted{color:#4a4e6a;font-size:16px;line-height:1.55;margin:0}
.lp-icon{width:46px;height:46px;border-radius:14px;display:flex;align-items:center;justify-content:center}
.lp-steps{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:20px}
.lp-num{width:42px;height:42px;flex:none;border-radius:999px;background:#15172e;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800}
.lp-ea{background:#15172e;color:#fff;border-radius:36px 36px 0 0;padding:64px 0 32px;margin-top:24px}
.lp-form{flex:1 1 360px;min-width:0;background:#fff;color:#15172e;border-radius:26px;padding:26px;display:flex;flex-direction:column;gap:14px}
.lp-form label{display:flex;flex-direction:column;gap:6px;font-size:14px;font-weight:700}
.lp-form input,.lp-form select{min-height:48px;border:1.5px solid #c7c9db;border-radius:14px;padding:0 14px;font-size:16px;font-family:inherit;background:#fff;color:#15172e}
.lp-hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
.lp-ok{background:#dff6ec;color:#0e6b4c;border-radius:16px;padding:14px 16px;font-weight:600;line-height:1.5}
.lp-err{background:#fff3d6;color:#5a3e00;border-radius:16px;padding:12px 14px;font-weight:600}
.lp-foot{display:flex;flex-wrap:wrap;gap:20px;justify-content:space-between;border-top:1px solid rgba(255,255,255,.14);padding-top:22px;margin-top:56px;color:#a3a6c6;font-size:14px}
`;

const Check = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7be0b8" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>
);

export default async function Coaches({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const { sent } = await searchParams;
  return (
    <div className="lp">
      <style>{css}</style>
      <header className="lp-hero">
        <div className="lp-wrap">
          <nav className="lp-nav" aria-label="Main">
            <Link href="/coaches" className="lp-logo">
              <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true"><rect x="2" y="6" width="14" height="16" rx="5" fill="#7be0b8" /><rect x="18" y="12" width="14" height="16" rx="5" fill="#6c78f2" /><rect x="9" y="16" width="16" height="3" rx="1.5" fill="#fff" /></svg>
              GainsTalk
            </Link>
            <a href="#early-access" className="lp-btn lp-white">Get early access</a>
          </nav>

          <div className="lp-grid2">
            <div className="lp-col">
              <span className="lp-pill">Free for early coaches</span>
              <h1>Never lose a client to a missed message.</h1>
              <p className="lp-lead">GainsTalk pulls your client DMs into one list, drafts replies in your voice, and tells you who&apos;s gone quiet. Nothing sends until you approve it.</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginTop: 26 }}>
                <a href="#early-access" className="lp-btn lp-mint">Try it free for a month</a>
                <a href="#how" className="lp-btn" style={{ color: "#fff" }}>See how it works</a>
              </div>
              <p style={{ margin: "14px 0 0", fontSize: 14, color: "#a3a6c6" }}>No card. Keep using Instagram and your coaching app.</p>
            </div>

            <div className="lp-col">
              <div className="lp-phone" role="img" aria-label="Preview: a client's message with a reply drafted in the coach's voice, and an alert that another client has gone quiet">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 20 }}>Replies ready</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#3049f0" }}>3 waiting</span>
                </div>
                <div style={{ background: "#fff", borderRadius: 20, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span style={{ width: 36, height: 36, borderRadius: 12, background: "#f8c9b4", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13 }}>MJ</span>
                    <span style={{ display: "flex", flexDirection: "column" }}><span style={{ fontWeight: 700, fontSize: 15 }}>Maya</span><span style={{ fontSize: 12, fontWeight: 600, color: "#a3245f" }}>Instagram</span></span>
                  </div>
                  <p style={{ margin: 0, fontSize: 15, lineHeight: 1.45 }}>Weighed in at 182 today! Can I swap leg day to Friday?</p>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#5b5f7a" }}>Draft in your voice</span>
                  <div style={{ border: "2px solid #3049f0", borderRadius: 14, padding: "10px 12px", fontSize: 14, lineHeight: 1.45 }}>Down 3 lb in two weeks, nice work Maya! Friday&apos;s fine, just keep Wednesday as a rest day.</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={{ flex: 1, textAlign: "center", padding: 10, borderRadius: 999, background: "#3049f0", color: "#fff", fontWeight: 700, fontSize: 14 }}>Send</span>
                    <span style={{ flex: 1, textAlign: "center", padding: 10, borderRadius: 999, background: "#e7e8f1", fontWeight: 700, fontSize: 14 }}>Edit</span>
                  </div>
                </div>
                <div style={{ background: "#fff3d6", borderRadius: 16, padding: "12px 14px", fontSize: 14, fontWeight: 600, color: "#5a3e00" }}>Jordan hasn&apos;t messaged in 9 days</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main>
        <section className="lp-wrap" style={{ padding: "52px 20px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }} aria-labelledby="works">
          <h2 id="works" style={{ fontSize: 15, fontFamily: "var(--text)", fontWeight: 700, letterSpacing: 0, color: "#4a4e6a" }}>Works with what your clients already use</h2>
          <div className="lp-chips">
            <span className="lp-chip" style={{ background: "#fce4ef", color: "#8a1c4e" }}>Instagram</span>
            <span className="lp-chip" style={{ background: "#ddf4e8", color: "#15603c" }}>WhatsApp, coming soon</span>
            <span className="lp-chip" style={{ background: "#e4e6fb", color: "#2a35a8" }}>Email</span>
            <span className="lp-chip" style={{ background: "#e6ebf2", color: "#2e3b52" }}>Texts, by screenshot</span>
          </div>
        </section>

        <section className="lp-wrap" style={{ padding: "52px 20px", display: "flex", flexDirection: "column", gap: 28 }} aria-labelledby="why">
          <h2 id="why" style={{ maxWidth: 640 }}>Built for keeping clients, not just answering them.</h2>
          <div className="lp-cards">
            <article className="lp-card">
              <span className="lp-icon" style={{ background: "#fff3d6" }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7a5300" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" /></svg></span>
              <h3>Know who&apos;s slipping</h3>
              <p className="lp-muted">A short brief for every client: who&apos;s gone quiet, whose progress has stalled, and which promises you haven&apos;t kept yet, with a check-in ready to send.</p>
            </article>
            <article className="lp-card">
              <span className="lp-icon" style={{ background: "#ddf4e8" }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#15603c" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></svg></span>
              <h3>Progress, logged from chat</h3>
              <p className="lp-muted">When a client mentions their weight, steps or a new lift, it lands on their profile as a trend. No extra forms for them to fill in.</p>
              <div style={{ background: "#f4f4f8", borderRadius: 16, padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <span style={{ display: "flex", flexDirection: "column" }}><span style={{ fontSize: 13, fontWeight: 600, color: "#5b5f7a" }}>Weight</span><span style={{ fontFamily: "var(--display)", fontSize: 22, fontWeight: 800 }}>182 lb</span></span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#15603c" }}>Down 3 lb in 2 weeks</span>
              </div>
            </article>
            <article className="lp-card">
              <span className="lp-icon" style={{ background: "#e4e6fb" }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2a35a8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></svg></span>
              <h3>Replies in your voice</h3>
              <p className="lp-muted">Every message gets three drafts, from warm to firm, written the way you talk. Pick one, tweak it, send. Nothing goes out on its own.</p>
            </article>
          </div>
        </section>

        <section className="lp-wrap" style={{ padding: "0 20px 52px" }} aria-labelledby="privacy">
          <div style={{ background: "#7be0b8", borderRadius: 26, padding: 32, display: "flex", flexWrap: "wrap", gap: 22, alignItems: "center" }}>
            <span style={{ width: 62, height: 62, flex: "none", borderRadius: 20, background: "#15172e", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
            </span>
            <div style={{ flex: "1 1 400px", minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              <h2 id="privacy" style={{ fontSize: 28, color: "#0b3a29" }}>Only your clients are read</h2>
              <p style={{ margin: 0, fontSize: 17, lineHeight: 1.55, color: "#0e4a33" }}>Friends, family and strangers are dropped the moment their message arrives and never saved. You choose who counts as a client.</p>
            </div>
          </div>
        </section>

        <section id="how" className="lp-wrap" style={{ padding: "16px 20px 56px", display: "flex", flexDirection: "column", gap: 26 }} aria-labelledby="how-h">
          <h2 id="how-h">Set up in five minutes</h2>
          <ol className="lp-steps">
            {[
              ["Connect Instagram", "Sign in with your business account. Your DMs keep working as normal."],
              ["Pick your clients", "Choose from the people you already chat with. Their recent messages come in, and their profiles fill themselves in."],
              ["Approve and send", "Open Today, choose a draft, send. Your reply shows up in their Instagram."],
            ].map(([t, d], i) => (
              <li key={t} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <span className="lp-num">{i + 1}</span>
                <span style={{ display: "flex", flexDirection: "column", gap: 4 }}><span style={{ fontFamily: "var(--display)", fontSize: 19, fontWeight: 800 }}>{t}</span><span className="lp-muted">{d}</span></span>
              </li>
            ))}
          </ol>
        </section>

        <section id="early-access" className="lp-ea" aria-labelledby="ea-h">
          <div className="lp-wrap" style={{ display: "flex", flexWrap: "wrap", gap: 44, alignItems: "flex-start" }}>
            <div style={{ flex: "1 1 380px", minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
              <h2 id="ea-h" style={{ fontSize: "clamp(32px,4.5vw,44px)" }}>Free for a month. Shaped by you.</h2>
              <p style={{ margin: 0, fontSize: 18, lineHeight: 1.6, color: "#c9cbe3" }}>I&apos;m Vikas, and I&apos;m building GainsTalk with a small group of online coaches. You get full access free for a month. In return, I&apos;d love a 15-minute chat each week about what&apos;s working and what isn&apos;t.</p>
              <ul style={{ margin: "6px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10, fontSize: 16, color: "#e3e4f2" }}>
                <li style={{ display: "flex", gap: 10, alignItems: "center" }}><Check />I set it up with you</li>
                <li style={{ display: "flex", gap: 10, alignItems: "center" }}><Check />No card, cancel any time</li>
              </ul>
            </div>

            {sent === "1" ? (
              <div className="lp-form" role="status">
                <h3>You&apos;re on the list</h3>
                <p className="lp-ok" style={{ margin: 0 }}>Thanks! I&apos;ll message you on Instagram within a day to set things up.</p>
              </div>
            ) : (
              <form className="lp-form" method="post" action="/api/leads" aria-label="Early access">
                {sent === "missing" && <p className="lp-err" style={{ margin: 0 }} role="alert">Add your name and Instagram handle so I can reach you.</p>}
                {sent === "error" && <p className="lp-err" style={{ margin: 0 }} role="alert">That didn&apos;t go through. Try again.</p>}
                <label>Your name<input type="text" name="name" autoComplete="name" required maxLength={80} /></label>
                <label>Instagram handle<input type="text" name="instagram" placeholder="@yourhandle" required maxLength={60} autoCapitalize="none" /></label>
                <label>How many clients do you coach?
                  <select name="clients" defaultValue="1–10">
                    <option>1–10</option><option>11–30</option><option>31–60</option><option>60+</option>
                  </select>
                </label>
                <label>Where do clients message you most?
                  <select name="channel" defaultValue="Instagram">
                    <option>Instagram</option><option>WhatsApp</option><option>Texts</option><option>My coaching app</option>
                  </select>
                </label>
                <div className="lp-hp" aria-hidden="true"><label>Website<input type="text" name="website" tabIndex={-1} autoComplete="off" /></label></div>
                <button type="submit" className="lp-btn lp-blue">Get my free month</button>
                <p style={{ margin: 0, fontSize: 13, color: "#5b5f7a", textAlign: "center" }}>I&apos;ll message you on Instagram within a day.</p>
              </form>
            )}
          </div>

          <footer className="lp-wrap">
            <div className="lp-foot">
              <span>GainsTalk</span>
              <span style={{ display: "flex", gap: 20 }}><Link href="/privacy" style={{ color: "#c9cbe3" }}>Privacy</Link><Link href="/terms" style={{ color: "#c9cbe3" }}>Terms</Link></span>
            </div>
          </footer>
        </section>
      </main>
    </div>
  );
}

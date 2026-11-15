"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Angle, StyleSettings } from "@/lib/types";
import { Icon } from "@/components/Icon";
import { Switch, postJSON } from "@/components/ui";

const SAMPLE: Record<Angle, string> = {
  soft: "no stress, heavy legs happen. easy 5k thursday instead and we'll do the long run sunday",
  mid: "don't make it up. easy 5k thursday, long run sunday like planned. how's sleep been?",
  firm: "skip the make up run. easy 5k thursday, long run sunday. send me your sleep hours this week",
};

export default function VoiceClient({ style, sentCount, settingsMode }: { style: StyleSettings; sentCount: number; settingsMode: boolean }) {
  const router = useRouter();
  const [s, setS] = useState<StyleSettings>(style);
  const [samples, setSamples] = useState(style.samples.join("\n"));
  const [busy, setBusy] = useState(false);

  const rules: { key: "noEmDashes" | "casual" | "matchEmoji" | "signOff"; title: string; sub: string }[] = [
    { key: "noEmDashes", title: "No em dashes", sub: "They make texts read like AI." },
    { key: "casual", title: "Casual, not polished", sub: "Natural beats articulate for clients." },
    { key: "matchEmoji", title: "Match my emoji use", sub: "Only where you'd use them." },
    { key: "signOff", title: "Add my sign-off", sub: "Most coaches don't sign texts." },
  ];

  const finish = async () => {
    setBusy(true);
    await postJSON("/api/settings", {
      style: { ...s, samples: samples.split("\n").map((x) => x.trim()).filter(Boolean) },
      ...(settingsMode ? {} : { onboarded: true }),
    });
    router.push(settingsMode ? "/channels" : "/today");
  };

  return (
    <main className="app plain with-footer">
      <div className="pad stack">
        <Link href={settingsMode ? "/channels" : "/onboarding/clients"} className="back">
          <Icon name="chevron-left" size={24} stroke={2.2} /> Back
        </Link>
        <div className="stack-sm" style={{ padding: "0 4px" }}>
          {!settingsMode && (
            <div className="steps" role="img" aria-label="Step 3 of 3">
              <span className="on" /><span className="on" /><span className="on" />
            </div>
          )}
          <h1 className="display" style={{ fontSize: 30, lineHeight: "34px", fontWeight: 800, marginTop: 6 }}>Sound like you, not a robot</h1>
          <p className="lead">Drafts copy how you actually text clients. They learn from {sentCount > 0 ? `${sentCount} messages you've sent` : "messages you send"} and any examples you add below.</p>
        </div>

        <section className="stack-sm" aria-labelledby="rules-h">
          <h2 id="rules-h" className="label">Always</h2>
          <ul className="group">
            {rules.map((r) => (
              <li key={r.key}>
                <span className="grow" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 16, fontWeight: 700 }}>{r.title}</span>
                  <span className="small muted">{r.sub}</span>
                </span>
                <Switch checked={s[r.key]} onChange={(v) => setS({ ...s, [r.key]: v })} label={r.title} />
              </li>
            ))}
          </ul>
        </section>

        <section className="stack-sm" aria-labelledby="angle-h">
          <h2 id="angle-h" className="label">Start drafts on</h2>
          <div className="seg grey" role="radiogroup" aria-label="Default angle">
            {(["soft", "mid", "firm"] as Angle[]).map((a) => (
              <button key={a} type="button" role="radio" aria-checked={s.defaultAngle === a} onClick={() => setS({ ...s, defaultAngle: a })} style={{ textTransform: "capitalize" }}>
                {a}
              </button>
            ))}
          </div>
          <div className="card" style={{ gap: 8 }}>
            <span className="small muted" style={{ fontWeight: 700 }}>How a reply will sound</span>
            <p className="bubble out" style={{ maxWidth: "88%" }}>{SAMPLE[s.defaultAngle]}</p>
          </div>
        </section>

        <section className="stack-sm">
          <div className="field">
            <label htmlFor="samples" style={{ margin: "0 4px" }}>Paste a few texts you've sent clients (optional)</label>
            <textarea
              id="samples"
              className="textarea"
              placeholder={"one per line\nlets gooo, proud of you\neasy day tomorrow, legs up tonight"}
              value={samples}
              onChange={(e) => setSamples(e.target.value)}
            />
          </div>
        </section>
      </div>

      <div className="footer-bar">
        <div>
          <button className="btn btn-primary btn-big" disabled={busy} onClick={finish}>
            {settingsMode ? "Save texting style" : "Finish and see today"}
          </button>
        </div>
      </div>
    </main>
  );
}

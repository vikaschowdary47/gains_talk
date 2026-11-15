"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CHANNELS } from "@/lib/channels";
import type { Channel, Drafts } from "@/lib/types";
import { Icon, Rings } from "@/components/Icon";
import { Toast, postJSON, useToast } from "@/components/ui";

type Phase = "idle" | "recording" | "done" | "saved";
const BARS = [10, 18, 26, 14, 34, 22, 40, 28, 16, 36, 24, 44, 30, 18, 38, 26, 12, 32, 20, 42, 28, 16, 24, 12];
const DOTS = ["var(--mint)", "var(--peri)", "var(--amber)", "var(--pink)"];

function pickMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  for (const t of ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg"]) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

export default function VoiceNoteClient({ messageId, mode, firstName, channel }: { messageId: string; mode: "reply" | "nudge"; firstName: string; channel: Channel }) {
  const [points, setPoints] = useState<string[] | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [secs, setSecs] = useState(0);
  const [level, setLevel] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [toast, showToast] = useToast();
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const raf = useRef<number | null>(null);
  const stream = useRef<MediaStream | null>(null);

  useEffect(() => {
    postJSON<{ drafts: Drafts }>("/api/drafts", { messageId, mode }).then((res) => setPoints(res.drafts?.talkingPoints ?? []));
    return () => cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function cleanup() {
    if (timer.current) clearInterval(timer.current);
    if (raf.current) cancelAnimationFrame(raf.current);
    stream.current?.getTracks().forEach((t) => t.stop());
  }

  const start = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = s;
      const mime = pickMime();
      const r = new MediaRecorder(s, mime ? { mimeType: mime } : undefined);
      chunks.current = [];
      r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      r.onstop = () => {
        const b = new Blob(chunks.current, { type: r.mimeType || "audio/webm" });
        setBlob(b);
        setAudioUrl(URL.createObjectURL(b));
        cleanup();
        setLevel(0);
      };
      r.start();
      rec.current = r;
      setSecs(0);
      setPhase("recording");
      timer.current = setInterval(() => setSecs((x) => x + 1), 1000);

      // Live level meter for the bars.
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      ctx.createMediaStreamSource(s).connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        setLevel(data.reduce((a, b) => a + b, 0) / data.length / 128);
        raf.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      showToast("Allow microphone access to record a voice note.");
    }
  };

  const stop = () => {
    rec.current?.stop();
    setPhase("done");
  };

  const redo = () => {
    setBlob(null);
    setAudioUrl(null);
    setSecs(0);
    setPhase("idle");
  };

  const save = async () => {
    if (!blob) return;
    const ext = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
    const file = new File([blob], `voice-note-${firstName.toLowerCase()}.${ext}`, { type: blob.type });
    const form = new FormData();
    form.append("messageId", messageId);
    form.append("audio", file);
    const res = await fetch("/api/voice-notes", { method: "POST", body: form });
    if (!res.ok) return showToast("Couldn't save the voice note. Try again.");
    setPhase("saved");
    // Hand it to the phone's share sheet so it goes out in the client's own app.
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.canShare?.({ files: [file] })) {
      try {
        await nav.share({ files: [file], title: `Voice note for ${firstName}` });
      } catch {
        /* the coach closed the share sheet */
      }
    } else {
      showToast("Saved. Download it below and send it in your chat app.");
    }
  };

  const clock = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;

  return (
    <main className="recorder">
      <Toast msg={toast} />
      <div style={{ position: "relative", overflow: "hidden", maxWidth: 480, margin: "0 auto", minHeight: "100dvh", padding: "calc(var(--safe-top) + 14px) 20px calc(28px + var(--safe-bottom))", display: "flex", flexDirection: "column", gap: 16 }}>
        <Rings color="#F9B8D3" className="vn-rings" />
        <Link href={`/reply/${messageId}${mode === "nudge" ? "?mode=nudge" : ""}`} className="back-light" style={{ alignSelf: "flex-start" }}>
          <Icon name="chevron-left" size={24} stroke={2.2} /> Reply
        </Link>
        <div className="stack-sm">
          <h1 className="display" style={{ fontSize: 30, lineHeight: "34px", fontWeight: 800 }}>Voice note to {firstName}</h1>
          <p style={{ margin: 0, fontSize: 15, lineHeight: "21px", color: "rgba(255,255,255,0.74)" }}>Glance at the points and talk like you normally would. Your voice, our prep.</p>
        </div>

        <section aria-labelledby="pts" style={{ borderRadius: 22, padding: 16, background: "rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 id="pts" style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--pink)" }}>Talking points</h2>
          {points === null ? (
            <div className="stack-sm"><div className="skeleton" style={{ width: "70%", opacity: 0.3 }} /><div className="skeleton" style={{ width: "55%", opacity: 0.3 }} /></div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {points.map((pt, i) => (
                <li key={i} style={{ display: "flex", gap: 10, fontSize: 16, lineHeight: "22px" }}>
                  <span aria-hidden="true" style={{ width: 8, height: 8, flex: "none", marginTop: 7, borderRadius: 4, background: DOTS[i % DOTS.length] }} />
                  {pt}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label="Recorder" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, minHeight: 260 }}>
          <span className="timer" role="timer">{clock}</span>
          <div className="wave" aria-hidden="true">
            {BARS.map((h, i) => {
              const live = phase === "recording";
              const height = live ? Math.max(6, h * (0.35 + level * 1.2) * (0.7 + ((i * 37) % 10) / 20)) : phase === "idle" ? Math.max(6, h / 3) : h;
              return <span key={i} style={{ height: Math.min(48, height), background: live ? "var(--coral)" : phase === "idle" ? undefined : "var(--pink)" }} />;
            })}
          </div>
          {phase === "idle" && (
            <>
              <button className="rec-btn" onClick={start} aria-label="Start recording"><Icon name="mic" size={34} /></button>
              <span style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.74)" }}>Tap to record</span>
            </>
          )}
          {phase === "recording" && (
            <>
              <button className="rec-btn on" onClick={stop} aria-label="Stop recording">
                <span aria-hidden="true" style={{ width: 30, height: 30, borderRadius: 8, background: "var(--ink)" }} />
              </button>
              <span style={{ fontSize: 15, fontWeight: 700, color: "var(--coral)" }}>Recording</span>
            </>
          )}
          {(phase === "done" || phase === "saved") && audioUrl && <audio controls src={audioUrl} style={{ width: "100%" }} />}
        </section>

        {phase === "done" && (
          <div className="stack-sm">
            <button className="btn btn-big" style={{ background: "rgba(255,255,255,0.12)", color: "#fff" }} onClick={redo}>Record again</button>
            <button className="btn btn-big btn-peri" onClick={save}><Icon name="share" size={19} stroke={2.2} /> Save and send</button>
            <p className="small center" style={{ margin: 0, color: "rgba(255,255,255,0.7)" }}>Opens your share sheet so it goes out in {CHANNELS[channel].label}.</p>
          </div>
        )}
        {phase === "saved" && (
          <div className="stack-sm">
            <div role="status" className="btn btn-big btn-mint" style={{ cursor: "default" }}><Icon name="check" stroke={2.6} /> Voice note saved for {firstName}</div>
            {audioUrl && (
              <a href={audioUrl} download={`voice-note-${firstName.toLowerCase()}`} className="btn btn-big" style={{ background: "rgba(255,255,255,0.12)", color: "#fff" }}>Download it</a>
            )}
            <Link href="/today" className="btn btn-big" style={{ background: "transparent", color: "#B9C6FF", height: 44 }}>Back to Today</Link>
          </div>
        )}
      </div>
    </main>
  );
}

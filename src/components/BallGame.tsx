"use client";

import { useEffect, useRef, useState } from "react";
import { useFamily } from "@/lib/useFamily";
import { Luke } from "./Luke";

const DURATION = 20;
const BEST_KEY = "lukeapp.ball.best";

function readBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY) ?? 0);
  } catch {
    return 0;
  }
}

/** ¡Atrapá la pelota! Tocá las pelotas antes de que desaparezcan. */
export function BallGame() {
  const { data } = useFamily();
  const [phase, setPhase] = useState<"idle" | "play" | "end">("idle");
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(DURATION);
  const [ball, setBall] = useState({ x: 50, y: 50, id: 0 });
  const [best, setBest] = useState(0);
  const [pop, setPop] = useState(false);
  const area = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lectura de localStorage al montar
    setBest(readBest());
  }, []);

  useEffect(() => {
    if (phase !== "play") return;
    const timer = setInterval(() => setLeft((l) => l - 1), 1000);
    return () => clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase === "play" && left <= 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- fin del tiempo
      setPhase("end");
      if (score > readBest()) {
        try {
          localStorage.setItem(BEST_KEY, String(score));
        } catch {
          /* sin almacenamiento */
        }
        setBest(score);
      }
    }
  }, [left, phase, score]);

  // La pelota se mueve sola, cada vez más rápido.
  useEffect(() => {
    if (phase !== "play") return;
    const speed = Math.max(550, 1300 - score * 40);
    const t = setTimeout(() => moveBall(), speed);
    return () => clearTimeout(t);
  }, [ball.id, phase, score]);

  function moveBall() {
    setBall((b) => ({ x: 10 + Math.random() * 80, y: 10 + Math.random() * 75, id: b.id + 1 }));
  }

  function start() {
    setScore(0);
    setLeft(DURATION);
    setPhase("play");
    moveBall();
  }

  function catchBall() {
    setScore((s) => s + 1);
    setPop(true);
    setTimeout(() => setPop(false), 250);
    navigator.vibrate?.(20);
    moveBall();
  }

  return (
    <div className="flex flex-col items-center">
      <div className="flex w-full justify-between font-extrabold text-lg mb-2">
        <span>🎾 {score}</span>
        <span>⏱️ {phase === "play" ? left : DURATION}s</span>
        <span>🏆 {best}</span>
      </div>
      <div ref={area} className="relative w-full h-80 rounded-3xl bg-[var(--green-soft)] overflow-hidden select-none touch-manipulation">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
          <Luke mood={phase === "end" ? "happy" : pop ? "happy" : "waiting"} size={120} />
        </div>
        {phase === "play" && (
          <button
            key={ball.id}
            className="absolute pop -translate-x-1/2 -translate-y-1/2 p-3"
            style={{ left: `${ball.x}%`, top: `${ball.y}%` }}
            onPointerDown={catchBall}
            aria-label="Atrapar la pelota"
          >
            <svg viewBox="0 0 40 40" width="48" height="48" aria-hidden>
              <circle cx="20" cy="20" r="18" fill="#d7f04a" stroke="#a9c02a" strokeWidth="2" />
              <path d="M6 10 C 16 16, 16 24, 6 30" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
              <path d="M34 10 C 24 16, 24 24, 34 30" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
            </svg>
          </button>
        )}
        {phase !== "play" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 text-center px-6">
            {phase === "end" ? (
              <>
                <p className="text-3xl font-black">¡{score} pelotas!</p>
                <p className="font-bold text-[var(--ink-soft)]">{score >= best && score > 0 ? "¡Nuevo récord! 🏆" : `${data.family.dogName} está chocho`}</p>
              </>
            ) : (
              <p className="text-xl font-black">Tocá la pelota antes de que {data.family.dogName} se aburra</p>
            )}
            <button className="btn btn-primary mt-4" onClick={start}>
              {phase === "end" ? "Otra vez" : "¡Jugar!"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

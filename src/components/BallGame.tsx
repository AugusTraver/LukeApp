"use client";

import { useEffect, useRef, useState } from "react";
import { useFamily } from "@/lib/useFamily";
import { Timer, Trophy } from "lucide-react";
import { Dog, type DogCoat } from "./Dog";

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
      <div className="grid grid-cols-3 w-full mb-3 text-center">
        <span>
          <span className="block display text-[1.75rem] tabular-nums">{score}</span>
          <span className="text-[0.8125rem] text-ink-3 font-medium">Pelotas</span>
        </span>
        <span>
          <span className="flex items-center justify-center gap-1 display text-[1.75rem] tabular-nums"><Timer size={18} className="text-ink-3" />{phase === "play" ? left : DURATION}</span>
          <span className="text-[0.8125rem] text-ink-3 font-medium">Segundos</span>
        </span>
        <span>
          <span className="flex items-center justify-center gap-1 display text-[1.75rem] tabular-nums"><Trophy size={18} className="text-sun" />{best}</span>
          <span className="text-[0.8125rem] text-ink-3 font-medium">Récord</span>
        </span>
      </div>
      <div ref={area} className="relative w-full h-80 rounded-3xl bg-pine-soft overflow-hidden select-none touch-manipulation">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
          <Dog mood={phase === "end" || pop ? "happy" : "waiting"} coat={data.family.dogCoat as DogCoat} size={130} sun={false} />
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
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-paper/55 text-center px-6">
            {phase === "end" ? (
              <>
                <p className="display text-[2rem]">{score} pelotas</p>
                <p className="text-ink-2 mt-1">{score >= best && score > 0 ? "Nuevo récord." : `${data.family.dogName} quedó contento.`}</p>
              </>
            ) : (
              <p className="display text-[1.6rem]">Tocá la pelota antes de que {data.family.dogName} se aburra</p>
            )}
            <button className="btn btn-primary mt-5" onClick={start}>
              {phase === "end" ? "Jugar otra vez" : "Empezar"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

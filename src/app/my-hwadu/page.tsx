"use client";

// ─────────────────────────────────────────────────────────────
// 내가 던지는 화두 — 세상이 준 물음 말고, 그대가 세상에 던지는 물음.
// 직접 쓴 화두를 들고 같은 법도(참구 기간 → 회향)로 수행한다.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadStore, saveStore, type Store } from "@/lib/store";

const DURATIONS = [
  { days: 1, label: "하루" },
  { days: 3, label: "사흘" },
  { days: 7, label: "이레" },
  { days: 0, label: "스스로 정함" },
];

export default function MyHwaduPage() {
  const router = useRouter();
  const [store, setStore] = useState<Store | null>(null);
  const [question, setQuestion] = useState("");
  const [days, setDays] = useState(3);

  useEffect(() => {
    setStore(loadStore());
  }, []);

  if (!store) return null;

  const hasCurrent = !!store.current;

  const toss = () => {
    const q = question.trim();
    if (!q) return;
    if (
      hasCurrent &&
      !window.confirm(
        "이미 들고 있는 화두가 있습니다.\n내려놓고 이 화두를 드시겠습니까? (기록 없이 사라집니다)"
      )
    )
      return;
    const next: Store = {
      ...store,
      current: {
        hwaduId: "custom",
        customQuestion: q,
        receivedAt: Date.now(),
        durationDays: days,
      },
      received: store.received + 1,
    };
    setStore(next);
    saveStore(next);
    router.push("/");
  };

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-6 py-14">
      <h1 className="rise text-center text-xs tracking-[0.5em] text-gold-soft">
        내가 던지는 화두
      </h1>
      <p className="rise rise-d1 mt-7 text-center font-serif text-lg font-light leading-9 text-hanji">
        그대를 붙들고 놓아주지 않는 물음이 있습니까.
      </p>
      <p className="rise rise-d1 mt-2 text-center text-[13px] leading-7 text-hanji-dim">
        옛 스승의 화두가 아니어도 좋습니다. 그 물음을 여기 적어,
        <br className="hidden sm:block" />
        같은 법도로 품어 보십시오.
      </p>

      <div className="rise rise-d2 mt-10 border-t border-ink-3 pt-8">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={4}
          placeholder="예 — 나는 왜 이 일을 하는가."
          className="journal-area"
        />
      </div>

      <div className="rise rise-d3 mt-8">
        <p className="text-xs tracking-[0.3em] text-hanji-faint">
          며칠을 품으시겠습니까
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {DURATIONS.map((o) => (
            <button
              key={o.days}
              onClick={() => setDays(o.days)}
              className={`border px-5 py-2.5 text-[12.5px] tracking-[0.15em] transition-colors ${
                days === o.days
                  ? "border-gold/60 text-gold"
                  : "border-ink-3 text-hanji-dim hover:text-hanji"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rise rise-d3 mt-10 flex items-center justify-between">
        <p className="text-[11px] leading-5 text-hanji-faint">
          {hasCurrent
            ? "지금 들고 있는 화두는 내려놓게 됩니다"
            : "화두는 한 번에 하나만 듭니다"}
        </p>
        <button
          onClick={toss}
          disabled={!question.trim()}
          className="btn-obang px-8 py-3 text-[13px] tracking-[0.3em] text-hanji transition-opacity enabled:hover:opacity-90 disabled:opacity-30"
        >
          이 화두를 들다
        </button>
      </div>
    </div>
  );
}

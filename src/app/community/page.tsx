"use client";

// ─────────────────────────────────────────────────────────────
// 선방(禪房) — 익명의 회향들이 걸린 방.
// 평가도 댓글도 없다. 다만 합장을 보낼 수 있다.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import Link from "next/link";
import { Lantern } from "@/components/icons";
import { bowToPost, fetchPosts, type Post } from "@/lib/community";
import { formatDate } from "@/lib/store";

const BOWED_KEY = "hwadoo-bowed-v1"; // 내가 합장한 글들 (중복 방지)

function loadBowed(): string[] {
  try {
    return JSON.parse(window.sessionStorage.getItem(BOWED_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export default function CommunityPage() {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [bowed, setBowed] = useState<string[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setBowed(loadBowed());
    fetchPosts()
      .then(setPosts)
      .catch(() => setFailed(true));
  }, []);

  const bow = async (id: string) => {
    if (bowed.includes(id)) return;
    const next = [...bowed, id];
    setBowed(next);
    window.sessionStorage.setItem(BOWED_KEY, JSON.stringify(next));
    setPosts(
      (prev) =>
        prev?.map((p) =>
          p.id === id ? { ...p, hapjang: p.hapjang + 1 } : p
        ) ?? null
    );
    try {
      await bowToPost(id);
    } catch {
      /* 조용히 — 화면 숫자는 이미 올라갔고, 큰일 아니다 */
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-6 py-14">
      <div className="rise flex flex-col items-center text-center">
        <Lantern className="h-8 w-8 text-gold-soft opacity-80" />
        <h1 className="mt-5 text-xs tracking-[0.5em] text-gold-soft">
          禪房 · 선방
        </h1>
        <p className="mt-6 font-serif text-lg font-light leading-9 text-hanji">
          같은 물음을 지나온 이들의 답이 걸려 있습니다.
        </p>
        <p className="mt-2 text-xs leading-6 text-hanji-faint">
          모두 익명입니다. 평가하지 않고, 다만 합장할 뿐입니다.
          <br />
          회향을 마치면 그대의 답도 이곳에 걸 수 있습니다.
        </p>
      </div>

      {failed ? (
        <p className="mt-16 text-center text-sm text-hanji-faint">
          선방 문이 잠시 닫혀 있습니다. 잠시 후 다시 들러 주세요.
        </p>
      ) : posts === null ? null : posts.length === 0 ? (
        <div className="rise rise-d1 mt-16 text-center">
          <p className="text-sm leading-8 text-hanji-dim">
            아직 걸린 회향이 없습니다.
          </p>
          <p className="mt-1 text-xs text-hanji-faint">
            첫 답을 거는 사람이 이 방의 문을 여는 셈입니다.
          </p>
          <Link
            href="/"
            className="btn-obang mt-8 inline-block px-8 py-3 text-xs tracking-[0.3em] text-hanji transition-opacity hover:opacity-90"
          >
            화두를 받으러 가다
          </Link>
        </div>
      ) : (
        <div className="mt-12 flex flex-col gap-10">
          {posts.map((p, i) => (
            <article
              key={p.id}
              className={`rise border-t border-ink-3 pt-7 ${i < 3 ? `rise-d${i + 1}` : ""}`}
            >
              <p className="whitespace-pre-line text-[13px] leading-7 text-gold-soft">
                {p.question}
              </p>
              <blockquote className="mt-4 whitespace-pre-line font-serif text-[15px] font-light leading-9 text-hanji">
                {p.answer}
              </blockquote>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-[11px] tracking-wider text-hanji-faint">
                  {p.createdAt ? formatDate(p.createdAt.seconds * 1000) : ""} ·
                  어느 수행자
                </span>
                <button
                  onClick={() => bow(p.id)}
                  disabled={bowed.includes(p.id)}
                  className={`flex items-center gap-2 border px-4 py-1.5 text-xs tracking-[0.15em] transition-colors ${
                    bowed.includes(p.id)
                      ? "border-gold/40 text-gold"
                      : "border-ink-3 text-hanji-dim hover:border-gold/40 hover:text-hanji"
                  }`}
                >
                  🙏 합장 {p.hapjang > 0 && p.hapjang}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

// 차 한 잔(喫茶去) — 도량에 차 한 잔을 올리는 찻자리.
// 찻값은 도량(서비스)을 잇는 데 쓰인다.
// 카카오페이 링크는 모바일 전용이라:
// · 폰에서는 버튼을 누르면 바로 카카오페이가 열리고
// · PC에서는 QR코드를 보여줘 폰 카메라로 찍게 한다.
import { QRCodeSVG } from "qrcode.react";
import { DONATION_URL } from "@/lib/config";

export default function Donation() {
  return (
    <section className="mx-auto w-full max-w-md border border-ink-3 bg-ink-2/60 px-8 py-7 text-center">
      <p className="text-xs tracking-[0.5em] text-hanji-faint">喫茶去</p>
      <h3 className="mt-2 text-base tracking-[0.2em] text-hanji-dim">
        차 한 잔
      </h3>
      {/* 돈 이야기는 찻자리 바로 여기서 한 번에 끝낸다 — **기부라는 것**과
          **어디에 쓰는지.** 위에 또 한 문단을 두었더니 한 화면에서 같은
          말을 두 번 했다. 두 번째는 읽히지 않고 자리만 먹는다. */}
      <p className="mt-4 text-sm leading-7 text-hanji-dim">
        이 도량이 마음에 머물렀다면,
        <br />
        <span className="text-hanji">만드는 사람에게 차 한 잔을 기부</span>하실
        수 있습니다.
        <br />
        찻값은 이 도량을 잇는 데 쓰이고,
        <br />
        <span className="text-gold-soft">그중 일부는 불교계에 보시</span>합니다.
      </p>

      {DONATION_URL ? (
        <>
          {/* 모바일 — 바로 카카오페이로 */}
          <a
            href={DONATION_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-block border border-gold/50 px-8 py-2.5 text-sm tracking-[0.3em] text-hanji transition-colors duration-500 hover:bg-gold/10 sm:hidden"
          >
            차 한 잔 올리기
          </a>
          {/* PC — 폰 카메라로 찍는 QR */}
          <div className="mt-6 hidden flex-col items-center sm:flex">
            <div className="rounded-sm bg-[#EDE6D4] p-3">
              <QRCodeSVG
                value={DONATION_URL}
                size={116}
                bgColor="#EDE6D4"
                fgColor="#14110D"
                level="M"
              />
            </div>
            <p className="mt-3 text-[11px] leading-5 text-hanji-faint">
              휴대폰 카메라로 비추면
              <br />
              카카오페이가 열립니다
            </p>
          </div>
        </>
      ) : (
        <p className="mt-6 text-xs tracking-widest text-hanji-faint">
          찻자리를 마련하고 있습니다
        </p>
      )}
      {/* 형: 「올리지 않으셔도 됩니다. 도량은 늘 열려 있습니다. — 이 말 삭제」.
          찻자리 바로 밑에서 안 내도 된다고 말할 이유가 없다 */}
    </section>
  );
}

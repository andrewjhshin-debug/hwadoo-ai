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
      <p className="mt-4 text-sm leading-7 text-hanji-dim">
        이 도량이 마음에 머물렀다면,
        <br />
        도량에 차 한 잔을 올려 주실 수 있습니다.
        <br />
        찻값은 이 도량을 잇는 데 쓰입니다.
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
      <p className="mt-4 text-[11px] text-hanji-faint">
        올리지 않으셔도 됩니다. 도량은 늘 열려 있습니다.
      </p>
    </section>
  );
}

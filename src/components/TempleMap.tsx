"use client";

// ─────────────────────────────────────────────────────────────
// 손잡고 절로 — 도량 지도.
// · Leaflet + OpenStreetMap 표준 타일 — API 키·콘솔 작업 없이 그린다.
//   (타일 저작권 표기는 OSM 정책에 따라 반드시 남긴다)
// · SSR 회피: leaflet 은 useEffect 안에서 동적으로 불러온다.
// · 마커는 divIcon — 금빛 연꽃 점(작은 원 + 은은한 빛).
//   누르면 팝업: 절 이름(산문) · 한 줄 소개 + '길 찾기'(카카오맵, 새 창).
// · temples 가 바뀌면 마커를 다시 놓고 fitBounds(한 곳이면 zoom 11).
// · 스크롤 휠 줌은 지도를 한 번 누른 뒤에만 — 페이지 스크롤을 막지 않게.
// · 밤 모드: 바깥 껍데기에 data-dark 를 새겨 globals.css 의
//   타일 필터(살짝 어둡고 채도 낮춤)가 듣게 한다.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import type { LayerGroup, Map as LeafletMap } from "leaflet";
import { kakaoMapUrl, type Temple } from "@/lib/pilgrimage";
import "leaflet/dist/leaflet.css";

type LeafletModule = typeof import("leaflet");

type Props = {
  temples: Temple[];
  onSelect?: (name: string) => void;
};

// 남한 전체가 한눈에 드는 처음 자리
const KOREA_CENTER: [number, number] = [36.1, 127.8];
const KOREA_ZOOM = 6;

export default function TempleMap({ temples, onSelect }: Props) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const leafletRef = useRef<LeafletModule | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<LayerGroup | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const [ready, setReady] = useState(false);
  const [dark, setDark] = useState(true);

  // 밤 ↔ 낮 — html[data-theme] 을 지켜본다
  useEffect(() => {
    const root = document.documentElement;
    const check = () => setDark(root.dataset.theme !== "light");
    check();
    const obs = new MutationObserver(check);
    obs.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  // 지도 한 번 깔기 — leaflet 은 여기서만 불러온다 (SSR 회피)
  useEffect(() => {
    let gone = false;
    (async () => {
      const mod = await import("leaflet");
      // CJS/ESM 어느 쪽으로 풀려도 같은 이름표를 잡는다
      const L = ((mod as { default?: LeafletModule }).default ??
        mod) as LeafletModule;
      if (gone || !boxRef.current || mapRef.current) return;

      const map = L.map(boxRef.current, {
        center: KOREA_CENTER,
        zoom: KOREA_ZOOM,
        scrollWheelZoom: false, // 페이지 스크롤을 방해하지 않게 — 지도를 누르면 켠다
        attributionControl: true,
      });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      }).addTo(map);

      // 휠 줌은 지도 위에서만 — 한 번 누르면 켜고, 벗어나면 끈다
      map.on("click", () => map.scrollWheelZoom.enable());
      map.on("mouseout", () => map.scrollWheelZoom.disable());

      leafletRef.current = L;
      mapRef.current = map;
      setReady(true);
    })();

    return () => {
      gone = true;
      markersRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, []);

  // temples 가 바뀌면 마커를 다시 놓는다
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!ready || !L || !map) return;

    markersRef.current?.remove();
    const group = L.layerGroup();

    for (const t of temples) {
      const icon = L.divIcon({
        className: "temple-marker",
        html: '<span class="lotus-dot"></span>',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
        popupAnchor: [0, -10],
      });
      const marker = L.marker([t.lat, t.lng], { icon, title: t.name });
      marker.bindPopup(
        `<p class="tm-name">${t.name}<span class="tm-mtn">${t.mountain}</span></p>` +
          `<p class="tm-note">${t.note}</p>` +
          `<a class="tm-link" href="${kakaoMapUrl(t.name)}" target="_blank" rel="noopener noreferrer">길 찾기 →</a>`
      );
      marker.on("click", () => onSelectRef.current?.(t.name));
      group.addLayer(marker);
    }

    group.addTo(map);
    markersRef.current = group;

    if (temples.length === 1) {
      map.setView([temples[0].lat, temples[0].lng], 11);
    } else if (temples.length > 1) {
      map.fitBounds(
        L.latLngBounds(temples.map((t) => [t.lat, t.lng] as [number, number])),
        { padding: [28, 28] }
      );
    }
  }, [temples, ready]);

  return (
    <div
      className="temple-map h-[300px] w-full overflow-hidden rounded-[14px] border border-ink-3 bg-ink-2/50 md:h-[380px]"
      data-dark={dark ? "" : undefined}
    >
      <div ref={boxRef} className="h-full w-full" aria-label="도량 지도" />
    </div>
  );
}

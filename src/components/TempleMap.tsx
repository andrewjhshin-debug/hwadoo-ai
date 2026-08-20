"use client";

// ─────────────────────────────────────────────────────────────
// 손잡고 절로 — 도량 지도.
// · Leaflet + CARTO 베이스맵 — API 키·콘솔 작업 없이 그린다.
//   밤은 dark_all(먹빛), 낮은 voyager — html[data-theme] 을 지켜보다
//   테마가 바뀌면 타일을 통째로 갈아 끼운다.
//   (타일 저작권 표기는 OSM · CARTO 정책에 따라 반드시 남긴다)
// · SSR 회피: leaflet 은 useEffect 안에서 동적으로 불러온다.
// · 마커는 divIcon — 금빛 기와지붕 실루엣(맞배지붕 곡선 + 기둥 둘).
//   템플스테이 절은 지붕 아래 금색 점 하나로 구분한다.
//   누르면 팝업: 절 이름(산문·템플스테이 배지) · 한 줄 소개 +
//   공식 홈페이지가 있는 절은 '홈페이지 →', 없는 절은 '길 찾기 →'.
// · temples 가 바뀌면 마커를 다시 놓고 fitBounds(한 곳이면 zoom 11).
// · 오른쪽 위 과녁 단추 — 내 위치를 금색 맥동 점으로 찍고 다가간다.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import type {
  LayerGroup,
  Map as LeafletMap,
  Marker,
  TileLayer,
} from "leaflet";
import { kakaoMapUrl, type Temple } from "@/lib/pilgrimage";
import "leaflet/dist/leaflet.css";

type LeafletModule = typeof import("leaflet");

type Props = {
  temples: Temple[];
  onSelect?: (name: string) => void;
  // 팝업의 [이 절에 함께 가기] — 모임 폼에 절 이름을 채워 연다
  onGather?: (name: string) => void;
};

// 남한 전체가 한눈에 드는 처음 자리
const KOREA_CENTER: [number, number] = [36.1, 127.8];
const KOREA_ZOOM = 6;

// CARTO 베이스맵 — 밤은 먹빛(dark_all), 낮은 voyager
const TILE_DARK =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILE_LIGHT =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

// 마커 — 한국 기와지붕 실루엣 (곡선 지붕 + 기둥 둘 · icons.tsx 의 Iljumun 을 다듬었다)
// 템플스테이 절은 지붕 아래 금색 점 하나.
function templeGlyph(templestay: boolean): string {
  return (
    '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    // 지붕 — 끝이 살짝 들린 맞배지붕. 위 곡선으로 올라갔다 안쪽 곡선으로 돌아온다
    '<path class="tg-roof" d="M2.6 9.8 C5.6 6.6 8.7 5 12 5 c3.3 0 6.4 1.6 9.4 4.8 C18.4 8.2 15.3 7.4 12 7.4 c-3.3 0-6.4.8-9.4 2.4 Z"/>' +
    // 기둥 둘 + 주춧돌 한 줄
    '<path class="tg-post" d="M7.4 10 V19.2 M16.6 10 V19.2"/>' +
    '<path class="tg-base" d="M5.8 19.2 h12.4"/>' +
    (templestay ? '<circle class="tg-stay" cx="12" cy="14.2" r="1.7"/>' : "") +
    "</svg>"
  );
}

export default function TempleMap({ temples, onSelect, onGather }: Props) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const leafletRef = useRef<LeafletModule | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<LayerGroup | null>(null);
  const tileRef = useRef<TileLayer | null>(null);
  const myMarkerRef = useRef<Marker | null>(null);
  const geoTimerRef = useRef<number | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const onGatherRef = useRef(onGather);
  onGatherRef.current = onGather;

  const [ready, setReady] = useState(false);
  const [dark, setDark] = useState(true);
  const [geoNote, setGeoNote] = useState<string | null>(null);

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
        scrollWheelZoom: true,
        attributionControl: true,
      });

      leafletRef.current = L;
      mapRef.current = map;
      setReady(true);
    })();

    return () => {
      gone = true;
      if (geoTimerRef.current) window.clearTimeout(geoTimerRef.current);
      markersRef.current = null;
      tileRef.current = null;
      myMarkerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, []);

  // 테마에 맞는 타일 — 바뀌면 통째로 갈아 끼운다
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!ready || !L || !map) return;

    tileRef.current?.remove();
    tileRef.current = L.tileLayer(dark ? TILE_DARK : TILE_LIGHT, {
      maxZoom: 20,
      subdomains: "abcd",
      attribution: TILE_ATTR,
    }).addTo(map);
  }, [ready, dark]);

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
        html: templeGlyph(t.templestay === true),
        iconSize: [24, 24],
        iconAnchor: [12, 21],
        popupAnchor: [0, -18],
      });
      const marker = L.marker([t.lat, t.lng], { icon, title: t.name });
      marker.bindPopup(
        `<p class="tm-name">${t.name}<span class="tm-mtn">${t.mountain}</span>` +
          (t.templestay ? '<span class="tm-stay">템플스테이</span>' : "") +
          `</p>` +
          `<p class="tm-note">${t.note}</p>` +
          `<span class="tm-actions">` +
          `<a class="tm-link" href="${t.homepage ?? kakaoMapUrl(t.name)}" target="_blank" rel="noopener noreferrer">${t.homepage ? "홈페이지 →" : "길 찾기 →"}</a>` +
          `<button type="button" class="tm-gather">이 절에 함께 가기</button>` +
          `</span>`
      );
      marker.on("click", () => onSelectRef.current?.(t.name));
      // 팝업이 열릴 때 [함께 가기] 단추에 손을 잇는다 — 두 번 열려도 한 번만
      marker.on("popupopen", (e) => {
        const btn = e.popup
          .getElement()
          ?.querySelector<HTMLButtonElement>(".tm-gather");
        if (!btn || btn.dataset.bound) return;
        btn.dataset.bound = "1";
        btn.addEventListener("click", () => {
          marker.closePopup();
          onGatherRef.current?.(t.name);
        });
      });
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

  // 안내 문구 — 잠깐 보였다 스르르 사라진다
  const noteFor = (msg: string) => {
    setGeoNote(msg);
    if (geoTimerRef.current) window.clearTimeout(geoTimerRef.current);
    geoTimerRef.current = window.setTimeout(() => setGeoNote(null), 4000);
  };

  // 내 위치 — 금색 맥동 점을 찍고 다가간다.
  // 두 단계: 캐시된 위치로 곧장 움직이고(빠른 손맛), 고감도로 한 번 더 다듬는다.
  const locateMe = () => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      noteFor("위치를 지원하지 않는 기기입니다");
      return;
    }
    const place = (pos: GeolocationPosition) => {
      const here: [number, number] = [
        pos.coords.latitude,
        pos.coords.longitude,
      ];
      myMarkerRef.current?.remove();
      const icon = L.divIcon({
        className: "my-location-marker",
        html: '<span class="my-dot"></span>',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      myMarkerRef.current = L.marker(here, {
        icon,
        title: "내 위치",
        zIndexOffset: 1000,
        interactive: false,
      }).addTo(map);
      map.setView(here, Math.max(map.getZoom(), 13));
    };
    // 1단계 — 최근 위치가 있으면 즉시 (기다림 없이)
    navigator.geolocation.getCurrentPosition(place, () => {}, {
      enableHighAccuracy: false,
      timeout: 1500,
      maximumAge: 300000,
    });
    // 2단계 — 고감도(GPS)로 정확히
    navigator.geolocation.getCurrentPosition(
      place,
      () => noteFor("위치를 가져오지 못했습니다"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div
      className="temple-map relative h-[380px] w-full overflow-hidden rounded-[14px] border border-ink-3 bg-ink-2/50 md:h-[480px]"
      data-dark={dark ? "" : undefined}
    >
      <div ref={boxRef} className="h-full w-full" aria-label="도량 지도" />

      {/* 내 위치 — 과녁 단추 */}
      <button
        type="button"
        onClick={locateMe}
        aria-label="내 위치로 가기"
        title="내 위치"
        className="absolute right-3 top-3 z-[600] flex h-9 w-9 items-center justify-center rounded-full border border-gold/50 bg-ink-2/90 text-gold shadow-[0_4px_14px_rgba(0,0,0,0.35)] backdrop-blur-sm transition-colors hover:border-gold hover:bg-ink-2"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          className="h-[18px] w-[18px]"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="6.5" />
          <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
          <path d="M12 2.6v3M12 18.4v3M2.6 12h3M18.4 12h3" />
        </svg>
      </button>

      {/* 위치 실패 안내 — 단추 옆에 잠깐 */}
      {geoNote && (
        <p className="absolute right-14 top-[18px] z-[600] rounded-full border border-ink-3 bg-ink-2/90 px-3 py-1 text-[11px] leading-4 text-hanji-dim backdrop-blur-sm">
          {geoNote}
        </p>
      )}
    </div>
  );
}

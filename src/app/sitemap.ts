import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

// 사이트 지도 — 검색엔진이 어떤 페이지들이 있는지 한눈에 본다.
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "", // 홈
    "/ganhwaseon",
    "/gathering",
    "/pilgrimage",
    "/goods",
    "/masters",
    "/my-hwadu",
    "/try",
    "/tea",
    "/about",
    "/community",
    "/archive",
    "/room",
    "/breath",
    "/moktak",
    "/mandala",
    "/empty",
    "/lotus",
    "/terms",
    "/privacy",
  ];
  const high = ["/ganhwaseon", "/gathering", "/pilgrimage"];
  return routes.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency:
      path === "" || path === "/masters" || path === "/gathering"
        ? "daily"
        : "monthly",
    priority: path === "" ? 1 : high.includes(path) ? 0.8 : 0.5,
  }));
}

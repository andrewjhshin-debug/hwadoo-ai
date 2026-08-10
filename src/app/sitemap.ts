import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

// 사이트 지도 — 검색엔진이 어떤 페이지들이 있는지 한눈에 본다.
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "", // 홈
    "/ganhwaseon",
    "/masters",
    "/my-hwadu",
    "/try",
    "/tea",
    "/about",
    "/community",
    "/archive",
    "/room",
    "/terms",
    "/privacy",
  ];
  return routes.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" || path === "/masters" ? "daily" : "monthly",
    priority: path === "" ? 1 : path === "/ganhwaseon" ? 0.8 : 0.5,
  }));
}

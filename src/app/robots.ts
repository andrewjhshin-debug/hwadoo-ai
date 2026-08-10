import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

// 검색엔진 크롤러에게: 모두 환영, 지도는 여기 있다.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

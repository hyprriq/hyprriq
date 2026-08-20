import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants/site";

// Marketing pages are crawlable; everything behind auth (portal, admin), every API route, and the
// auth screens are not — they carry client data or render nothing useful to a crawler.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/portal/", "/admin/", "/api/", "/sign-in", "/sign-up"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants/site";

// The PUBLIC marketing surface only. Portal/admin/auth are auth-gated and deliberately absent —
// robots.ts disallows them; listing them here would contradict it.
export default function sitemap(): MetadataRoute.Sitemap {
  const page = (path: string, priority: number): MetadataRoute.Sitemap[number] => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority,
  });
  return [
    page("/", 1),
    page("/pricing", 0.9),
    page("/sample-report", 0.9),
    page("/how-it-works", 0.8),
    page("/how-to-read", 0.8),
    page("/partners", 0.8),
    page("/terms", 0.3),
    page("/privacy", 0.3),
    page("/data-policy", 0.3),
    page("/refund-policy", 0.3),
    page("/payment-policy", 0.3),
    page("/cookie-policy", 0.3),
  ];
}

import { redirect } from "next/navigation";

// Pricing now lives on the homepage (see app/page.tsx, #pricing section).
// Kept as a redirect so old links/bookmarks to /pricing still work.
export default function PricingPageRedirect() {
  redirect("/#pricing");
}

import { redirect } from "next/navigation";

// The trial is now embedded directly on the homepage (see app/page.tsx,
// #try-now section) so visitors don't have to hop between pages. This
// route is kept only so old links/bookmarks to /trial still land somewhere
// useful instead of 404ing.
export default function TrialPageRedirect() {
  redirect("/#try-now");
}

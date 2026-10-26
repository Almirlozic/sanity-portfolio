/**
 * Sanity Studio (admin-panelet) på /studio.
 * Her opretter og redigerer du projekterne.
 */
import { NextStudio } from "next-sanity/studio";

import config from "@/sanity.config";

export { metadata, viewport } from "next-sanity/studio";

export default function StudioPage() {
  return <NextStudio config={config} />;
}

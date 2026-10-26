import { createImageUrlBuilder } from "@sanity/image-url";

import { dataset, projectId } from "../env";
import type { SanityImage } from "./types";

const builder = createImageUrlBuilder({ projectId, dataset });

/** Laver en URL til et billede på Sanitys billed-CDN. */
export function urlFor(source: SanityImage) {
  return builder.image(source).auto("format").fit("max");
}

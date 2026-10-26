import { Image } from "next-sanity/image";

import { urlFor } from "@/sanity/lib/image";
import type { SanityImage as SanityImageType } from "@/sanity/lib/types";

type Props = {
  image: SanityImageType;
  sizes: string;
  className?: string;
  priority?: boolean;
  alt?: string;
};

/**
 * Billede fra Sanity, der fylder sin forælder (som skal have position: relative
 * og en højde / aspect-ratio). Viser et sløret preview, mens billedet loader.
 */
export default function SanityImage({ image, sizes, className, priority, alt }: Props) {
  if (!image?.asset) return null;
  const lqip = image.asset.metadata?.lqip;

  return (
    <Image
      src={urlFor(image).url()}
      alt={alt ?? image.alt ?? ""}
      fill
      sizes={sizes}
      priority={priority}
      className={className}
      placeholder={lqip ? "blur" : "empty"}
      blurDataURL={lqip}
      style={{
        objectFit: "cover",
        objectPosition: image.hotspot
          ? `${image.hotspot.x * 100}% ${image.hotspot.y * 100}%`
          : "center",
      }}
    />
  );
}

import type { PortableTextBlock } from "next-sanity";

export type SanityImage = {
  _type?: "image";
  _key?: string;
  asset: {
    _id: string;
    url: string;
    metadata?: {
      lqip?: string;
      dimensions?: { width: number; height: number; aspectRatio: number };
    };
  };
  hotspot?: { x: number; y: number; height: number; width: number };
  crop?: { top: number; bottom: number; left: number; right: number };
  alt?: string;
  fullWidth?: boolean;
};

export type ProjectSummary = {
  _id: string;
  title: string;
  slug: string;
  client?: string;
  year?: string;
  role?: string;
  excerpt?: string;
  coverImage?: SanityImage;
};

export type Project = ProjectSummary & {
  body?: PortableTextBlock[];
  gallery?: SanityImage[];
  link?: string;
  next?: ProjectSummary | null;
};

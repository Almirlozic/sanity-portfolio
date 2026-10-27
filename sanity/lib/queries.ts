import { defineQuery } from "next-sanity";

const imageFields = /* groq */ `
  ...,
  asset->{ _id, url, metadata { lqip, dimensions } }
`;

const summaryFields = /* groq */ `
  _id,
  title,
  "slug": slug.current,
  client,
  year,
  role,
  excerpt,
  coverImage { ${imageFields} }
`;

/** Alle projekter til forsiden, sorteret efter rækkefølge. Galleriet vises i detaljevisningen. */
export const PROJECTS_QUERY = defineQuery(`
  *[_type == "project" && defined(slug.current)]
  | order(order asc, _createdAt desc) {
    ${summaryFields},
    gallery[] { ${imageFields} },
    featured
  }
`);

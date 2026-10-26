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

/** Alle projekter til forsiden, sorteret efter rækkefølge. */
export const PROJECTS_QUERY = defineQuery(`
  *[_type == "project" && defined(slug.current)]
  | order(order asc, _createdAt desc) {
    ${summaryFields},
    featured
  }
`);

/** Ét projekt ud fra slug, plus det næste projekt til "Næste projekt"-linket. */
export const PROJECT_QUERY = defineQuery(`
  *[_type == "project" && slug.current == $slug][0] {
    ${summaryFields},
    body,
    link,
    gallery[] { ${imageFields} },
    "next": coalesce(
      *[_type == "project" && defined(slug.current) && order > ^.order] | order(order asc)[0],
      *[_type == "project" && defined(slug.current) && slug.current != ^.slug.current] | order(order asc)[0]
    ) { ${summaryFields} }
  }
`);

export const PROJECT_SLUGS_QUERY = defineQuery(`
  *[_type == "project" && defined(slug.current)].slug.current
`);

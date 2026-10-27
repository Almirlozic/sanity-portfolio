import { cacheLife } from "next/cache";

import { client } from "./client";
import { PROJECTS_QUERY } from "./queries";
import type { ProjectSummary } from "./types";

/*
 * Data-funktioner med 'use cache' (Next 16 Cache Components).
 * cacheLife("minutes") betyder, at nye ændringer i Sanity dukker op
 * på siden inden for et par minutter.
 */

export async function getProjects() {
  "use cache";
  cacheLife("minutes");
  try {
    return await client.fetch<(ProjectSummary & { featured?: boolean })[]>(PROJECTS_QUERY);
  } catch (error) {
    console.error("Kunne ikke hente projekter fra Sanity", error);
    return [];
  }
}

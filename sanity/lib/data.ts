import { cacheLife } from "next/cache";

import { client } from "./client";
import { PROJECT_QUERY, PROJECT_SLUGS_QUERY, PROJECTS_QUERY } from "./queries";
import type { Project, ProjectSummary } from "./types";

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

export async function getProject(slug: string) {
  "use cache";
  cacheLife("minutes");
  try {
    return await client.fetch<Project | null>(PROJECT_QUERY, { slug });
  } catch (error) {
    console.error(`Kunne ikke hente projektet "${slug}" fra Sanity`, error);
    return null;
  }
}

export async function getProjectSlugs() {
  "use cache";
  cacheLife("minutes");
  try {
    return await client.fetch<string[]>(PROJECT_SLUGS_QUERY);
  } catch (error) {
    console.error("Kunne ikke hente projekt-slugs fra Sanity", error);
    return [];
  }
}

"use client";

/**
 * Konfiguration til Sanity Studio, som kører på /studio.
 */
import { visionTool } from "@sanity/vision";
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";

import { apiVersion, dataset, projectId } from "./sanity/env";
import { schemaTypes } from "./sanity/schemaTypes";

export default defineConfig({
  basePath: "/studio",
  title: "Portfolio",
  projectId,
  dataset,
  schema: {
    types: schemaTypes,
    // About findes kun én gang, så den kan ikke oprettes som nyt dokument.
    templates: (templates) => templates.filter((t) => t.schemaType !== "about"),
  },
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title("Indhold")
          .items([
            S.listItem()
              .title("About")
              .id("about")
              .child(S.document().schemaType("about").documentId("about")),
            S.divider(),
            ...S.documentTypeListItems().filter((item) => item.getId() !== "about"),
          ]),
    }),
    visionTool({ defaultApiVersion: apiVersion }),
  ],
});

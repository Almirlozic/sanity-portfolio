import { defineArrayMember, defineField, defineType } from "sanity";

/**
 * Et projekt i porteføljen. Hvert dokument af denne type bliver til
 * sin egen side på /projects/<slug> via projektskabelonen.
 */
export const project = defineType({
  name: "project",
  title: "Projekt",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Titel",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "slug",
      title: "URL-navn (slug)",
      description: "Bruges i adressen, fx /projects/mit-projekt. Klik 'Generate'.",
      type: "slug",
      options: { source: "title", maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "featured",
      title: "Vis på forsiden",
      type: "boolean",
      initialValue: true,
    }),
    defineField({
      name: "order",
      title: "Rækkefølge",
      description: "Lavere tal vises først.",
      type: "number",
      initialValue: 0,
    }),
    defineField({
      name: "client",
      title: "Kunde",
      type: "string",
    }),
    defineField({
      name: "year",
      title: "År",
      type: "string",
    }),
    defineField({
      name: "role",
      title: "Rolle",
      description: "Fx 'Design & udvikling'.",
      type: "string",
    }),
    defineField({
      name: "excerpt",
      title: "Kort beskrivelse",
      description: "Én-to sætninger. Vises på forsiden og øverst på projektsiden.",
      type: "text",
      rows: 3,
    }),
    defineField({
      name: "coverImage",
      title: "Coverbillede",
      type: "image",
      options: { hotspot: true },
      fields: [
        defineField({ name: "alt", title: "Alternativ tekst", type: "string" }),
      ],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "body",
      title: "Tekst",
      type: "array",
      of: [defineArrayMember({ type: "block" })],
    }),
    defineField({
      name: "gallery",
      title: "Galleri",
      type: "array",
      of: [
        defineArrayMember({
          type: "image",
          options: { hotspot: true },
          fields: [
            defineField({ name: "alt", title: "Alternativ tekst", type: "string" }),
            defineField({
              name: "fullWidth",
              title: "Fuld bredde",
              type: "boolean",
              initialValue: false,
            }),
          ],
        }),
      ],
      options: { layout: "grid" },
    }),
    defineField({
      name: "link",
      title: "Link til live site",
      type: "url",
    }),
  ],
  orderings: [
    {
      title: "Rækkefølge",
      name: "orderAsc",
      by: [{ field: "order", direction: "asc" }],
    },
  ],
  preview: {
    select: { title: "title", subtitle: "client", media: "coverImage" },
  },
});

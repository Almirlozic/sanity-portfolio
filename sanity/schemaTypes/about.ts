import { defineArrayMember, defineField, defineType } from "sanity";

/**
 * Indholdet på About-siden: tre kort (About, Services, Experience), hvor teksten
 * kommer frem, når man holder musen over billedet. Der findes kun ét dokument af
 * denne type (se structure i sanity.config.ts).
 */
export const about = defineType({
  name: "about",
  title: "About",
  type: "document",
  fields: [
    defineField({
      name: "intro",
      title: "Intro",
      description: "Vises ikke på siden lige nu.",
      type: "text",
      rows: 3,
    }),
    defineField({
      name: "portrait",
      title: "Portræt",
      description: "Bruges på kortene, der ikke har deres eget billede. Uden billede bruges det fra /public.",
      type: "image",
      options: { hotspot: true },
      fields: [
        defineField({ name: "alt", title: "Alternativ tekst", type: "string" }),
      ],
    }),
    defineField({
      name: "cardImages",
      title: "Billeder til kortene",
      description:
        "Ét billede pr. kort, i rækkefølgen About, Services, Experience. Mangler et, bruges portrættet.",
      type: "array",
      of: [
        defineArrayMember({
          type: "image",
          options: { hotspot: true },
          fields: [defineField({ name: "alt", title: "Alternativ tekst", type: "string" })],
        }),
      ],
      validation: (rule) => rule.max(3),
    }),
    defineField({
      name: "bio",
      title: "Bio",
      description: "Teksten på About-kortet. Lav en tom linje mellem afsnittene.",
      type: "text",
      rows: 10,
    }),
    defineField({
      name: "services",
      title: "Services",
      description: "Punkterne på Services-kortet.",
      type: "array",
      of: [defineArrayMember({ type: "string" })],
    }),
    defineField({
      name: "tools",
      title: "Værktøjer",
      description: "Vises nederst på Experience-kortet. Fx Figma, Next.js, GSAP.",
      type: "array",
      of: [defineArrayMember({ type: "string" })],
    }),
    defineField({
      name: "experience",
      title: "Erfaring & uddannelse",
      description: "Nyeste først.",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          name: "experienceItem",
          fields: [
            defineField({
              name: "period",
              title: "Periode",
              description: "Fx '2024 — Nu'.",
              type: "string",
            }),
            defineField({
              name: "role",
              title: "Rolle",
              description: "Fx 'Multimediedesign' eller 'Praktikant'.",
              type: "string",
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "place",
              title: "Sted",
              description: "Fx 'KEA' eller firmanavn.",
              type: "string",
            }),
          ],
          preview: {
            select: { title: "role", subtitle: "place", period: "period" },
            prepare: ({ title, subtitle, period }) => ({
              title,
              subtitle: [period, subtitle].filter(Boolean).join(" · "),
            }),
          },
        }),
      ],
    }),
  ],
  preview: {
    prepare: () => ({ title: "About" }),
  },
});

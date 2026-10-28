"use client";

import Image from "next/image";
import { useRef, useState } from "react";

import { site } from "@/lib/site";
import type { About, SanityImage as SanityImageType } from "@/sanity/lib/types";

import { gsap, useGSAP } from "./gsap";
import SanityImage from "./SanityImage";

/* Kortene glider op, når About åbnes. */
const INTRO = {
  duration: 1.4,
  ease: "expo.out",
  stagger: 0.1,
  delay: 0.1,
};

/**
 * About-siden: tre kort med et billede hver. Hold musen over et kort (eller tryk
 * på mobil), så kommer teksten blødt frem på kortet, og billedet bliver baggrund
 * for hele siden. Teksterne kommer fra About-dokumentet i Sanity.
 */
export default function AboutPanel({ about, active }: { about: About; active: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState<number | null>(null);
  // Med mus styrer hover kortet; et tryk (touch) slår det til og fra.
  const pointerType = useRef("mouse");

  // Nulstil, når About lukkes.
  const [wasActive, setWasActive] = useState(active);
  if (active !== wasActive) {
    setWasActive(active);
    if (!active) setCurrent(null);
  }

  useGSAP(
    () => {
      if (!active || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.from(".about-card", {
        y: 80,
        autoAlpha: 0,
        duration: INTRO.duration,
        ease: INTRO.ease,
        stagger: INTRO.stagger,
        delay: INTRO.delay,
      });
    },
    { scope: root, dependencies: [active], revertOnUpdate: true },
  );

  const bio = about.bio?.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean) ?? [];

  // Indholdet på hvert kort. Hver linje kommer frem én efter én.
  const cards: { title: string; lines: React.ReactNode[] }[] = [
    {
      title: "About",
      lines: bio.map((p, i) => (
        <p key={i} className="about-card-text">
          {p}
        </p>
      )),
    },
    {
      title: "Services",
      lines: (about.services ?? []).map((s) => (
        <p key={s} className="about-card-bullet">
          {s}
        </p>
      )),
    },
    {
      title: "Experience",
      lines: [
        ...(about.experience ?? []).map((item) => (
          <div key={item._key} className="about-card-exp">
            <span className="muted">{item.period}</span>
            <span>
              {item.role}
              {item.place && <span className="muted"> — {item.place}</span>}
            </span>
          </div>
        )),
        ...(about.tools?.length
          ? [
              <p key="tools" className="about-card-tools">
                <span className="muted">Tools</span> {about.tools.join(", ")}
              </p>,
            ]
          : []),
      ],
    },
  ];

  const imageFor = (i: number) => (about.cardImages?.[i]?.asset ? about.cardImages[i] : about.portrait);

  const renderImage = (image: SanityImageType | undefined, sizes: string) =>
    image?.asset ? (
      <SanityImage image={image} sizes={sizes} alt={image.alt ?? site.name} />
    ) : (
      <Image src={site.portrait} alt={site.name} fill sizes={sizes} />
    );

  return (
    <div ref={root} className="about">
      {/* Billedet fra det aktive kort som baggrund for hele siden. */}
      <div className="about-bg" aria-hidden>
        {cards.map((card, i) => (
          <div key={card.title} className={`about-bg-img${current === i ? " is-on" : ""}`}>
            {renderImage(imageFor(i), "100vw")}
          </div>
        ))}
      </div>

      <div className="about-cards">
        {cards.map((card, i) => (
          <article
            key={card.title}
            className={`about-card${current === i ? " is-active" : ""}`}
            tabIndex={0}
            aria-label={card.title}
            // Kun tastatur-fokus; mus og tryk håndteres på billedet nedenfor.
            onFocus={(e) => e.currentTarget.matches(":focus-visible") && setCurrent(i)}
            onBlur={() => setCurrent((c) => (c === i ? null : c))}
          >
            <h2 className="about-card-head">
              <span>{String(i + 1).padStart(2, "0")}.</span>
              <span>{card.title}</span>
            </h2>
            {/* Kun billedet (ikke overskriften) starter animationen. */}
            <div
              className="about-card-media"
              onPointerEnter={(e) => e.pointerType === "mouse" && setCurrent(i)}
              onPointerLeave={(e) => e.pointerType === "mouse" && setCurrent(null)}
              onPointerDown={(e) => (pointerType.current = e.pointerType)}
              onClick={() => pointerType.current !== "mouse" && setCurrent((c) => (c === i ? null : i))}
            >
              {renderImage(imageFor(i), "(min-width: 768px) 30vw, 100vw")}
              <div className="about-card-overlay">
                {/* Titlen står øverst, teksten nederst (se CSS). */}
                <p className="about-card-line about-card-title" style={{ "--i": 0 } as React.CSSProperties}>
                  {card.title}
                </p>
                {card.lines.map((line, n) => (
                  <div key={n} className="about-card-line" style={{ "--i": n + 1 } as React.CSSProperties}>
                    {line}
                  </div>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

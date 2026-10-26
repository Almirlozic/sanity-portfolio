"use client";

import { useRef } from "react";

import { gsap, useGSAP } from "./gsap";

type Props = {
  children: React.ReactNode;
  className?: string;
  /** Hvor meget billedet bevæger sig (i % af højden). */
  amount?: number;
  /** Afslør billedet med en "gardin"-animation, når det scrolles ind. */
  reveal?: boolean;
  style?: React.CSSProperties;
};

/**
 * Wrapper der giver et billede parallax ved scroll og evt. en reveal-animation.
 */
export default function ParallaxMedia({
  children,
  className,
  amount = 10,
  reveal = true,
  style,
}: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Den indre del er `amount`% højere i hver ende, så den kan flytte sig
        // præcis så meget uden at vise kanter.
        const distance = () => ((wrap.current?.offsetHeight ?? 0) * amount) / 100;
        gsap.fromTo(
          inner.current,
          { y: () => -distance() },
          {
            y: () => distance(),
            ease: "none",
            scrollTrigger: {
              trigger: wrap.current,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
              invalidateOnRefresh: true,
            },
          },
        );

        if (reveal) {
          gsap.from(wrap.current, {
            clipPath: "inset(100% 0% 0% 0%)",
            duration: 1.6,
            ease: "expo.inOut",
            scrollTrigger: { trigger: wrap.current, start: "top 90%", once: true },
          });
        }
      });
    },
    { scope: wrap },
  );

  return (
    <div ref={wrap} className={`parallax ${className ?? ""}`} style={style}>
      <div
        ref={inner}
        className="parallax-inner"
        style={{ inset: `-${amount}% 0`, position: "absolute" }}
      >
        {children}
      </div>
    </div>
  );
}

"use client";

import { useRef } from "react";

import { gsap, SplitText, useGSAP } from "./gsap";

type Props = {
  children: React.ReactNode;
  as?: "h1" | "h2" | "h3" | "p" | "div" | "span";
  className?: string;
  /** Start når elementet scrolles ind (ellers med det samme ved indlæsning). */
  onScroll?: boolean;
  delay?: number;
};

/**
 * Tekst der glider op linje for linje bag en maske.
 */
export default function SplitReveal({
  children,
  as: Tag = "div",
  className,
  onScroll = false,
  delay = 0,
}: Props) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const split = SplitText.create(el, {
          type: "lines",
          mask: "lines",
          linesClass: "split-line",
          autoSplit: true,
          onSplit(self) {
            return gsap.from(self.lines, {
              yPercent: 110,
              duration: 1.4,
              stagger: 0.08,
              delay,
              scrollTrigger: onScroll ? { trigger: el, start: "top 88%", once: true } : undefined,
            });
          },
        });
        gsap.set(el, { autoAlpha: 1 });
        return () => split.revert();
      });
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(el, { autoAlpha: 1 });
      });
    },
    { scope: ref },
  );

  return (
    <Tag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- polymorf ref
      ref={ref as any}
      className={`split-reveal ${className ?? ""}`}
    >
      {children}
    </Tag>
  );
}

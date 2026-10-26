"use client";

import Link from "next/link";
import { useRef } from "react";

import type { ProjectSummary } from "@/sanity/lib/types";

import { Flip, gsap, SplitText, useGSAP } from "./gsap";
import RollText from "./RollText";

/*
 * Detaljevisning på forsiden. Det klikkede kort (netop den kopi, man ramte)
 * glider over i .preview-slot med Flip, mens de andre kort fader ud, og
 * projektets info ruller ind linje for linje. "Luk" eller Escape kører det baglæns.
 *
 * Justér varighed og easing her:
 */
const TIMING = {
  /** De andre billeder skrumper væk / vokser frem igen. */
  shrink: 1.1,
  shrinkEase: "power3.inOut",
  shrinkStagger: 0.06,
  /** Titler og "Luk"-knap fader ud/ind. */
  fade: 0.8,
  /** Billedet glider til/fra sin plads i højre side. */
  move: 1.8,
  moveEase: "expo.inOut",
  /** Teksten ruller ind linje for linje. */
  text: 1.6,
  textEase: "expo.out",
  textStagger: 0.09,
  /** Teksten ruller ud igen, når man lukker. */
  textOut: 0.7,
  textOutEase: "power3.in",
  /** Ved prefers-reduced-motion: kun en kort fade. */
  reducedFade: 0.3,
};

type Props = {
  project: ProjectSummary;
  /** Den .slide, der blev klikket på. */
  slide: HTMLElement;
  /** Kaldes, når lukke-animationen er færdig. */
  onClosed: () => void;
};

export default function ProjectPreview({ project, slide, onClosed }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const slot = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const close = useRef<() => void>(() => {});

  useGSAP(
    () => {
      const el = root.current;
      const target = slot.current;
      const media = slide.querySelector<HTMLElement>(".slide-media");
      const archive = slide.closest<HTMLElement>(".archive");
      if (!el || !target || !media || !archive) return;

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const inner = slide.querySelector<HTMLElement>(".slide-inner");
      const image = slide.querySelector<HTMLElement>(".slide-img");

      // De andre kort, sorteret efter afstand til det klikkede, så de forsvinder indefra og ud.
      const origin = slide.getBoundingClientRect().left;
      const others = gsap.utils
        .toArray<HTMLElement>(".slide", archive)
        .filter((s) => s !== slide)
        .sort(
          (a, b) =>
            Math.abs(a.getBoundingClientRect().left - origin) - Math.abs(b.getBoundingClientRect().left - origin),
        );
      const labels = [slide, ...others]
        .map((s) => s.querySelector<HTMLElement>(".slide-label"))
        .filter(Boolean) as HTMLElement[];
      const shrinks = others.map((s) => s.querySelector<HTMLElement>(".slide-media")).filter(Boolean) as HTMLElement[];
      const fades = [...labels, ...shrinks];

      // Sliderens værdier, så billedet lander præcis, som det var.
      const saved = {
        scale: inner ? Number(gsap.getProperty(inner, "scale")) : 1,
        shift: image ? Number(gsap.getProperty(image, "xPercent")) : 0,
      };

      const split = reduceMotion
        ? null
        : SplitText.create(el.querySelectorAll(".preview-split"), {
            type: "lines",
            mask: "lines",
            linesClass: "split-line",
          });
      const lines = split?.lines ?? [];

      // Lås kortets højde, så titlen ikke hopper, når billedet bliver absolute.
      gsap.set(slide, { zIndex: 2, height: slide.offsetHeight });

      const fit = (duration = 0) =>
        Flip.fit(media, target, {
          absolute: true,
          scale: false,
          duration,
          ease: TIMING.moveEase,
        }) as gsap.core.Tween | null;

      // ---------- Åbn ----------
      let open: gsap.core.Timeline;
      if (reduceMotion) {
        open = gsap
          .timeline()
          .to([...fades, media], { autoAlpha: 0, duration: TIMING.reducedFade, ease: "none" })
          .add(() => {
            fit();
          })
          .fromTo(
            [media, el],
            { autoAlpha: 0 },
            { autoAlpha: 1, duration: TIMING.reducedFade, ease: "none" },
          );
      } else {
        open = gsap
          .timeline()
          .set(el, { autoAlpha: 1 })
          .to(shrinks, { scale: 0, duration: TIMING.shrink, ease: TIMING.shrinkEase, stagger: TIMING.shrinkStagger }, 0)
          .to(labels, { autoAlpha: 0, duration: TIMING.fade, ease: "power2.out", stagger: TIMING.shrinkStagger }, 0)
          .to(inner, { scale: 1, duration: TIMING.move, ease: TIMING.moveEase }, 0)
          .to(image, { xPercent: 0, duration: TIMING.move, ease: TIMING.moveEase }, 0)
          .add(fit(TIMING.move) ?? [], 0.15)
          .from(
            lines,
            { yPercent: 110, duration: TIMING.text, ease: TIMING.textEase, stagger: TIMING.textStagger },
            "-=0.5",
          )
          .from(closeButton.current, { autoAlpha: 0, duration: TIMING.fade, ease: "power2.out" }, "<");
      }
      open.add(() => closeButton.current?.focus({ preventScroll: true }));

      // Hold billedet på plads, hvis vinduet ændrer størrelse.
      let closing = false;
      const onResize = () => {
        if (!closing && !open.isActive()) fit();
      };
      window.addEventListener("resize", onResize);

      // ---------- Luk ----------
      const finish = () => {
        gsap.set(media, { clearProps: "all" });
        gsap.set(slide, { clearProps: "zIndex,height" });
        gsap.set(labels, { clearProps: "opacity,visibility" });
        gsap.set(shrinks, { clearProps: "all" });
        split?.revert();
        slide.querySelector<HTMLElement>(".slide-link")?.focus({ preventScroll: true });
        onClosed();
      };

      // Billedet tilbage i kortet: Flip.from fra pladsen i højre side.
      const flipBack = (duration: number) => {
        const state = Flip.getState(media);
        gsap.set(media, { clearProps: "all" });
        gsap.set(slide, { clearProps: "height" });
        return Flip.from(state, { duration, ease: TIMING.moveEase });
      };

      close.current = () => {
        if (closing) return;
        closing = true;
        open.kill();

        if (reduceMotion) {
          gsap
            .timeline({ onComplete: finish })
            .to([media, el], { autoAlpha: 0, duration: TIMING.reducedFade, ease: "none" })
            .add(() => {
              flipBack(0);
            })
            .to([...fades, media], { autoAlpha: 1, duration: TIMING.reducedFade, ease: "none" });
          return;
        }

        gsap
          .timeline()
          .to(closeButton.current, { autoAlpha: 0, duration: TIMING.textOut, ease: "power2.out" }, 0)
          .to(
            lines,
            {
              yPercent: 110,
              duration: TIMING.textOut,
              ease: TIMING.textOutEase,
              stagger: { each: TIMING.textStagger / 2, from: "end" },
            },
            0,
          )
          .add(() => {
            gsap
              .timeline({ onComplete: finish })
              .add(flipBack(TIMING.move), 0)
              .to(inner, { scale: saved.scale, duration: TIMING.move, ease: TIMING.moveEase }, 0)
              .to(image, { xPercent: saved.shift, duration: TIMING.move, ease: TIMING.moveEase }, 0)
              .to(
                [...shrinks].reverse(),
                { scale: 1, duration: TIMING.shrink, ease: TIMING.shrinkEase, stagger: TIMING.shrinkStagger },
                TIMING.move * 0.45,
              )
              .to(
                [...labels].reverse(),
                { autoAlpha: 1, duration: TIMING.fade, ease: "power2.out", stagger: TIMING.shrinkStagger },
                TIMING.move * 0.6,
              );
          });
      };

      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") close.current();
      };
      window.addEventListener("keydown", onKey);

      return () => {
        window.removeEventListener("resize", onResize);
        window.removeEventListener("keydown", onKey);
      };
    },
    { scope: root },
  );

  const meta = [
    { label: "Kunde", value: project.client },
    { label: "Rolle", value: project.role },
    { label: "År", value: project.year },
  ].filter((item) => item.value);

  return (
    <div ref={root} className="preview" role="dialog" aria-labelledby="preview-title">
      <div className="preview-info">
        <button ref={closeButton} type="button" className="preview-close mono" onClick={() => close.current()}>
          <RollText>Luk</RollText>
        </button>

        <div className="preview-text">
          <h2 id="preview-title" className="preview-title preview-split">
            {project.title}
          </h2>
          {project.excerpt && <p className="preview-excerpt preview-split">{project.excerpt}</p>}
          {meta.length > 0 && (
            <dl className="preview-meta mono">
              {meta.map((item) => (
                <div key={item.label}>
                  <dt className="muted preview-split">{item.label}</dt>
                  <dd className="preview-split">{item.value}</dd>
                </div>
              ))}
            </dl>
          )}
          <div className="preview-split">
            <Link href={`/projects/${project.slug}`} className="preview-link mono underline-link">
              Se hele projektet
            </Link>
          </div>
        </div>
      </div>
      <div ref={slot} className="preview-slot" aria-hidden />
    </div>
  );
}

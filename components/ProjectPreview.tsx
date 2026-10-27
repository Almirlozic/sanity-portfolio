"use client";

import { useRef } from "react";

import type { ProjectSummary } from "@/sanity/lib/types";

import { Flip, gsap, SplitText, useGSAP } from "./gsap";
import RollText from "./RollText";
import SanityImage from "./SanityImage";

/*
 * Detaljevisning på forsiden. Det klikkede kort (netop den kopi, man ramte)
 * glider over i .preview-slot med Flip, mens de andre kort fader ud, og
 * projektets info ruller ind linje for linje. "Luk" eller Escape kører det baglæns.
 *
 * Har projektet et galleri, byttes det flyttede billede til sidst ud med en kopi
 * forrest i .preview-track. Så scroller man vandret gennem galleriet: hjulet
 * (op/ned), træk eller piletasterne flytter rækken sidelæns.
 *
 * For enden af rækken står næste projekt. Scroller man videre (eller klikker),
 * glider projektet ud, og det næste glider ind på samme plads.
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
  /** Galleriet scrolles tilbage til coverbilledet, før det glider tilbage. */
  scrollBack: 0.9,
  /** Ved prefers-reduced-motion: kun en kort fade. */
  reducedFade: 0.3,
};

/** Den vandrette scroll i galleriet. */
const GALLERY = {
  /** Hvor blødt rækken følger hjulet (lavere = blødere). */
  ease: 0.09,
  wheelSpeed: 1,
  dragSpeed: 1.4,
  /** Hvor langt piletasterne flytter, i forhold til skærmens bredde. */
  keyStep: 0.4,
  /** Teksten til venstre er væk, når rækken har flyttet sig så stor en del af skærmen. */
  textFade: 0.35,
  /** Hvor langt man skal scrolle forbi enden, før næste projekt åbner (px hjul/træk). */
  nextThreshold: 700,
  /** Sekunder rækken skal have ligget ved enden, før man kan scrolle videre til næste projekt. */
  nextDelay: 0.5,
  /** Hvor meget rækken giver efter, mens man scroller forbi enden (0-1). */
  nextStretch: 0.2,
  /** Skift til næste projekt: det gamle glider ud, det nye ind. */
  switchOut: 0.6,
  switchIn: 1.4,
};

type Props = {
  project: ProjectSummary;
  /** Næste projekt, som står for enden af galleriet. */
  next?: ProjectSummary;
  /** Den .slide, der hører til projektet (den klikkede, eller næste projekts kort). */
  slide: HTMLElement;
  /** "next": vi kommer fra forrige projekt, så billedet sættes direkte på plads i stedet for at flyve ind. */
  from?: "next";
  /** Kaldes, når lukke-animationen er færdig. */
  onClosed: () => void;
  /** Kaldes, når det gamle projekt er gledet ud og det næste skal vises. */
  onNext: () => void;
};

export default function ProjectPreview({ project, next, slide, from, onClosed, onNext }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const slot = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const progress = useRef<HTMLParagraphElement>(null);
  const nextFill = useRef<HTMLSpanElement>(null);
  const goNext = useRef<() => void>(() => {});
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
            Math.abs(a.getBoundingClientRect().left - origin) -
            Math.abs(b.getBoundingClientRect().left - origin),
        );
      const labels = [slide, ...others]
        .map((s) => s.querySelector<HTMLElement>(".slide-label"))
        .filter(Boolean) as HTMLElement[];
      const shrinks = others
        .map((s) => s.querySelector<HTMLElement>(".slide-media"))
        .filter(Boolean) as HTMLElement[];
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
      if (from === "next") {
        // Forrige projekt har allerede gemt de andre kort væk; billedet sættes direkte på plads,
        // og galleriet glider ind fra højre (se showGallery nedenfor).
        gsap.set(shrinks, { scale: 0 });
        gsap.set(labels, { autoAlpha: 0 });
        gsap.set(inner, { scale: 1 });
        gsap.set(image, { xPercent: 0 });
        gsap.set(media, { scale: 1, autoAlpha: 0 });
        fit();
        open = gsap.timeline().set(el, { autoAlpha: 1 });
        if (!reduceMotion) {
          open.from(
            lines,
            {
              yPercent: 110,
              duration: TIMING.text,
              ease: TIMING.textEase,
              stagger: TIMING.textStagger,
            },
            0.2,
          );
        }
      } else if (reduceMotion) {
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
          .to(
            shrinks,
            {
              scale: 0,
              duration: TIMING.shrink,
              ease: TIMING.shrinkEase,
              stagger: TIMING.shrinkStagger,
            },
            0,
          )
          .to(
            labels,
            {
              autoAlpha: 0,
              duration: TIMING.fade,
              ease: "power2.out",
              stagger: TIMING.shrinkStagger,
            },
            0,
          )
          .to(inner, { scale: 1, duration: TIMING.move, ease: TIMING.moveEase }, 0)
          .to(image, { xPercent: 0, duration: TIMING.move, ease: TIMING.moveEase }, 0)
          .add(fit(TIMING.move) ?? [], 0.15)
          .from(
            lines,
            {
              yPercent: 110,
              duration: TIMING.text,
              ease: TIMING.textEase,
              stagger: TIMING.textStagger,
            },
            "-=0.5",
          )
          .from(
            closeButton.current,
            { autoAlpha: 0, duration: TIMING.fade, ease: "power2.out" },
            "<",
          );
      }
      open.add(() => closeButton.current?.focus({ preventScroll: true }));

      // ---------- Galleri: vandret scroll ----------
      const row = track.current;
      const text = el.querySelector<HTMLElement>(".preview-text");
      const scroll = { current: 0, target: 0, max: 0 };
      // Hvor langt man har scrollet forbi enden mod næste projekt (og den viste, bløde værdi).
      const over = { value: 0, shown: 0, lastInput: 0, atEndSince: 0 };
      let galleryOn = false;
      // På desktop står teksten til venstre for billedet og glider ud med rækken. På mobil står den under.
      let textBeside = false;

      // Rækken lægges, så kopien af coverbilledet ligger præcis, hvor billedet blev flyttet hen.
      const layout = () => {
        if (!row) return;
        const r = target.getBoundingClientRect();
        gsap.set(row, { top: r.top, height: r.height, paddingLeft: r.left });
        gsap.set(row.firstElementChild, { width: r.width });
        textBeside = r.left > window.innerWidth / 2;
        // Procenten står under billedet: i venstre side på desktop, i højre side på mobil (så den ikke rammer "Luk").
        gsap.set(progress.current, {
          top: r.bottom + 12,
          left: textBeside ? r.left : "auto",
          right: textBeside ? "auto" : window.innerWidth - r.right,
        });
        if (!textBeside) gsap.set(text, { clearProps: "transform,opacity" });
        // Sidste billede ender ved samme højre kant som coverbilledet.
        scroll.max = Math.max(0, row.scrollWidth - r.right);
        scroll.target = gsap.utils.clamp(0, scroll.max, scroll.target);
      };

      const render = () => {
        gsap.set(row, { x: -(scroll.current + over.shown * GALLERY.nextStretch) });
        gsap.set(nextFill.current, { scaleX: over.shown / GALLERY.nextThreshold });
        if (textBeside) {
          gsap.set(text, {
            x: -scroll.current,
            opacity:
              1 - gsap.utils.clamp(0, 1, scroll.current / (window.innerWidth * GALLERY.textFade)),
          });
        }
        if (progress.current) {
          progress.current.textContent = `${Math.round(scroll.max ? (scroll.current / scroll.max) * 100 : 0)}%`;
        }
      };
      const tick = (_time: number, deltaTime: number) => {
        if (!galleryOn) return;
        const ratio = deltaTime / (1000 / 60);
        scroll.current += (scroll.target - scroll.current) * Math.min(1, GALLERY.ease * ratio);
        if (Math.abs(scroll.target - scroll.current) < 0.1) scroll.current = scroll.target;
        if (scroll.current < scroll.max - 1) over.atEndSince = 0;
        else if (!over.atEndSince) over.atEndSince = performance.now();
        // Slipper man, før stregen er fuld, glider den tilbage.
        if (performance.now() - over.lastInput > 200) over.value *= Math.pow(0.88, ratio);
        if (over.value < 0.5) over.value = 0;
        over.shown += (over.value - over.shown) * Math.min(1, 0.2 * ratio);
        render();
      };
      gsap.ticker.add(tick);

      const scrollBy = (delta: number) => {
        // For enden: scroll videre fylder stregen mod næste projekt i stedet for at flytte rækken.
        if (next && delta > 0 && scroll.target >= scroll.max - 1) {
          // Først når rækken har ligget stille ved enden lidt, så et hurtigt scroll ikke springer et projekt over.
          if (!over.atEndSince || performance.now() - over.atEndSince < GALLERY.nextDelay * 1000)
            return;
          over.lastInput = performance.now();
          over.value = Math.min(GALLERY.nextThreshold, over.value + delta);
          if (over.value >= GALLERY.nextThreshold) goNext.current();
          return;
        }
        if (delta < 0 && over.value > 0) {
          over.value = Math.max(0, over.value + delta);
          return;
        }
        scroll.target = gsap.utils.clamp(0, scroll.max, scroll.target + delta);
      };
      const onWheel = (e: WheelEvent) => {
        if (!galleryOn) return;
        e.preventDefault();
        const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
        const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        scrollBy(delta * unit * GALLERY.wheelSpeed);
      };
      const drag = { active: false, lastX: 0, moved: 0 };
      const onPointerDown = (e: PointerEvent) => {
        if (!galleryOn || e.button !== 0) return;
        drag.active = true;
        drag.lastX = e.clientX;
        drag.moved = 0;
      };
      const onPointerMove = (e: PointerEvent) => {
        if (!drag.active) return;
        scrollBy((drag.lastX - e.clientX) * GALLERY.dragSpeed);
        drag.moved += Math.abs(drag.lastX - e.clientX);
        drag.lastX = e.clientX;
      };
      const onPointerUp = () => {
        drag.active = false;
      };
      window.addEventListener("wheel", onWheel, { passive: false });
      row?.addEventListener("pointerdown", onPointerDown);
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerUp);

      // Byt mellem det flyttede billede og kopien forrest i rækken (de ligger præcis samme sted).
      const showGallery = (show: boolean) => {
        if (!scroller.current) return;
        if (show) layout();
        galleryOn = show;
        gsap.set(scroller.current, { autoAlpha: show ? 1 : 0 });
        gsap.set(media, { autoAlpha: show ? 0 : 1 });
      };
      if (from === "next") {
        showGallery(true);
        // Ingen scroll, før det nye projekt er gledet ind (ellers fortsætter hjulets fart herinde).
        galleryOn = false;
        open.add(
          () => {
            galleryOn = true;
          },
          reduceMotion ? 0 : GALLERY.switchIn * 0.6,
        );
        if (!reduceMotion) {
          open.from(
            scroller.current,
            {
              x: window.innerWidth * 0.3,
              opacity: 0,
              duration: GALLERY.switchIn,
              ease: "expo.out",
            },
            0,
          );
        }
      } else if (scroller.current) {
        open.add(() => showGallery(true), reduceMotion ? ">" : 0.15 + TIMING.move);
      }

      // Hold billedet på plads, hvis vinduet ændrer størrelse.
      let closing = false;
      const onResize = () => {
        if (closing || open.isActive()) return;
        fit();
        if (galleryOn) layout();
      };
      window.addEventListener("resize", onResize);

      // ---------- Luk ----------
      const finish = () => {
        gsap.set(media, { clearProps: "all" });
        gsap.set(slide, { clearProps: "zIndex,height" });
        gsap.set(labels, { clearProps: "opacity,visibility" });
        gsap.set(shrinks, { clearProps: "all" });
        gsap.set(text, { clearProps: "transform,opacity" });
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

      // ---------- Næste projekt ----------
      goNext.current = () => {
        // Et klik efter et træk tæller ikke.
        if (closing || !next || drag.moved > 6) return;
        closing = true;
        galleryOn = false;
        drag.active = false;
        open.kill();
        const out = gsap.timeline({ onComplete: onNext });
        if (reduceMotion) {
          out.to([scroller.current, text], {
            autoAlpha: 0,
            duration: TIMING.reducedFade,
            ease: "none",
          });
          return;
        }
        out
          .to(
            scroller.current,
            {
              x: -window.innerWidth * 0.3,
              opacity: 0,
              duration: GALLERY.switchOut,
              ease: "power3.in",
            },
            0,
          )
          .to(
            lines,
            {
              yPercent: 110,
              duration: GALLERY.switchOut,
              ease: TIMING.textOutEase,
              stagger: { each: TIMING.textStagger / 2, from: "end" },
            },
            0,
          );
      };

      close.current = () => {
        if (closing) return;
        closing = true;
        open.kill();

        // Scroll galleriet tilbage til coverbilledet, før det glider tilbage.
        galleryOn = false;
        drag.active = false;
        if (scroll.current > 1 && !reduceMotion) {
          gsap.to(scroll, {
            current: 0,
            target: 0,
            duration: TIMING.scrollBack,
            ease: "power3.inOut",
            onUpdate: render,
            onComplete: () => {
              showGallery(false);
              closeAnimated();
            },
          });
          return;
        }
        scroll.current = scroll.target = 0;
        render();
        showGallery(false);

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
        closeAnimated();
      };

      const closeAnimated = () => {
        gsap
          .timeline()
          .to(
            closeButton.current,
            { autoAlpha: 0, duration: TIMING.textOut, ease: "power2.out" },
            0,
          )
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
                {
                  scale: 1,
                  duration: TIMING.shrink,
                  ease: TIMING.shrinkEase,
                  stagger: TIMING.shrinkStagger,
                },
                TIMING.move * 0.45,
              )
              .to(
                [...labels].reverse(),
                {
                  autoAlpha: 1,
                  duration: TIMING.fade,
                  ease: "power2.out",
                  stagger: TIMING.shrinkStagger,
                },
                TIMING.move * 0.6,
              );
          });
      };

      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") close.current();
        if (!galleryOn) return;
        if (e.key === "ArrowRight") scrollBy(window.innerWidth * GALLERY.keyStep);
        if (e.key === "ArrowLeft") scrollBy(-window.innerWidth * GALLERY.keyStep);
      };
      window.addEventListener("keydown", onKey);

      return () => {
        gsap.ticker.remove(tick);
        window.removeEventListener("resize", onResize);
        window.removeEventListener("keydown", onKey);
        window.removeEventListener("wheel", onWheel);
        row?.removeEventListener("pointerdown", onPointerDown);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointercancel", onPointerUp);
      };
    },
    { scope: root },
  );

  const meta = [
    { label: "Client", value: project.client },
    { label: "Role", value: project.role },
    { label: "Year", value: project.year },
  ].filter((item) => item.value);

  return (
    <div ref={root} className="preview" role="dialog" aria-labelledby="preview-title">
      <div className="preview-info">
        <button
          ref={closeButton}
          type="button"
          className="preview-close mono"
          onClick={() => close.current()}
        >
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
        </div>
      </div>
      <div ref={slot} className="preview-slot" aria-hidden />
      {project.coverImage && (project.gallery?.length || next) && (
        <div ref={scroller} className="preview-scroll" data-lenis-prevent>
          <div ref={track} className="preview-track">
            <div className="preview-cover" aria-hidden>
              <div className="preview-cover-img">
                <SanityImage image={project.coverImage} sizes="(min-width: 768px) 50vw, 100vw" />
              </div>
            </div>
            {project.gallery?.map((image, i) => (
              <div
                key={image._key ?? i}
                className="preview-gallery-item"
                style={{ aspectRatio: image.asset?.metadata?.dimensions?.aspectRatio ?? 4 / 3 }}
              >
                <SanityImage image={image} sizes="(min-width: 768px) 70vw, 100vw" />
              </div>
            ))}
            {next && (
              <button type="button" className="preview-next" onClick={() => goNext.current()}>
                <span className="mono muted">Next project</span>
                <span className="preview-next-title">{next.title}</span>
                <span className="preview-next-hint mono">
                  Keep scrolling
                  <span className="preview-next-bar">
                    <span ref={nextFill} className="preview-next-fill" />
                  </span>
                </span>
              </button>
            )}
          </div>
          <p ref={progress} className="preview-progress mono muted" aria-hidden>
            0%
          </p>
        </div>
      )}
    </div>
  );
}

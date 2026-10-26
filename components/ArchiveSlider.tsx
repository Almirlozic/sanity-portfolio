"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import type { ProjectSummary } from "@/sanity/lib/types";

import { gsap, useGSAP } from "./gsap";
import ProjectPreview from "./ProjectPreview";
import RollText from "./RollText";
import SanityImage from "./SanityImage";

/*
 * Forsidens uendelige, horisontale række af projekter.
 * Scroll, træk eller brug piletasterne. Kortene trækker sig lidt sammen,
 * mens de bevæger sig, og billederne glider en smule inde i rammen.
 *
 * Justér udtrykket her:
 */
const SETTINGS = {
  /** Hvor hurtigt rækken følger efter (0-1, højere = mere direkte). */
  ease: 0.085,
  wheelSpeed: 1,
  dragSpeed: 1.4,
  /** Hvor langt rækken glider videre, når man slipper efter et træk. */
  throwStrength: 12,
  /** Hvor meget kortene skrumper ved høj fart (0.06 = 6 %). */
  squeeze: 0.06,
  /** Hvor meget billedet glider inde i rammen (i %). */
  parallax: 7,
};

/** Mindst så mange kort i rækken, så den altid kan fylde skærmen og køre i ring. */
const MIN_SLIDES = 10;

export default function ArchiveSlider({ projects }: { projects: ProjectSummary[] }) {
  const root = useRef<HTMLDivElement>(null);
  const cursor = useRef<HTMLDivElement>(null);
  // Mens detaljevisningen er åben, står rækken stille og ignorerer input.
  const paused = useRef(false);
  const [preview, setPreview] = useState<{ project: ProjectSummary; slide: HTMLElement } | null>(null);

  const copies = Math.max(1, Math.ceil(MIN_SLIDES / projects.length));
  const slides = Array.from({ length: projects.length * copies }, (_, i) => ({
    project: projects[i % projects.length],
    index: i,
    // Kun det første sæt er synligt for skærmlæsere; kopierne er pynt.
    isCopy: i >= projects.length,
  }));

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const items = gsap.utils.toArray<HTMLElement>(".slide", el);
      const inners = gsap.utils.toArray<HTMLElement>(".slide-inner", el);
      const images = gsap.utils.toArray<HTMLElement>(".slide-img", el);
      if (items.length === 0) return;

      // ---------- Mål ----------
      let viewW = 0;
      let step = 0;
      let total = 0;
      const measure = () => {
        const oldStep = step;
        viewW = el.clientWidth;
        const gap = parseFloat(getComputedStyle(el).getPropertyValue("--gap")) || 8;
        step = items[0].offsetWidth + gap;
        total = step * items.length;
        // Behold positionen, når størrelsen ændrer sig.
        if (oldStep > 0) {
          state.current *= step / oldStep;
          state.target *= step / oldStep;
        }
      };

      const state = { current: 0, target: 0, previous: 0, velocity: 0 };
      measure();

      const setX = items.map((item) => gsap.quickSetter(item, "x", "px"));
      const setScale = inners.map((inner) => gsap.quickSetter(inner, "scale"));
      const setShift = images.map((image) => gsap.quickSetter(image, "xPercent"));

      // ---------- Intro: kortene glider ind fra højre ----------
      const intro = items.map(() => ({ x: reduceMotion ? 0 : viewW * 1.1 }));
      if (!reduceMotion) {
        gsap.to(intro, { x: 0, duration: 1.8, ease: "expo.out", stagger: 0.07, delay: 0.15 });
        gsap.from(images, { scale: 1.45, duration: 2, ease: "expo.out", stagger: 0.07, delay: 0.15 });
        // Den ydre .roll animeres, så .roll-inner er fri til hover-rulningen.
        gsap.from(".slide-label .roll", {
          yPercent: 110,
          duration: 1.2,
          ease: "expo.out",
          stagger: 0.07,
          delay: 0.6,
        });
      }

      // ---------- Animationsløkke ----------
      let isMoving = false;
      const tick = (_time: number, deltaTime: number) => {
        if (paused.current) return;
        const ratio = deltaTime / (1000 / 60);
        state.current += (state.target - state.current) * Math.min(1, SETTINGS.ease * ratio);
        const delta = state.current - state.previous;
        state.previous = state.current;
        state.velocity += (delta - state.velocity) * 0.12;

        const wrap = gsap.utils.wrap(-step, total - step);
        const speed = reduceMotion ? 0 : Math.min(Math.abs(state.velocity) / 40, 1);
        const scale = 1 - speed * SETTINGS.squeeze;
        // Mens rækken bevæger sig, slås hover-effekten fra.
        const moving = Math.abs(state.velocity) > 0.6;
        if (moving !== isMoving) {
          isMoving = moving;
          el.classList.toggle("is-moving", moving);
        }
        for (let i = 0; i < items.length; i++) {
          const x = wrap(i * step - state.current) + intro[i].x;
          setX[i](x);
          setScale[i](scale);
          if (!reduceMotion) {
            // Billedet glider modsat bevægelsen, afhængigt af hvor på skærmen kortet er.
            const fromCenter = (x + step / 2 - viewW / 2) / viewW;
            setShift[i](-fromCenter * SETTINGS.parallax);
          }
        }
      };
      gsap.ticker.add(tick);

      // ---------- Input ----------
      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        if (paused.current) return;
        const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? el.clientHeight : 1;
        const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        state.target += delta * unit * SETTINGS.wheelSpeed;
      };

      const drag = { active: false, startX: 0, lastX: 0, delta: 0, moved: 0 };
      const onPointerDown = (e: PointerEvent) => {
        if (e.button !== 0 || paused.current) return;
        drag.active = true;
        drag.startX = drag.lastX = e.clientX;
        drag.delta = 0;
        drag.moved = 0;
        el.classList.add("is-pressed");
      };
      const onPointerMove = (e: PointerEvent) => {
        cursorTo(e.clientX, e.clientY);
        // Vis "Træk" kun, når musen er over rækken (ikke over menuen).
        const over = !paused.current && (drag.active || el.contains(e.target as Node));
        if (over !== cursorVisible) {
          cursorVisible = over;
          if (over) showCursor();
          else hideCursor();
        }
        if (!drag.active) return;
        const dx = e.clientX - drag.lastX;
        drag.lastX = e.clientX;
        drag.delta = dx;
        drag.moved = Math.max(drag.moved, Math.abs(e.clientX - drag.startX));
        if (drag.moved > 4) el.classList.add("is-dragging");
        state.target -= dx * SETTINGS.dragSpeed;
      };
      const onPointerUp = () => {
        if (!drag.active) return;
        drag.active = false;
        el.classList.remove("is-pressed", "is-dragging");
        if (drag.moved > 4) state.target -= drag.delta * SETTINGS.throwStrength;
      };
      // Et træk må ikke tælle som et klik på et projekt.
      const onClickCapture = (e: MouseEvent) => {
        if (drag.moved > 6) {
          e.preventDefault();
          e.stopPropagation();
        }
      };
      const onKey = (e: KeyboardEvent) => {
        if (paused.current) return;
        if (e.key === "ArrowRight") state.target = Math.round(state.target / step + 1) * step;
        if (e.key === "ArrowLeft") state.target = Math.round(state.target / step - 1) * step;
      };

      // ---------- "Træk"-cursor ----------
      const xTo = cursor.current ? gsap.quickTo(cursor.current, "x", { duration: 0.5, ease: "power3" }) : null;
      const yTo = cursor.current ? gsap.quickTo(cursor.current, "y", { duration: 0.5, ease: "power3" }) : null;
      const cursorTo = (x: number, y: number) => {
        xTo?.(x);
        yTo?.(y);
      };
      let cursorVisible = false;
      const showCursor = () => gsap.to(cursor.current, { autoAlpha: 1, scale: 1, duration: 0.4, ease: "power3.out" });
      const hideCursor = () => gsap.to(cursor.current, { autoAlpha: 0, scale: 0.5, duration: 0.3, ease: "power3.out" });

      el.addEventListener("wheel", onWheel, { passive: false });
      el.addEventListener("pointerdown", onPointerDown);
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerUp);
      el.addEventListener("click", onClickCapture, true);
      const onLeaveWindow = () => {
        cursorVisible = false;
        hideCursor();
      };
      document.documentElement.addEventListener("pointerleave", onLeaveWindow);
      window.addEventListener("keydown", onKey);

      const resizeObserver = new ResizeObserver(measure);
      resizeObserver.observe(el);

      return () => {
        gsap.ticker.remove(tick);
        resizeObserver.disconnect();
        el.removeEventListener("wheel", onWheel);
        el.removeEventListener("pointerdown", onPointerDown);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointercancel", onPointerUp);
        el.removeEventListener("click", onClickCapture, true);
        document.documentElement.removeEventListener("pointerleave", onLeaveWindow);
        window.removeEventListener("keydown", onKey);
      };
    },
    { scope: root, dependencies: [projects.length] },
  );

  // Et rigtigt klik åbner detaljevisningen på samme side. Træk er allerede
  // fanget af onClickCapture, og cmd/ctrl-klik åbner stadig linket i en ny fane.
  const openPreview = (e: React.MouseEvent<HTMLAnchorElement>, project: ProjectSummary) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    const slide = e.currentTarget.closest<HTMLElement>(".slide");
    if (paused.current || !slide) return;
    paused.current = true;
    gsap.to(cursor.current, { autoAlpha: 0, scale: 0.5, duration: 0.3, ease: "power3.out", overwrite: true });
    setPreview({ project, slide });
  };

  const closePreview = () => {
    paused.current = false;
    setPreview(null);
  };

  return (
    <>
      <div ref={root} className="archive" data-lenis-prevent data-preview={preview ? "" : undefined}>
        <ul className="archive-track">
          {slides.map(({ project, index, isCopy }) => (
            <li key={index} className="slide" aria-hidden={isCopy || undefined}>
              <Link
                href={`/projects/${project.slug}`}
                className="slide-link"
                draggable={false}
                onClick={(e) => openPreview(e, project)}
                tabIndex={isCopy ? -1 : undefined}
              >
                <p className="slide-label">
                  <RollText>{project.title}</RollText>
                </p>
                <div className="slide-media">
                  <div className="slide-inner">
                    <div className="slide-img">
                      {project.coverImage && (
                        <SanityImage
                          image={project.coverImage}
                          sizes="(min-width: 768px) 30vw, 75vw"
                          priority={index < 4}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
        <div ref={cursor} className="drag-cursor" aria-hidden />
      </div>
      {preview && <ProjectPreview project={preview.project} slide={preview.slide} onClosed={closePreview} />}
    </>
  );
}

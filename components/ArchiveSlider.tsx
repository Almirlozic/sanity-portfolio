"use client";

import { useLayoutEffect, useRef, useState } from "react";

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

/*
 * Intro: kortene starter som en lille bunke midt på skærmen, bladres igennem ét
 * efter ét (som når man tæller kort), og deles så ud til deres pladser i rækken.
 */
const INTRO = {
  /** Bunkens størrelse i forhold til kortene (0.42 = 42 %), først og lige før de deles ud. */
  stackScale: 0.42,
  stackGrow: 0.6,
  /** Hvert kort tørres ind nedefra: starter roligt og slutter hurtigt. */
  flipEase: "power3.in",
  /** De første kort bladres langsomt, så man kan nå at se dem … */
  flipSlowCount: 2,
  flipSlow: 1,
  flipSlowStagger: 0.7,
  /** … resten går hurtigt. */
  flip: 0.55,
  flipStagger: 0.17,
  /** Kortene deles ud til rækken. */
  deal: 1.4,
  dealEase: "expo.inOut",
  dealStagger: 0.08,
};

/** Mindst så mange kort i rækken, så den altid kan fylde skærmen og køre i ring. */
const MIN_SLIDES = 10;

/** Slår "Open project"-tilstanden på den fælles cursor til og fra. */
const setCursorProject = (on: boolean) => {
  if (on) document.documentElement.dataset.cursor = "project";
  else delete document.documentElement.dataset.cursor;
};

export default function ArchiveSlider({ projects }: { projects: ProjectSummary[] }) {
  const root = useRef<HTMLDivElement>(null);
  // Mens detaljevisningen er åben, står rækken stille og ignorerer input.
  const paused = useRef(false);
  const [preview, setPreview] = useState<{
    project: ProjectSummary;
    slide: HTMLElement;
    /** "next": kom fra forrige projekt (scroll videre), så kortet ikke skal flyve ind fra rækken. */
    from?: "next";
  } | null>(null);

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
          const x = wrap(i * step - state.current);
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

      // ---------- Intro ----------
      let introPlaying = false;
      if (!reduceMotion) {
        // Placér kortene på deres pladser, så vi kan måle, hvor de skal ende.
        tick(0, 1000 / 60);
        const medias = items.map((item) => item.querySelector<HTMLElement>(".slide-media")!);
        const viewH = el.clientHeight;
        // Kun kortene, der er på skærmen, er med i bunken.
        const dealt = medias
          .map((media, i) => ({ media, item: items[i], rect: media.getBoundingClientRect() }))
          .filter(({ rect }) => rect.left >= 0 && rect.left < viewW);

        if (dealt.length > 0) {
          introPlaying = true;
          el.dataset.intro = "";
          const toCenter = ({ rect }: (typeof dealt)[number]) => ({
            x: viewW / 2 - (rect.left + rect.width / 2),
            y: viewH / 2 - (rect.top + rect.height / 2),
          });
          // Det første kort ligger øverst i bunken.
          dealt.forEach(({ item }, i) => gsap.set(item, { zIndex: dealt.length - i }));
          dealt.forEach((card) => {
            gsap.set(card.media, { ...toCenter(card), scale: INTRO.stackScale, clipPath: "inset(100% 0% 0% 0%)" });
          });
          gsap.set(".slide-label .roll", { yPercent: 110 });
          // Kort uden for bunken (fx stumpen i venstre kant) venter, til de andre er delt ud.
          const rest = medias.filter((media) => !dealt.some((c) => c.media === media));
          gsap.set(rest, { autoAlpha: 0 });

          const tl = gsap.timeline({
            delay: 0.2,
            onComplete: () => {
              gsap.set(medias, { clearProps: "transform,clipPath,opacity,visibility" });
              gsap.set(items, { clearProps: "zIndex" });
              delete el.dataset.intro;
              introPlaying = false;
            },
          });
          // 1. Bladr bunken igennem bagfra, så det første kort lander øverst til sidst.
          const counted = [...dealt].reverse();
          let flipAt = 0;
          let flipEnd = 0;
          counted.forEach(({ media }, i) => {
            const slow = i < INTRO.flipSlowCount;
            const duration = slow ? INTRO.flipSlow : INTRO.flip;
            tl.to(media, { clipPath: "inset(0% 0% 0% 0%)", duration, ease: INTRO.flipEase }, flipAt);
            flipEnd = Math.max(flipEnd, flipAt + duration);
            flipAt += slow ? INTRO.flipSlowStagger : INTRO.flipStagger;
          });
          tl.to(
            dealt.map((c) => c.media),
            { scale: INTRO.stackGrow, duration: flipEnd, ease: "power2.inOut" },
            0,
          );
          // 2. Del kortene ud til rækken, det første kort først.
          tl.to(
            dealt.map((c) => c.media),
            { x: 0, y: 0, scale: 1, duration: INTRO.deal, ease: INTRO.dealEase, stagger: INTRO.dealStagger },
            flipEnd,
          );
          tl.to(rest, { autoAlpha: 1, duration: 0.6, ease: "power2.out" }, flipEnd + INTRO.deal * 0.6);
          tl.from(images, { scale: 1.45, duration: INTRO.deal + 0.6, ease: "expo.out" }, flipEnd + 0.2);
          // 3. Titlerne ruller op. Den ydre .roll animeres, så .roll-inner er fri til hover-rulningen.
          tl.to(
            ".slide-label .roll",
            { yPercent: 0, duration: 1.2, ease: "expo.out", stagger: 0.07 },
            flipEnd + INTRO.deal * 0.7,
          );
        }
      }

      // ---------- Input ----------
      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        if (paused.current || introPlaying) return;
        const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? el.clientHeight : 1;
        const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        state.target += delta * unit * SETTINGS.wheelSpeed;
      };

      const drag = { active: false, startX: 0, lastX: 0, delta: 0, moved: 0 };
      const onPointerDown = (e: PointerEvent) => {
        if (e.button !== 0 || paused.current || introPlaying) return;
        drag.active = true;
        drag.startX = drag.lastX = e.clientX;
        drag.delta = 0;
        drag.moved = 0;
        el.classList.add("is-pressed");
      };
      const onPointerMove = (e: PointerEvent) => {
        // Over et projekt bliver den fælles cursor større og viser "Open project" (SiteCursor).
        const onProject =
          !paused.current && !drag.active && !!(e.target as Element).closest?.(".slide-link");
        setCursorProject(onProject);
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
        if (paused.current || introPlaying) return;
        if (e.key === "ArrowRight") state.target = Math.round(state.target / step + 1) * step;
        if (e.key === "ArrowLeft") state.target = Math.round(state.target / step - 1) * step;
      };

      el.addEventListener("wheel", onWheel, { passive: false });
      el.addEventListener("pointerdown", onPointerDown);
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerUp);
      el.addEventListener("click", onClickCapture, true);
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
        setCursorProject(false);
        window.removeEventListener("keydown", onKey);
      };
    },
    { scope: root, dependencies: [projects.length] },
  );

  // Et klik åbner detaljevisningen. Træk er allerede fanget af onClickCapture.
  const openPreview = (e: React.MouseEvent<HTMLButtonElement>, project: ProjectSummary) => {
    const slide = e.currentTarget.closest<HTMLElement>(".slide");
    // Vent, til introen er færdig.
    if (paused.current || !slide || root.current?.hasAttribute("data-intro")) return;
    paused.current = true;
    setCursorProject(false);
    setPreview({ project, slide });
  };

  const closePreview = () => {
    paused.current = false;
    setPreview(null);
  };

  // Når detaljevisningen er lukket, ryddes kortene helt, også efter skift mellem flere projekter.
  // (Ikke ved første visning, hvor introen styrer kortene.)
  const hadPreview = useRef(false);
  useLayoutEffect(() => {
    if (preview) hadPreview.current = true;
    if (preview || !hadPreview.current || !root.current) return;
    gsap.set(root.current.querySelectorAll(".slide-media, .slide-label"), { clearProps: "all" });
  }, [preview]);

  // Næste projekt i rækkefølgen (forfra efter det sidste).
  const nextProject = (project: ProjectSummary) => {
    if (projects.length < 2) return undefined;
    const i = projects.findIndex((p) => p._id === project._id);
    return projects[(i + 1) % projects.length];
  };

  // Skift til næste projekt: brug det af dets kort, der ligger tættest på det nuværende.
  const showNext = () => {
    if (!preview) return;
    const next = nextProject(preview.project);
    const el = root.current;
    if (!next || !el) return;
    const origin = preview.slide.getBoundingClientRect().left;
    const slide = gsap.utils
      .toArray<HTMLElement>(`.slide[data-project="${next._id}"]`, el)
      .sort(
        (a, b) =>
          Math.abs(a.getBoundingClientRect().left - origin) - Math.abs(b.getBoundingClientRect().left - origin),
      )[0];
    if (slide) setPreview({ project: next, slide, from: "next" });
  };

  return (
    <>
      <div ref={root} className="archive" data-lenis-prevent data-preview={preview ? "" : undefined}>
        <ul className="archive-track">
          {slides.map(({ project, index, isCopy }) => (
            <li key={index} className="slide" data-project={project._id} aria-hidden={isCopy || undefined}>
              <button
                type="button"
                className="slide-link"
                onClick={(e) => openPreview(e, project)}
                tabIndex={isCopy ? -1 : undefined}
              >
                <span className="slide-label">
                  <RollText>{project.title}</RollText>
                </span>
                <span className="slide-media">
                  <span className="slide-inner">
                    <span className="slide-img">
                      {project.coverImage && (
                        <SanityImage
                          image={project.coverImage}
                          sizes="(min-width: 768px) 30vw, 75vw"
                          priority={index < 4}
                        />
                      )}
                    </span>
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      {preview && (
        <ProjectPreview
          key={preview.project._id}
          project={preview.project}
          next={nextProject(preview.project)}
          slide={preview.slide}
          from={preview.from}
          onClosed={closePreview}
          onNext={showNext}
        />
      )}
    </>
  );
}

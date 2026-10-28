"use client";

import { useEffect, useRef, useState } from "react";

import type { About, ProjectSummary } from "@/sanity/lib/types";

import { gsap } from "./gsap";
import AboutPanel from "./AboutPanel";
import ArchivePanel from "./ArchivePanel";
import { useLenis } from "./SmoothScroll";

/*
 * Menuen: den side, man står på, krymper langsomt ind i en boks, og "archive"
 * og "about" glider ind ved siden af. Klik på en boks, og den zoomer op til fuld skærm.
 *
 * Skærm 0 er selve siden (<main className="stage">), 1 og 2 er panelerne herunder.
 * Hver skærm er altid på størrelse med vinduet; i menuen skaleres og klippes den ind i sin boks.
 *
 * Justér varighed og easing her:
 */
const TIMING = {
  /** Siden krymper ind i sin boks. */
  shrink: 1.6,
  shrinkEase: "expo.inOut",
  /** De andre bokse glider ind. */
  boxesIn: 1.4,
  boxesEase: "expo.out",
  boxesStagger: 0.12,
  /** Titlerne ("cases", "archive", "about") ruller op. */
  title: 1.2,
  titleStagger: 0.08,
  /** Den valgte boks zoomer op til fuld skærm. */
  zoom: 1.4,
  zoomEase: "expo.inOut",
  /** De andre bokse og titler forsvinder, når man vælger. */
  out: 0.5,
  /** Klik på navnet fra archive/about: panelet glider op og viser forsiden. */
  home: 1.2,
  homeEase: "expo.inOut",
  /** Ved prefers-reduced-motion: kun en kort fade. */
  reducedFade: 0.3,
};

const SCREENS = ["cases", "archive", "about"];

type Props = {
  open: boolean;
  onClose: () => void;
  /** Ændres ved sideskift / klik på navnet: tilbage til forsiden. */
  resetKey: string;
  projects: ProjectSummary[];
  about: About;
};

export default function SiteMenu({ open, onClose, resetKey, projects, about }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const panels = useRef<(HTMLElement | null)[]>([]);
  const boxes = useRef<(HTMLButtonElement | null)[]>([]);
  const [current, setCurrent] = useState(0);
  const lenis = useLenis();
  const state = useRef({
    current: 0,
    shown: false,
    locked: false,
    savedY: 0,
    tl: null as gsap.core.Timeline | null,
  });

  // Sideskift eller klik på navnet: tilbage til forsiden.
  // Står man på archive eller about, glider panelet op og væk. Er menuen åben,
  // zoomer forsidens boks op. Ellers nulstilles alt med det samme.
  // Skal ligge før effekten nedenfor, så den kører først.
  useEffect(() => {
    const s = state.current;
    const stage = document.querySelector<HTMLElement>(".stage");
    if (s.current === 0 && !s.shown && !s.locked) return;

    // Menuen er åben: vælg forsiden, så menuen zoomer "cases" op (effekten nedenfor
    // kører bagefter, fordi menuen samtidig lukkes).
    if (s.shown) {
      s.current = 0;
      return;
    }

    const panel = panels.current[s.current];
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (panel && !s.shown && !s.tl?.isActive() && !reduceMotion) {
      const finish = () => {
        gsap.set(panel, { clearProps: "clipPath,visibility,zIndex" });
        gsap.set(panel.firstElementChild, { clearProps: "transform" });
        document.documentElement.style.overflow = "";
        lenis?.start();
        s.current = 0;
        setCurrent(0);
      };
      s.tl = gsap
        .timeline({ onComplete: finish })
        .fromTo(
          panel,
          { clipPath: "inset(0% 0% 0% 0%)" },
          { clipPath: "inset(0% 0% 100% 0%)", duration: TIMING.home, ease: TIMING.homeEase },
        )
        .to(panel.firstElementChild, { yPercent: -15, duration: TIMING.home, ease: TIMING.homeEase }, 0);
      return;
    }

    s.tl?.kill();
    gsap.set([stage, ...panels.current].filter(Boolean), {
      clearProps: "transform,transformOrigin,clipPath,opacity,visibility,zIndex,position,top,left,width",
    });
    gsap.set(root.current, { autoAlpha: 0 });
    gsap.set("[data-menu-hide]", { clearProps: "opacity,visibility" });
    const site = document.querySelector<HTMLElement>(".site");
    if (site) delete site.dataset.menu;
    document.documentElement.style.overflow = "";
    lenis?.start();
    s.shown = false;
    s.locked = false;
    s.current = 0;
    setCurrent(0);
  }, [resetKey, lenis]);

  useEffect(() => {
    const s = state.current;
    const site = document.querySelector<HTMLElement>(".site");
    const stage = document.querySelector<HTMLElement>(".stage");
    const menu = root.current;
    if (!site || !stage || !menu) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const screens = [stage, panels.current[1], panels.current[2]].filter(Boolean) as HTMLElement[];
    const titles = gsap.utils.toArray<HTMLElement>(".menu-title > span", menu);
    // Skærmenes egne titler, som skjules, mens boksene viser menuens titler.
    const ownTitles = screens.map((el) => el.querySelector<HTMLElement>("[data-menu-hide]"));
    const allOwnTitles = ownTitles.filter(Boolean) as HTMLElement[];

    // Hvor langt siden er scrollet (kun skærm 0 kan scrolles).
    const offsetY = (i: number) => (i === 0 ? s.savedY : 0);

    // Transform og clip-path, der viser vinduets udsnit af skærmen inde i boksen
    // (eller i fuld størrelse uden boks). Udsnittet holdes fast i nederste venstre hjørne.
    const fitVars = (i: number, box?: DOMRect) => {
      const el = screens[i];
      const vw = document.documentElement.clientWidth;
      const vh = window.innerHeight;
      const oy = offsetY(i);
      const scale = box ? Math.max(box.width / vw, box.height / vh) : 1;
      const w = box ? box.width / scale : vw;
      const h = box ? box.height / scale : vh;
      const top = oy + vh - h;
      const right = Math.max(0, el.offsetWidth - w);
      const bottom = Math.max(0, el.offsetHeight - top - h);
      return {
        x: box ? box.left : 0,
        y: box ? box.top + oy - scale * top : 0,
        scale,
        clipPath: `inset(${top}px ${right}px ${bottom}px 0px)`,
      };
    };

    // Siden låses fast, så den kan skaleres uden at scrolle væk.
    const lockStage = () => {
      if (s.locked) return;
      s.locked = true;
      s.savedY = lenis ? lenis.scroll : window.scrollY;
      lenis?.stop();
      gsap.set(stage, { position: "fixed", top: -s.savedY, left: 0, width: "100%" });
    };
    const unlockStage = (restoreScroll: boolean) => {
      if (!s.locked) return;
      s.locked = false;
      gsap.set(stage, { clearProps: "position,top,left,width" });
      if (restoreScroll) {
        window.scrollTo(0, s.savedY);
        lenis?.scrollTo(s.savedY, { immediate: true, force: true });
      }
    };
    // Mens et panel fylder skærmen, må siden bagved ikke scrolle.
    const lockScroll = (lock: boolean) => {
      document.documentElement.style.overflow = lock ? "hidden" : "";
      if (lock) lenis?.stop();
      else lenis?.start();
    };

    const clearScreens = () => {
      gsap.set(screens, { clearProps: "transform,transformOrigin,clipPath,opacity,visibility,zIndex" });
      gsap.set(allOwnTitles, { clearProps: "opacity,visibility" });
    };

    const show = () => {
      s.tl?.kill();
      lockStage();
      s.shown = true;
      site.dataset.menu = "";
      gsap.set(menu, { autoAlpha: 1 });

      const rects = boxes.current.map((b) => b?.getBoundingClientRect());
      const c = s.current;
      const others = screens.map((_, i) => i).filter((i) => i !== c);
      screens.forEach((el, i) => {
        gsap.set(el, { transformOrigin: "0 0", visibility: "visible", ...fitVars(i, i === c ? undefined : rects[i]) });
      });

      const tl = gsap.timeline();
      s.tl = tl;
      if (reduceMotion) {
        tl.to(screens[c], { autoAlpha: 0, duration: TIMING.reducedFade, ease: "none" })
          .set(screens[c], fitVars(c, rects[c]))
          .to(screens, { autoAlpha: 1, duration: TIMING.reducedFade, ease: "none" })
          .fromTo(titles, { yPercent: 0, autoAlpha: 0 }, { autoAlpha: 1, duration: TIMING.reducedFade }, "<");
        gsap.set(others.map((i) => screens[i]), { autoAlpha: 0 });
        return;
      }
      tl.to(allOwnTitles, { autoAlpha: 0, duration: TIMING.out, ease: "power2.out" }, 0);
      tl.to(screens[c], { ...fitVars(c, rects[c]), duration: TIMING.shrink, ease: TIMING.shrinkEase }, 0);
      others.forEach((i, n) => {
        const to = fitVars(i, rects[i]);
        tl.fromTo(
          screens[i],
          { autoAlpha: 0, y: to.y + window.innerHeight * 0.25 },
          { autoAlpha: 1, y: to.y, duration: TIMING.boxesIn, ease: TIMING.boxesEase },
          TIMING.shrink * 0.5 + n * TIMING.boxesStagger,
        );
      });
      tl.fromTo(
        titles,
        { yPercent: 110 },
        { yPercent: 0, duration: TIMING.title, ease: "expo.out", stagger: TIMING.titleStagger },
        TIMING.shrink * 0.75,
      );
    };

    // Zoom skærm i op til fuld størrelse og afslut menuen.
    const zoomTo = (i: number) => {
      s.tl?.kill();
      const others = screens.filter((_, k) => k !== i);
      const settle = () => {
        // Panelerne er skjult via CSS; kun det valgte bliver synligt.
        clearScreens();
        if (i > 0) gsap.set(screens[i], { visibility: "visible" });
        unlockStage(true);
        lockScroll(i > 0);
        gsap.set(menu, { autoAlpha: 0 });
        delete site.dataset.menu;
        s.shown = false;
        s.current = i;
        setCurrent(i);
        if (i > 0) screens[i].focus({ preventScroll: true });
      };

      const tl = gsap.timeline({ onComplete: settle });
      s.tl = tl;
      if (reduceMotion) {
        tl.to([...others, screens[i], ...titles], { autoAlpha: 0, duration: TIMING.reducedFade, ease: "none" })
          .set(screens[i], fitVars(i))
          .to(screens[i], { autoAlpha: 1, duration: TIMING.reducedFade, ease: "none" });
        return;
      }
      gsap.set(screens[i], { zIndex: 46 });
      tl.to(titles, { yPercent: 110, duration: TIMING.out, ease: "power3.in" }, 0)
        .to(others, { autoAlpha: 0, duration: TIMING.out, ease: "power2.out" }, 0)
        .to(screens[i], { ...fitVars(i), duration: TIMING.zoom, ease: TIMING.zoomEase }, 0.15);
      if (ownTitles[i]) tl.to(ownTitles[i], { autoAlpha: 1, duration: TIMING.out, ease: "power2.out" }, TIMING.zoom * 0.7);
    };

    const onResize = () => {
      if (!s.shown || s.tl?.isActive()) return;
      const rects = boxes.current.map((b) => b?.getBoundingClientRect());
      screens.forEach((el, i) => gsap.set(el, fitVars(i, rects[i])));
    };
    window.addEventListener("resize", onResize);

    if (open && !s.shown) show();
    else if (!open && s.shown) zoomTo(s.current);

    return () => window.removeEventListener("resize", onResize);
  }, [open, lenis]);

  const select = (i: number) => {
    state.current.current = i;
    onClose();
  };

  return (
    <>
      <div ref={root} id="site-menu" className="menu" aria-hidden={!open}>
        {SCREENS.map((name, i) => (
          <button
            key={name}
            ref={(el) => {
              boxes.current[i] = el;
            }}
            type="button"
            className="menu-box"
            tabIndex={open ? 0 : -1}
            onClick={() => select(i)}
          >
            <span className="menu-title">
              <span>{name}</span>
            </span>
          </button>
        ))}
      </div>

      <section
        ref={(el) => {
          panels.current[1] = el;
        }}
        className="screen-panel screen-panel--archive"
        aria-label="Archive"
        aria-hidden={current !== 1}
        inert={current !== 1}
        tabIndex={-1}
        data-lenis-prevent
      >
        <ArchivePanel projects={projects} />
      </section>

      <section
        ref={(el) => {
          panels.current[2] = el;
        }}
        className="screen-panel"
        aria-label="About"
        aria-hidden={current !== 2}
        inert={current !== 2}
        tabIndex={-1}
        data-lenis-prevent
      >
        <AboutPanel about={about} active={current === 2} />
      </section>
    </>
  );
}

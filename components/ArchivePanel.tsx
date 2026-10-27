"use client";

import { useEffect, useRef } from "react";

import type { ProjectSummary } from "@/sanity/lib/types";

import { gsap } from "./gsap";
import SanityImage from "./SanityImage";

/*
 * Archive: titel, en kort tekst og en vandret stribe med alle projekternes billeder.
 * På desktop scroller man striben sidelæns med hjulet eller ved at trække;
 * på mobil ligger billederne under hinanden.
 *
 * Justér udtrykket her:
 */
const STRIP = {
  /** Hvor hurtigt striben følger efter (0-1, højere = mere direkte). */
  ease: 0.08,
  wheelSpeed: 1,
  dragSpeed: 1.2,
};

export default function ArchivePanel({ projects }: { projects: ProjectSummary[] }) {
  const strip = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLUListElement>(null);

  const years = projects.map((p) => parseInt(p.year ?? "", 10)).filter((y) => !Number.isNaN(y));
  const from = Math.min(...years);
  const to = Math.max(...years);
  const range = years.length === 0 ? null : from === to ? `${from}` : `${from}—${to}`;

  useEffect(() => {
    const wrap = strip.current;
    const list = track.current;
    const panel = wrap?.closest<HTMLElement>(".screen-panel");
    if (!wrap || !list || !panel) return;

    const desktop = window.matchMedia("(min-width: 768px)");
    const state = { current: 0, target: 0, max: 0 };
    const clamp = (v: number) => Math.min(state.max, Math.max(0, v));
    const setX = gsap.quickSetter(list, "x", "px");

    const measure = () => {
      state.max = Math.max(0, list.offsetWidth - wrap.clientWidth);
      state.target = clamp(state.target);
    };
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(wrap);
    resizeObserver.observe(list);

    const tick = (_time: number, deltaTime: number) => {
      if (!desktop.matches) {
        if (state.current !== 0) {
          state.current = state.target = 0;
          setX(0);
        }
        return;
      }
      if (state.current === state.target) return;
      const ratio = deltaTime / (1000 / 60);
      state.current += (state.target - state.current) * Math.min(1, STRIP.ease * ratio);
      if (Math.abs(state.target - state.current) < 0.1) state.current = state.target;
      setX(-state.current);
    };
    gsap.ticker.add(tick);

    // Hjulet (op/ned eller til siden) flytter striben sidelæns.
    const onWheel = (e: WheelEvent) => {
      if (!desktop.matches) return;
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? wrap.clientWidth : 1;
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      state.target = clamp(state.target + delta * unit * STRIP.wheelSpeed);
    };

    const drag = { active: false, lastX: 0, startX: 0, moved: 0 };
    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 || !desktop.matches) return;
      drag.active = true;
      drag.startX = drag.lastX = e.clientX;
      drag.moved = 0;
      wrap.classList.add("is-dragging");
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!drag.active) return;
      const dx = e.clientX - drag.lastX;
      drag.lastX = e.clientX;
      drag.moved = Math.max(drag.moved, Math.abs(e.clientX - drag.startX));
      state.target = clamp(state.target - dx * STRIP.dragSpeed);
    };
    const onPointerUp = () => {
      drag.active = false;
      wrap.classList.remove("is-dragging");
    };
    // Et træk må ikke tælle som et klik på et projekt.
    const onClickCapture = (e: MouseEvent) => {
      if (drag.moved > 6) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    panel.addEventListener("wheel", onWheel, { passive: false });
    wrap.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    wrap.addEventListener("click", onClickCapture, true);

    return () => {
      gsap.ticker.remove(tick);
      resizeObserver.disconnect();
      panel.removeEventListener("wheel", onWheel);
      wrap.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      wrap.removeEventListener("click", onClickCapture, true);
    };
  }, []);

  return (
    <div className="archive-page">
      <header className="archive-head">
        {/* Titlen skjules, mens menuen viser boksene (den har sin egen titel). */}
        <h2 className="archive-title" data-menu-hide>
          archive
        </h2>
        <div className="archive-info">
          <p>
            A curated selection
            <br />
            of work &amp; explorations
          </p>
          {range && <p className="archive-years">{range}</p>}
        </div>
      </header>

      <div ref={strip} className="archive-strip">
        <ul ref={track} className="archive-strip-track">
          {projects.map((project) => (
            <li
              key={project._id}
              className="archive-item"
              style={
                {
                  "--ar": project.coverImage?.asset.metadata?.dimensions?.aspectRatio ?? 0.8,
                } as React.CSSProperties
              }
            >
              {project.coverImage && (
                <SanityImage
                  image={project.coverImage}
                  sizes="(min-width: 768px) 40vw, 65vw"
                  alt={project.title}
                />
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

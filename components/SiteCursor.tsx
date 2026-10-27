"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "./gsap";

/**
 * Den runde cursor, der følger musen på hele sitet.
 * Andre komponenter kan ændre den via <html data-cursor="project">,
 * som gør cirklen større og viser "Open project" (se ArchiveSlider).
 */
export default function SiteCursor() {
  const cursor = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const el = cursor.current;
    if (!el) return;

    const xTo = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3" });
    const show = () => gsap.to(el, { autoAlpha: 1, scale: 1, duration: 0.4, ease: "power3.out" });
    const hide = () => gsap.to(el, { autoAlpha: 0, scale: 0.5, duration: 0.3, ease: "power3.out" });

    let visible = false;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      // Første gang springer cirklen direkte til musen i stedet for at glide ind fra hjørnet.
      if (!visible) {
        gsap.set(el, { x: e.clientX, y: e.clientY });
        visible = true;
        show();
      }
      xTo(e.clientX);
      yTo(e.clientY);
    };
    const onLeave = () => {
      visible = false;
      hide();
    };
    const onDown = () => el.classList.add("is-pressed");
    const onUp = () => el.classList.remove("is-pressed");

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    document.documentElement.addEventListener("pointerleave", onLeave);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  });

  return (
    <div ref={cursor} className="site-cursor" aria-hidden>
      <span className="site-cursor-label mono">Open project</span>
    </div>
  );
}

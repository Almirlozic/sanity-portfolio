"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { site } from "@/lib/site";
import type { ProjectSummary } from "@/sanity/lib/types";

import LocalTime from "./LocalTime";
import RollText from "./RollText";
import SiteMenu from "./SiteMenu";

/**
 * Header i et enkelt grid: navn, menu/kontakt og lokal tid.
 */
export default function SiteHeader({ projects }: { projects: ProjectSummary[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [first, ...rest] = site.name.split(" ");

  // Klik på navnet nulstiller menuen (fx hvis archive eller about er åben).
  const [homeClicks, setHomeClicks] = useState(0);

  // Luk menuen, når man skifter side.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <header className="topbar">
        <Link
          href="/"
          className="topbar-name"
          aria-label={`${site.name}, forside`}
          onClick={() => {
            setOpen(false);
            setHomeClicks((n) => n + 1);
          }}
        >
          <RollText>{first}</RollText>
          {rest.length > 0 && <RollText>{rest.join(" ")}</RollText>}
        </Link>

        <div className="topbar-col topbar-links">
          <button type="button" aria-expanded={open} aria-controls="site-menu" onClick={() => setOpen((v) => !v)}>
            <RollText>{open ? "Luk" : "Menu"}</RollText>
          </button>
          <a href={`mailto:${site.email}`}>
            <RollText>Contact</RollText>
          </a>
        </div>

        <div className="topbar-col topbar-time">
          <span className="muted">Local time</span>
          <LocalTime />
        </div>
      </header>

      <SiteMenu
        open={open}
        onClose={() => setOpen(false)}
        resetKey={`${pathname}:${homeClicks}`}
        projects={projects}
      />
    </>
  );
}

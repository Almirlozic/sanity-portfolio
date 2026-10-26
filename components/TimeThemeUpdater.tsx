"use client";

import { useEffect } from "react";

import { applyTimeTheme, TIME_THEME, TIME_THEME_STYLE_ID } from "@/lib/timeTheme";

/** Opdaterer farverne hvert minut og fjerner dem igen, hvis man forlader sitet (fx til /studio). */
export default function TimeThemeUpdater() {
  useEffect(() => {
    const update = () => applyTimeTheme(TIME_THEME, TIME_THEME_STYLE_ID);
    update();
    const id = window.setInterval(update, 60_000);
    return () => {
      window.clearInterval(id);
      document.getElementById(TIME_THEME_STYLE_ID)?.remove();
    };
  }, []);

  return null;
}

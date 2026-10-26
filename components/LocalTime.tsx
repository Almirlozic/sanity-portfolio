"use client";

import { useEffect, useState } from "react";

const TIME_ZONE = "Europe/Copenhagen";

/** Viser den lokale tid i København, fx "14 . 48", med et blinkende punktum. */
export default function LocalTime() {
  const [time, setTime] = useState<{ h: string; m: string } | null>(null);

  useEffect(() => {
    const format = new Intl.DateTimeFormat("da-DK", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: TIME_ZONE,
    });
    const update = () => {
      const parts = format.formatToParts(new Date());
      setTime({
        h: parts.find((p) => p.type === "hour")?.value ?? "--",
        m: parts.find((p) => p.type === "minute")?.value ?? "--",
      });
    };
    const first = requestAnimationFrame(update);
    const id = window.setInterval(update, 10_000);
    return () => {
      cancelAnimationFrame(first);
      window.clearInterval(id);
    };
  }, []);

  return (
    <time className="local-time">
      {time ? time.h : "--"}
      <span className="local-time-dot"> . </span>
      {time ? time.m : "--"}
    </time>
  );
}

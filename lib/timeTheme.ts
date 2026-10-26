/*
 * Sitet bliver mørkere, jo senere det er i København (samme tid som "Local time"
 * i headeren). Test et bestemt tidspunkt ved at tilføje fx ?hour=22 til adressen.
 *
 * Justér udtrykket her:
 */
export const TIME_THEME = {
  timeZone: "Europe/Copenhagen",
  /**
   * Hvor mørkt sitet er i løbet af døgnet: [klokkeslæt, mørke fra 0 til 1].
   * Imellem punkterne glider det blødt. Nu: lyst 8-15, mørkere frem mod 23, mørkt om natten.
   */
  curve: [
    [0, 1],
    [5, 1],
    [8, 0],
    [15, 0],
    [23, 1],
    [24, 1],
  ],
  /** Baggrunden glider fra light.bg til dark.bg. Teksten skifter til den farve, der står tydeligst. */
  light: { bg: "#f8f6f2", fg: "#111111" },
  dark: { bg: "#121211", fg: "#f2f0ec" },
  /** Hvor langt fra baggrunden mod teksten de grå toner ligger (0-1). */
  muted: 0.48,
  card: 0.06,
};

export const TIME_THEME_STYLE_ID = "time-theme";

/**
 * Sætter farverne ud fra klokken. Skal være helt selvstændig (ingen variabler
 * udefra), fordi den også køres som inline-script, før siden vises.
 */
export function applyTimeTheme(config: typeof TIME_THEME, styleId: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
    timeZone: config.timeZone,
  }).formatToParts(new Date());
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  let hour = part("hour") + part("minute") / 60;
  const override = new URLSearchParams(window.location.search).get("hour");
  if (override !== null && !Number.isNaN(Number(override))) hour = Number(override) % 24;

  let dark = 1;
  const curve = config.curve;
  for (let i = 1; i < curve.length; i++) {
    if (hour <= curve[i][0]) {
      const t = (hour - curve[i - 1][0]) / (curve[i][0] - curve[i - 1][0]);
      dark = curve[i - 1][1] + (curve[i][1] - curve[i - 1][1]) * t * t * (3 - 2 * t);
      break;
    }
  }

  const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const mix = (a: number[], b: number[], t: number) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const luminance = (c: number[]) => {
    const [r, g, b] = c.map((v) => {
      const x = v / 255;
      return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contrast = (a: number[], b: number[]) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };

  const bg = mix(rgb(config.light.bg), rgb(config.dark.bg), dark);
  const darkText = rgb(config.light.fg);
  const lightText = rgb(config.dark.fg);
  const isDark = contrast(bg, lightText) > contrast(bg, darkText);
  const fg = isDark ? lightText : darkText;
  const css =
    `html:root{--bg:rgb(${bg});--fg:rgb(${fg});--muted:rgb(${mix(bg, fg, config.muted)});` +
    `--card:rgb(${mix(bg, fg, config.card)});--line:rgba(${fg},0.12);color-scheme:${isDark ? "dark" : "light"}}`;

  let style = document.getElementById(styleId);
  if (!style) {
    style = document.createElement("style");
    style.id = styleId;
    document.head.appendChild(style);
  }
  style.textContent = css;
}

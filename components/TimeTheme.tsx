import { applyTimeTheme, TIME_THEME, TIME_THEME_STYLE_ID } from "@/lib/timeTheme";

import TimeThemeUpdater from "./TimeThemeUpdater";

/**
 * Farver efter klokken. Inline-scriptet sætter dem, før siden vises (så den ikke
 * blinker lyst om aftenen), og TimeThemeUpdater holder dem opdateret.
 */
export default function TimeTheme() {
  const script = `(${applyTimeTheme.toString()})(${JSON.stringify(TIME_THEME)},${JSON.stringify(TIME_THEME_STYLE_ID)})`;

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: script }} />
      <TimeThemeUpdater />
    </>
  );
}

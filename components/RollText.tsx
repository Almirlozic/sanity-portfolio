/**
 * Tekst der "ruller" op ved hover: en kopi glider ind nedefra.
 * Bruges i menuen. Selve animationen ligger i CSS (.roll).
 */
export default function RollText({ children }: { children: string }) {
  return (
    <span className="roll">
      <span className="roll-inner">
        <span>{children}</span>
        <span aria-hidden>{children}</span>
      </span>
    </span>
  );
}

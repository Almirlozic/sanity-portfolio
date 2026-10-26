import { site } from "@/lib/site";

import SplitReveal from "./SplitReveal";

export default function SiteFooter() {
  return (
    <footer className="site-footer" id="contact">
      <p className="mono muted">Har du et projekt i tankerne?</p>
      <a href={`mailto:${site.email}`} className="footer-mail">
        <SplitReveal as="span" onScroll>
          {site.email}
        </SplitReveal>
      </a>
      <div className="footer-bottom mono">
        <span>{site.location}</span>
        <ul>
          {site.socials.map((s) => (
            <li key={s.label}>
              <a href={s.href} target="_blank" rel="noreferrer">
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}

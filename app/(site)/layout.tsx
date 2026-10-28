import SiteCursor from "@/components/SiteCursor";
import SiteHeader from "@/components/SiteHeader";
import SmoothScroll from "@/components/SmoothScroll";
import TimeTheme from "@/components/TimeTheme";
import { getAbout, getProjects } from "@/sanity/lib/data";

/**
 * Layout for selve hjemmesiden (ikke /studio).
 * Her ligger smooth scroll og navigationen i hjørnerne.
 */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [projects, about] = await Promise.all([getProjects(), getAbout()]);

  return (
    <SmoothScroll>
      <div className="site">
        <TimeTheme />
        <SiteHeader projects={projects} about={about} />
        <main className="stage">{children}</main>
        <SiteCursor />
      </div>
    </SmoothScroll>
  );
}

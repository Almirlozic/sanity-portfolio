import SiteHeader from "@/components/SiteHeader";
import SmoothScroll from "@/components/SmoothScroll";
import TimeTheme from "@/components/TimeTheme";
import { getProjects } from "@/sanity/lib/data";

/**
 * Layout for selve hjemmesiden (ikke /studio).
 * Her ligger smooth scroll og navigationen i hjørnerne.
 */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const projects = await getProjects();

  return (
    <SmoothScroll>
      <div className="site">
        <TimeTheme />
        <SiteHeader projects={projects} />
        <main className="stage">{children}</main>
      </div>
    </SmoothScroll>
  );
}

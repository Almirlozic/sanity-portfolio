import Link from "next/link";

import ArchiveSlider from "@/components/ArchiveSlider";
import { getProjects } from "@/sanity/lib/data";

/**
 * Forsiden: de udvalgte projekter i en uendelig, horisontal række.
 */
export default async function HomePage() {
  const projects = await getProjects();
  const featured = projects.filter((p) => p.featured !== false);

  if (featured.length === 0) {
    return (
      <section className="empty">
        <p className="muted">Ingen projekter endnu</p>
        <p>
          Opret dit første projekt i <Link href="/studio">Sanity Studio</Link>, så dukker det op her.
        </p>
      </section>
    );
  }

  return (
    <>
      <h1 className="sr-only">Udvalgte projekter</h1>
      <ArchiveSlider projects={featured} />
    </>
  );
}

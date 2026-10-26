import type { Metadata } from "next";
import { PortableText } from "next-sanity";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import ParallaxMedia from "@/components/ParallaxMedia";
import SanityImage from "@/components/SanityImage";
import SiteFooter from "@/components/SiteFooter";
import SplitReveal from "@/components/SplitReveal";
import { getProject, getProjectSlugs } from "@/sanity/lib/data";
import { urlFor } from "@/sanity/lib/image";

/*
 * Projektskabelonen. Én fil, som bliver til en side for hvert projekt
 * i Sanity: /projects/<slug>.
 */

const PLACEHOLDER = "__placeholder__";

export async function generateStaticParams() {
  const slugs = await getProjectSlugs();
  // Next 16 kræver mindst ét param ved build. Er der ingen projekter endnu,
  // bruger vi en pladsholder, som giver 404.
  if (slugs.length === 0) return [{ slug: PLACEHOLDER }];
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata(props: PageProps<"/projects/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const project = await getProject(slug);
  if (!project) return {};
  return {
    title: project.title,
    description: project.excerpt,
    openGraph: project.coverImage
      ? { images: [{ url: urlFor(project.coverImage).width(1200).height(630).fit("crop").url() }] }
      : undefined,
  };
}

export default function ProjectPage(props: PageProps<"/projects/[slug]">) {
  return (
    <>
      <Suspense fallback={<div className="project-loading" />}>
        <ProjectContent params={props.params} />
      </Suspense>
      <SiteFooter />
    </>
  );
}

async function ProjectContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug === PLACEHOLDER) notFound();

  const project = await getProject(slug);
  if (!project) notFound();

  const meta = [
    { label: "Kunde", value: project.client },
    { label: "Rolle", value: project.role },
    { label: "År", value: project.year },
  ].filter((m) => m.value);

  return (
    <article className="project">
      <header className="project-header">
        <Link href="/" className="mono muted back-link">
          ← Alle projekter
        </Link>
        <SplitReveal as="h1" className="project-title">
          {project.title}
        </SplitReveal>
        <div className="project-meta">
          {meta.map((m) => (
            <div key={m.label}>
              <p className="mono muted">{m.label}</p>
              <p>{m.value}</p>
            </div>
          ))}
          {project.link && (
            <div>
              <p className="mono muted">Live</p>
              <a href={project.link} target="_blank" rel="noreferrer" className="underline-link">
                Besøg sitet ↗
              </a>
            </div>
          )}
        </div>
      </header>

      {project.coverImage && (
        <ParallaxMedia className="project-cover" amount={10}>
          <SanityImage image={project.coverImage} sizes="100vw" priority />
        </ParallaxMedia>
      )}

      {(project.excerpt || project.body) && (
        <section className="project-text">
          {project.excerpt && (
            <SplitReveal as="p" className="project-lead" onScroll>
              {project.excerpt}
            </SplitReveal>
          )}
          {project.body && (
            <div className="project-body">
              <PortableText value={project.body} />
            </div>
          )}
        </section>
      )}

      {project.gallery && project.gallery.length > 0 && (
        <section className="gallery">
          {project.gallery.map((image, i) => {
            const ratio = image.asset?.metadata?.dimensions?.aspectRatio ?? 4 / 3;
            return (
              <ParallaxMedia
                key={image._key ?? i}
                className={`gallery-item ${image.fullWidth ? "gallery-item--full" : ""}`}
                amount={6}
                style={{ aspectRatio: ratio }}
              >
                <SanityImage
                  image={image}
                  sizes={image.fullWidth ? "100vw" : "(min-width: 900px) 50vw, 100vw"}
                />
              </ParallaxMedia>
            );
          })}
        </section>
      )}

      {project.next && (
        <Link href={`/projects/${project.next.slug}`} className="next-project">
          <p className="mono muted">Næste projekt</p>
          <SplitReveal as="h2" className="next-title" onScroll>
            {project.next.title}
          </SplitReveal>
          {project.next.coverImage && (
            <ParallaxMedia className="next-media" amount={8}>
              <SanityImage image={project.next.coverImage} sizes="(min-width: 900px) 50vw, 100vw" />
            </ParallaxMedia>
          )}
        </Link>
      )}
    </article>
  );
}

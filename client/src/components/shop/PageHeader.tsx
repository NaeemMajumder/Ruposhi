import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { SITE_URL } from '@/lib/config';
import { JsonLd } from '../seo/JsonLd';

export type Crumb = { name: string; href?: string };

/** Breadcrumbs (+ BreadcrumbList JSON-LD) and an editorial page title. */
export function Breadcrumbs({ crumbs, className }: { crumbs: Crumb[]; className?: string }) {
  return (
    <>
      <nav aria-label="Breadcrumb" className={className}>
        <ol className="flex flex-wrap items-center gap-1 text-xs text-mocha">
          {crumbs.map((c, i) => (
            <li key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3 opacity-60" aria-hidden="true" />}
              {c.href ? <Link href={c.href} className="u-line hover:text-espresso">{c.name}</Link> : <span aria-current="page" className="text-espresso">{c.name}</span>}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.href ? `${SITE_URL}${c.href}` : undefined })),
        }}
      />
    </>
  );
}

export function PageHeader({ crumbs, eyebrow, title, sub, aside }: { crumbs: Crumb[]; eyebrow?: string; title: string; sub?: string; aside?: React.ReactNode }) {
  return (
    <header className="pb-6 pt-5 sm:pb-10 sm:pt-8">
      <Breadcrumbs crumbs={crumbs} />
      <div className="mt-5 flex flex-col gap-4 sm:mt-8 md:flex-row md:items-end md:justify-between">
        <div className="stagger max-w-2xl">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1 className="h-display mt-3 text-[44px] sm:text-[64px]">{title}</h1>
          {sub && <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-mocha">{sub}</p>}
        </div>
        {aside}
      </div>
    </header>
  );
}

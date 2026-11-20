import { ChevronDown } from 'lucide-react';

/** Native <details> accordion — works without JS, animates open with a smooth content rise. */
export function Accordion({ items }: { items: { title: string; body: React.ReactNode; open?: boolean }[] }) {
  return (
    <div className="divide-y divide-line border-y border-line">
      {items.map((it) => (
        <details key={it.title} open={it.open} className="group">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 font-display text-xl">
            {it.title}
            <span className="grid h-8 w-8 place-items-center rounded-full bg-sand transition-transform duration-500 ease-[var(--ease-silk)] group-open:rotate-180"><ChevronDown className="h-4 w-4" /></span>
          </summary>
          <div className="animate-[rise_.5s_var(--ease-silk)_both] pb-6 text-[15px] leading-relaxed text-mocha">{it.body}</div>
        </details>
      ))}
    </div>
  );
}

import { cn } from '@/lib/format';

/** Shimmer building blocks — shown by route-level loading.tsx while server data streams in. */
export const Sk = ({ className }: { className?: string }) => <div className={cn('skeleton', className)} aria-hidden="true" />;

export function CardSk() {
  return (
    <div aria-hidden="true">
      <Sk className="arch-soft aspect-[3/4] !rounded-[50%_50%_10px_10px/14%_14%_10px_10px]" />
      <Sk className="mt-3 h-2.5 w-16" />
      <Sk className="mt-2 h-4 w-4/5" />
      <Sk className="mt-2 h-4 w-1/3" />
    </div>
  );
}

export function GridSk({ n = 8, cols3 }: { n?: number; cols3?: boolean }) {
  return (
    <div className={cn('grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-3 lg:gap-x-6', cols3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4')}>
      {Array.from({ length: n }, (_, i) => <CardSk key={i} />)}
    </div>
  );
}

export function HeadSk() {
  return (
    <div className="py-8 sm:py-12" aria-hidden="true">
      <Sk className="h-3 w-40" />
      <Sk className="mt-4 h-12 w-3/4 max-w-lg sm:h-16" />
      <Sk className="mt-3 h-4 w-2/3 max-w-md" />
    </div>
  );
}

export function ShopSk() {
  return (
    <div className="container-x pb-16" role="status" aria-label="Loading">
      <HeadSk />
      <div className="flex gap-10">
        <div className="hidden w-[270px] shrink-0 space-y-6 lg:block">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="space-y-3 border-b border-line pb-5">
              <Sk className="h-3 w-24" />
              <Sk className="h-4 w-full" />
              <Sk className="h-4 w-4/5" />
            </div>
          ))}
        </div>
        <div className="flex-1">
          <div className="mb-6 flex justify-between"><Sk className="h-4 w-24" /><Sk className="h-9 w-40 !rounded-full" /></div>
          <GridSk n={9} cols3 />
        </div>
      </div>
    </div>
  );
}

export function ProductSk() {
  return (
    <div className="container-x pb-16 pt-4" role="status" aria-label="Loading">
      <Sk className="mb-6 h-3 w-56" />
      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
        <div className="grid gap-3 lg:grid-cols-[84px_1fr]">
          <div className="order-2 flex gap-2 lg:order-1 lg:flex-col">{Array.from({ length: 4 }, (_, i) => <Sk key={i} className="aspect-[3/4] w-16 lg:w-full" />)}</div>
          <Sk className="order-1 aspect-[4/5] !rounded-3xl lg:order-2" />
        </div>
        <div className="space-y-4">
          <Sk className="h-3 w-28" />
          <Sk className="h-12 w-11/12" />
          <Sk className="h-6 w-40" />
          <Sk className="h-4 w-full" />
          <Sk className="h-4 w-5/6" />
          <div className="flex gap-2 pt-4">{Array.from({ length: 5 }, (_, i) => <Sk key={i} className="h-11 w-14 !rounded-full" />)}</div>
          <Sk className="mt-4 h-12 w-full !rounded-full" />
          <Sk className="h-12 w-full !rounded-full" />
          <Sk className="mt-6 h-24 w-full !rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export function HomeSk() {
  return (
    <div role="status" aria-label="Loading">
      <div className="container-x grid items-center gap-8 pb-12 pt-6 lg:grid-cols-2">
        <Sk className="order-1 mx-auto aspect-[4/5] w-full max-w-[560px] !rounded-[50%_50%_14px_14px/30%_30%_14px_14px] lg:order-2" />
        <div className="order-2 space-y-4 lg:order-1">
          <Sk className="h-3 w-40" />
          <Sk className="h-14 w-4/5" />
          <Sk className="h-14 w-3/5" />
          <Sk className="h-4 w-2/3" />
          <div className="flex gap-3 pt-4"><Sk className="h-12 w-44 !rounded-full" /><Sk className="h-12 w-32 !rounded-full" /></div>
        </div>
      </div>
      <div className="container-x py-12"><HeadSk /><GridSk n={4} /></div>
    </div>
  );
}

export function PageSk() {
  return (
    <div className="container-x max-w-3xl py-12" role="status" aria-label="Loading">
      <HeadSk />
      <div className="space-y-3">{Array.from({ length: 8 }, (_, i) => <Sk key={i} className={cn('h-4', i % 3 === 2 ? 'w-2/3' : 'w-full')} />)}</div>
    </div>
  );
}

export function FormSk() {
  return (
    <div className="container-x grid gap-8 py-10 lg:grid-cols-[1fr_400px]" role="status" aria-label="Loading">
      <div className="space-y-5">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="card space-y-3 p-5">
            <Sk className="h-5 w-40" />
            <div className="grid gap-3 sm:grid-cols-2"><Sk className="h-12" /><Sk className="h-12" /></div>
            <Sk className="h-12" />
          </div>
        ))}
      </div>
      <Sk className="h-96 !rounded-2xl" />
    </div>
  );
}

/** Admin: KPI tiles + chart + table */
export function DashboardSk() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Sk key={i} className="h-28 !rounded-2xl" />)}</div>
      <div className="grid gap-4 lg:grid-cols-3"><Sk className="h-80 !rounded-2xl lg:col-span-2" /><Sk className="h-80 !rounded-2xl" /></div>
      <TableSk />
    </div>
  );
}

export function TableSk({ rows = 8 }: { rows?: number }) {
  return (
    <div className="card overflow-hidden" role="status" aria-label="Loading">
      <div className="flex gap-3 border-b border-line p-4"><Sk className="h-10 flex-1" /><Sk className="h-10 w-32" /><Sk className="h-10 w-24" /></div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-line px-4 py-3 last:border-0">
          <Sk className="h-10 w-10 !rounded-lg" />
          <Sk className="h-4 flex-1" />
          <Sk className="hidden h-4 w-24 sm:block" />
          <Sk className="h-6 w-20 !rounded-full" />
        </div>
      ))}
    </div>
  );
}

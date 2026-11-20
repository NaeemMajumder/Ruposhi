'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Search } from 'lucide-react';
import { useT } from '@/i18n/client';

export function SearchBox({ initial }: { initial: string }) {
  const { lang } = useT();
  const router = useRouter();
  const [q, setQ] = useState(initial);
  return (
    <form
      role="search"
      className="mb-8 flex max-w-xl items-center gap-2 rounded-full border border-line bg-surface p-1.5 pl-5 transition focus-within:border-bronze focus-within:ring-4 focus-within:ring-gold/15"
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
      }}
    >
      <Search className="h-5 w-5 text-mocha" aria-hidden="true" />
      <input value={q} onChange={(e) => setQ(e.target.value)} maxLength={80} aria-label="Search" placeholder={lang === 'bn' ? 'শাড়ি, জামদানি, পাঞ্জাবি… (বাংলিশও চলবে)' : 'Saree, jamdani, panjabi… (Banglish works too)'} className="h-11 min-w-0 flex-1 bg-transparent focus:outline-none" />
      <button className="btn-primary !min-h-11">{lang === 'bn' ? 'খুঁজুন' : 'Search'}</button>
    </form>
  );
}

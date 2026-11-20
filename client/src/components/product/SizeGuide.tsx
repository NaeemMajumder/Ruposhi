'use client';
import { useState } from 'react';
import { Ruler } from 'lucide-react';
import { useT } from '@/i18n/client';
import { cn, toBnDigits } from '@/lib/format';
import { Modal } from '../ui/Sheet';

const CHARTS: Record<string, { head: string[]; rows: (string | number)[][]; note: { en: string; bn: string } }> = {
  panjabi: {
    head: ['Size', 'Chest (in)', 'Length (in)', 'Shoulder (in)', 'Sleeve (in)'],
    rows: [[38, 40, 40, 17, 24], [40, 42, 41, 17.5, 24.5], [42, 44, 42, 18, 25], [44, 46, 43, 18.5, 25.5], [46, 48, 44, 19, 26]],
    note: { en: 'Size = your body chest. We add 2" of ease for a comfortable, classic fit.', bn: 'সাইজ = আপনার বুকের মাপ। আরামদায়ক ক্লাসিক ফিটের জন্য ২" বাড়তি রাখা হয়েছে।' },
  },
  'salwar-kameez': {
    head: ['Size', 'Bust (in)', 'Waist (in)', 'Hip (in)', 'Kameez length (in)'],
    rows: [['S', 34, 28, 38, 42], ['M', 36, 30, 40, 43], ['L', 38, 32, 42, 44], ['XL', 40, 34, 44, 45], ['XXL', 42, 36, 46, 46]],
    note: { en: 'Unstitched three-pieces come with 2.5 yd kameez, 2.5 yd salwar and 2.5 yd dupatta.', bn: 'আনস্টিচড থ্রি-পিসে কামিজ ২.৫ গজ, সালোয়ার ২.৫ গজ আর ওড়না ২.৫ গজ থাকে।' },
  },
  kurti: {
    head: ['Size', 'Bust (in)', 'Waist (in)', 'Length (in)'],
    rows: [['S', 34, 30, 38], ['M', 36, 32, 39], ['L', 38, 34, 40], ['XL', 40, 36, 41], ['XXL', 42, 38, 42]],
    note: { en: 'Kurtis are cut straight with 2" ease. Between sizes? Size up.', bn: 'কুর্তি ২" বাড়তি রেখে সোজা কাটে বানানো। দুই সাইজের মাঝে হলে বড়টা নিন।' },
  },
  saree: {
    head: ['Piece', 'Length', 'Width'],
    rows: [['Saree', '5.5 m (6 yd)', '1.15 m (46 in)'], ['Blouse piece', '0.8 m', '1.15 m']],
    note: { en: 'Free size. Blouse piece is unstitched — tailor-made to your measurements.', bn: 'ফ্রি সাইজ। ব্লাউজ পিস আনস্টিচড — আপনার মাপমতো বানিয়ে নিন।' },
  },
};

export function SizeTables({ initial = 'panjabi' }: { initial?: string }) {
  const { lang, t } = useT();
  const [tab, setTab] = useState(CHARTS[initial] ? initial : 'panjabi');
  const c = CHARTS[tab];
  const d = (v: string | number) => (lang === 'bn' ? toBnDigits(String(v)) : String(v));
  return (
    <div>
      <div className="scrollbar-none -mx-1 mb-5 flex gap-2 overflow-x-auto px-1" role="tablist">
        {Object.keys(CHARTS).map((k) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn('chip shrink-0', tab === k && 'chip-on')}>{t(`nav.${k}`)}</button>
        ))}
      </div>
      <div key={tab} className="animate-scale-in overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[420px] text-sm">
          <thead className="bg-sand text-left">
            <tr>{c.head.map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody>
            {c.rows.map((r, i) => (
              <tr key={i} className="border-t border-line transition-colors hover:bg-blush">
                {r.map((v, j) => <td key={j} className={cn('px-4 py-3 tabular-nums', j === 0 && 'font-semibold')}>{d(v)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-sm text-mocha">{c.note[lang]}</p>
      <div className="mt-5 rounded-2xl bg-sand p-4 text-sm">
        <p className="font-semibold">{lang === 'bn' ? 'কীভাবে মাপবেন' : 'How to measure'}</p>
        <p className="mt-1 text-mocha">{lang === 'bn' ? 'বুক: বগলের নিচ দিয়ে সবচেয়ে চওড়া জায়গায় ফিতা ঘুরিয়ে মাপুন। কোমর: নাভির একটু উপরে সবচেয়ে সরু জায়গা।' : 'Chest: wrap the tape under your arms around the fullest part. Waist: the narrowest point, just above the navel.'}</p>
      </div>
    </div>
  );
}

export function SizeGuideButton({ category }: { category: string }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-bronze underline-offset-4 hover:underline">
        <Ruler className="h-4 w-4" /> {t('product.sizeGuide')}
      </button>
      <Modal open={open} onOpenChange={setOpen} title={t('product.sizeGuide')} wide>
        <SizeTables initial={category} />
      </Modal>
    </>
  );
}

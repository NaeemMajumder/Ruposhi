'use client';
import { useState } from 'react';
import { AlertTriangle, DatabaseBackup, FileJson, FileSpreadsheet } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/client-api';
import { toast } from '../../ui/Toast';
import { useL } from '../lib';
import { ExportButton, PageHead, Panel, UploadButton } from '../ui';

export function Backup() {
  const L = useL();
  const [result, setResult] = useState<Record<string, number> | null>(null);
  return (
    <div>
      <PageHead title={L('Backup & restore', 'ব্যাকআপ ও রিস্টোর')} />
      <div className="stagger grid gap-4 lg:grid-cols-3">
        <Panel title={<span className="flex items-center gap-2 text-sm font-semibold"><FileSpreadsheet className="h-4 w-4 text-success" /> {L('Excel backup', 'এক্সেল ব্যাকআপ')}</span>}>
          <p className="mb-4 text-sm text-mocha">{L('One workbook, one sheet per collection (orders, products, customers, coupons…). Open it in Excel / Google Sheets.', 'একটি ওয়ার্কবুক, প্রতিটি কালেকশনের আলাদা শিট (অর্ডার, প্রোডাক্ট, কাস্টমার, কুপন…)।')}</p>
          <ExportButton path="/admin/backup/xlsx" label={L('Download .xlsx', '.xlsx ডাউনলোড')} />
        </Panel>
        <Panel title={<span className="flex items-center gap-2 text-sm font-semibold"><FileJson className="h-4 w-4 text-bronze" /> {L('Full JSON backup', 'পূর্ণ JSON ব্যাকআপ')}</span>}>
          <p className="mb-4 text-sm text-mocha">{L('Exact copy of every record — use this to restore or move to MongoDB Atlas.', 'প্রতিটি রেকর্ডের হুবহু কপি — রিস্টোর বা MongoDB Atlas-এ নেওয়ার জন্য।')}</p>
          <ExportButton path="/admin/backup/json" label={L('Download .json', '.json ডাউনলোড')} />
        </Panel>
        <Panel title={<span className="flex items-center gap-2 text-sm font-semibold"><DatabaseBackup className="h-4 w-4 text-danger" /> {L('Restore', 'রিস্টোর')}</span>} className="border-danger/30">
          <p className="mb-4 flex gap-2 text-sm text-mocha"><AlertTriangle className="h-4 w-4 shrink-0 text-danger" />{L('Replaces ALL current data with the uploaded JSON backup. Take a fresh backup first. Owner only.', 'বর্তমান সব ডেটা আপলোড করা JSON দিয়ে বদলে যাবে। আগে নতুন ব্যাকআপ নিন। শুধু মালিক।')}</p>
          <UploadButton accept=".json,application/json" label={L('Upload backup .json', 'ব্যাকআপ .json আপলোড')} onFile={async (f) => {
            if (!confirm(L('Replace all data with this backup?', 'সব ডেটা এই ব্যাকআপ দিয়ে বদলাবেন?'))) return;
            const fd = new FormData();
            fd.append('file', f);
            try { const r = await apiFetch<{ restored: Record<string, number> }>('/admin/backup/restore', { admin: true, body: fd }); setResult(r.restored ?? (r as unknown as Record<string, number>)); toast.success(L('Restored', 'রিস্টোর হয়েছে')); } catch (e) { toast.error(e instanceof ApiError ? e.message : 'Restore failed'); }
          }} />
          {result && <pre className="mt-3 max-h-40 animate-fade overflow-auto rounded-xl bg-sand p-3 text-[11px]">{JSON.stringify(result, null, 2)}</pre>}
        </Panel>
      </div>
    </div>
  );
}

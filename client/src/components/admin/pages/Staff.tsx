'use client';
import { useState } from 'react';
import { Check, Loader2, Minus, Plus } from 'lucide-react';
import { useT } from '@/i18n/client';
import { apiFetch, ApiError } from '@/lib/client-api';
import { dateFmt, num } from '@/lib/format';
import { Modal } from '../../ui/Sheet';
import { PasswordField, passwordIssues } from '../../auth/Fields';
import { toast } from '../../ui/Toast';
import { useAdmin, useClientPage, useL } from '../lib';
import { Badge, DataTable, F, PageHead, Pager, Panel, Toggle, type Col } from '../ui';

type S = { _id: string; name: string; email: string; role: string; active: boolean; ordersHandled: number; lastLoginAt?: string; lastLoginIp?: string };
const ROLES = ['owner', 'manager', 'order_staff', 'content_editor'];
const MATRIX: [string, string, string, boolean[]][] = [
  ['Dashboard', 'ড্যাশবোর্ড', 'dashboard.view', [true, true, true, true]],
  ['Orders (view/update)', 'অর্ডার (দেখা/আপডেট)', 'orders', [true, true, true, false]],
  ['Export orders', 'অর্ডার এক্সপোর্ট', 'orders.export', [true, true, false, false]],
  ['Products (edit)', 'প্রোডাক্ট (এডিট)', 'products.edit', [true, true, false, true]],
  ['Prices & Excel import', 'দাম ও এক্সেল ইমপোর্ট', 'products.price', [true, true, false, false]],
  ['Inventory', 'ইনভেন্টরি', 'inventory.edit', [true, true, false, false]],
  ['Customers', 'কাস্টমার', 'customers', [true, true, true, false]],
  ['Marketing / coupons / SMS', 'মার্কেটিং / কুপন / SMS', 'marketing', [true, true, false, false]],
  ['Reports', 'রিপোর্ট', 'reports', [true, true, false, false]],
  ['Homepage content', 'হোমপেজ কনটেন্ট', 'cms', [true, true, false, true]],
  ['Settings, staff, backup', 'সেটিংস, স্টাফ, ব্যাকআপ', 'settings', [true, false, false, false]],
  ['Audit log', 'অডিট লগ', 'audit', [true, true, false, false]],
];

export function Staff() {
  const { lang } = useT();
  const L = useL();
  const { data, reload } = useAdmin<S[]>('/admin/staff');
  const [edit, setEdit] = useState<Partial<S> | null>(null);
  const pg = useClientPage(data);
  const role = (r: string) => ({ owner: L('Owner', 'মালিক'), manager: L('Manager', 'ম্যানেজার'), order_staff: L('Order staff', 'অর্ডার স্টাফ'), content_editor: L('Content editor', 'কনটেন্ট এডিটর') })[r] ?? r;
  const cols: Col<S>[] = [
    { key: 'n', head: L('Name', 'নাম'), cell: (s) => (<div><p className="font-medium">{s.name}</p><p className="text-[11px] text-mocha">{s.email}</p></div>) },
    { key: 'r', head: L('Role', 'রোল'), cell: (s) => <Badge v="new" label={role(s.role)} /> },
    { key: 'o', head: L('Orders handled', 'অর্ডার হ্যান্ডেল'), hideSm: true, cell: (s) => num(s.ordersHandled, lang) },
    { key: 'l', head: L('Last login', 'শেষ লগইন'), hideSm: true, cell: (s) => <span className="text-xs text-mocha">{s.lastLoginAt ? `${dateFmt(s.lastLoginAt, lang, true)} · ${s.lastLoginIp ?? ''}` : '—'}</span> },
    { key: 'a', head: L('Status', 'স্ট্যাটাস'), cell: (s) => <Badge v={s.active ? 'active' : 'archived'} label={s.active ? L('Active', 'সক্রিয়') : L('Disabled', 'নিষ্ক্রিয়')} /> },
  ];
  return (
    <div>
      <PageHead title={L('Staff & roles', 'স্টাফ ও রোল')} sub={L('Each person signs in with their own email + password. Roles below decide every API permission; changing a role or disabling someone signs them out instantly.', 'প্রত্যেকে নিজের ইমেইল + পাসওয়ার্ড দিয়ে সাইন ইন করেন। নিচের রোলই সব API পারমিশন ঠিক করে; রোল বদলালে বা নিষ্ক্রিয় করলে সাথে সাথে সাইন আউট হয়ে যায়।')} actions={<button onClick={() => setEdit({ name: '', email: '', role: 'order_staff', active: true })} className="btn-primary !min-h-10 text-sm"><Plus className="h-4 w-4" /> {L('Add staff', 'স্টাফ যোগ')}</button>} />
      <DataTable rows={pg.rows} cols={cols} rowKey={(s) => s._id} onRow={(s) => setEdit(s)} />
      {data && <Pager {...pg.pager} />}
      <Panel title={L('Permission matrix', 'পারমিশন ম্যাট্রিক্স')} className="mt-6" bodyClass="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-sand text-xs text-mocha"><tr><th className="px-4 py-2 text-left">{L('Area', 'অংশ')}</th>{ROLES.map((r) => <th key={r} className="px-4 py-2">{role(r)}</th>)}</tr></thead>
            <tbody>{MATRIX.map(([en, bn, k, v]) => <tr key={k} className="border-t border-line"><td className="px-4 py-2.5">{L(en, bn)}</td>{v.map((ok, i) => <td key={i} className="px-4 py-2.5 text-center">{ok ? <Check className="mx-auto h-4 w-4 text-success" /> : <Minus className="mx-auto h-4 w-4 text-mocha/40" />}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </Panel>
      <Modal open={!!edit} onOpenChange={(v) => !v && setEdit(null)} title={edit?._id ? edit.name ?? '' : L('Add staff', 'স্টাফ যোগ')}>
        {edit && <StaffForm s={edit} roleLabel={role} onDone={() => (setEdit(null), reload())} />}
      </Modal>
    </div>
  );
}

function StaffForm({ s, roleLabel, onDone }: { s: Partial<S>; roleLabel: (r: string) => string; onDone: () => void }) {
  const L = useL();
  const { lang } = useT();
  const [f, setF] = useState(s as S);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const isNew = !f._id;
  const pwIssues = password ? passwordIssues(password, lang) : [];
  return (
    <form className="space-y-3" onSubmit={async (e) => {
      e.preventDefault();
      if ((isNew && !password) || pwIssues.length) return toast.error(pwIssues.join(' · ') || L('Set an initial password.', 'প্রাথমিক পাসওয়ার্ড দিন।'));
      setBusy(true);
      try { await apiFetch(f._id ? `/admin/staff/${f._id}` : '/admin/staff', { admin: true, method: f._id ? 'PATCH' : 'POST', body: { name: f.name, email: f.email, role: f.role, active: f.active, ...(password ? { password } : {}) } }); toast.success(L('Saved', 'সেভ হয়েছে')); onDone(); } catch (er) { toast.error(er instanceof ApiError ? er.message : 'Error'); } finally { setBusy(false); }
    }}>
      <F label={L('Name', 'নাম')}><input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="field" /></F>
      <F label="Email"><input required type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className="field" /></F>
      <F label={L('Role', 'রোল')}><select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} className="field">{ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}</select></F>
      <PasswordField
        label={isNew ? L('Initial password', 'প্রাথমিক পাসওয়ার্ড') : L('Reset password (optional)', 'পাসওয়ার্ড রিসেট (ঐচ্ছিক)')}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
        maxLength={72}
        error={pwIssues.length ? pwIssues.join(' · ') : undefined}
        hint={<p className="mt-1.5 text-[11px] text-mocha">{isNew ? L('Share it privately; they can change it from the profile menu.', 'গোপনে জানিয়ে দিন; তারা প্রোফাইল মেনু থেকে বদলাতে পারবেন।') : L('Leave empty to keep the current password. A new one signs them out everywhere.', 'আগেরটা রাখতে খালি রাখুন। নতুন দিলে সব জায়গা থেকে সাইন আউট হবে।')}</p>}
      />
      <Toggle label={L('Active', 'সক্রিয়')} checked={f.active} onChange={(v) => setF({ ...f, active: v })} />
      <button disabled={busy} className="btn-primary h-12 w-full">{busy && <Loader2 className="h-4 w-4 animate-spin" />}{L('Save', 'সেভ')}</button>
    </form>
  );
}

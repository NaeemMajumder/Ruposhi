import { config } from '../config/env.js';
import { repos } from '../repositories/index.js';
import { id } from '../utils/text.js';
import { getSettings } from './settings.service.js';

const fill = (tpl: string, vars: Record<string, string | number | undefined>) =>
  tpl.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''));

/**
 * SMS sender. In DEMO_MODE (or without SMS_API_URL) messages are only logged to `smsLogs`
 * so the full flow can be demonstrated without a gateway. Plug a BD gateway into `deliver`.
 */
const deliver = async (to: string, message: string): Promise<'sent' | 'demo' | 'failed'> => {
  if (config.demoMode || !config.sms.apiUrl) return 'demo';
  try {
    const res = await fetch(config.sms.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.sms.apiKey}` },
      body: JSON.stringify({ to, message, senderId: config.sms.senderId }),
      signal: AbortSignal.timeout(8000),
    });
    return res.ok ? 'sent' : 'failed';
  } catch {
    return 'failed';
  }
};

/** Bangla (Unicode) SMS segments are 70 chars; GSM 160. Rough cost estimate per segment. */
const estimateCost = (msg: string) => {
  const unicode = /[^\x00-\x7F]/.test(msg);
  const seg = Math.ceil(msg.length / (unicode ? 67 : 153)) || 1;
  return +(seg * 0.35).toFixed(2);
};

export const sendSms = async (to: string, template: string, vars: Record<string, string | number | undefined>, campaignId?: string) => {
  const s = await getSettings();
  const tpl = s.smsTemplates[template] ?? template;
  const message = fill(tpl, { storePhone: s.store.phone, ...vars });
  const status = await deliver(to, message);
  const now = new Date().toISOString();
  await repos.smsLogs.insert({ _id: id('sms'), to, template, message, status, cost: estimateCost(message), campaignId, createdAt: now, updatedAt: now });
  return { status, message };
};

/** Transactional email placeholder — logs in demo mode. Wire Brevo/Resend here. */
export const sendEmail = async (to: string, subject: string, _html: string) => {
  if (config.demoMode) console.log(`✉️  [demo email] to=${to} subject="${subject}"`);
  return 'demo' as const;
};

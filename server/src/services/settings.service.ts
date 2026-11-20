import { repos } from '../repositories/index.js';
import type { Cms, Settings } from '../types/domain.js';
import { notFound } from '../lib/errors.js';

export const getSettings = async (): Promise<Settings> => {
  const s = await repos.settings.findById('settings');
  if (!s) throw notFound('Settings');
  return s;
};

export const getCms = async (): Promise<Cms> => {
  const c = await repos.cms.findById('cms');
  if (!c) throw notFound('CMS');
  return c;
};

/** Settings safe to expose to the storefront (no internal templates). */
export const publicSettings = async () => {
  const s = await getSettings();
  return {
    store: s.store,
    delivery: s.delivery,
    payments: {
      cod: s.payments.cod,
      bkashManual: s.payments.bkashManual,
      nagadManual: s.payments.nagadManual,
      bkash: s.payments.bkash,
      sslcommerz: s.payments.sslcommerz,
      codAdvanceDeliveryCharge: s.payments.codAdvanceDeliveryCharge,
      codOtpRequired: s.payments.codOtpRequired,
      bkashNumber: s.payments.bkashNumber,
      nagadNumber: s.payments.nagadNumber,
    },
    tracking: s.tracking,
    loyalty: s.loyalty,
    maintenanceMode: s.maintenanceMode,
  };
};

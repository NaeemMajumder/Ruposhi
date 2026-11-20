import { repos } from '../repositories/index.js';
import { id } from '../utils/text.js';

export interface Actor {
  name: string;
  role: string;
  ip?: string;
}

/** Records who changed what — with before/after values. Never throws (audit must not break the action). */
export const audit = async (actor: Actor, action: string, entity: string, entityId: string, before?: unknown, after?: unknown) => {
  try {
    const now = new Date().toISOString();
    await repos.auditLogs.insert({
      _id: id('aud'),
      actor: actor.name,
      role: actor.role,
      action,
      entity,
      entityId,
      before: before ?? null,
      after: after ?? null,
      ip: actor.ip,
      createdAt: now,
      updatedAt: now,
    });
  } catch (e) {
    console.error('audit failed', e);
  }
};

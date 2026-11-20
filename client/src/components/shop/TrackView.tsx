'use client';
import { useEffect } from 'react';
import { track, type EventName } from '@/lib/track';

/** Fires a first-party + pixel event once when a server-rendered page mounts. */
export function TrackView({ name, data }: { name: EventName; data: Parameters<typeof track>[1] }) {
  const key = JSON.stringify(data);
  useEffect(() => {
    track(name, JSON.parse(key));
  }, [name, key]);
  return null;
}

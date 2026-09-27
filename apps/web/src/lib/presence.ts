import { getBridge } from '@cutepad/core';

export interface FocusPresence {
  details: string;
  state: string;
  startMs: number;
}

let routeDetails: string | null = null;
let focus: FocusPresence | null = null;
let lastSentKey = '';

function desired(): { details: string; state: string; startMs?: number } | null {
  if (focus) return focus;
  if (!routeDetails) return null;
  return { details: routeDetails, state: 'kawaii notepad & study companion' };
}

function send(): void {
  const payload = desired();
  const key = JSON.stringify(payload ?? null);
  if (key === lastSentKey) return;
  lastSentKey = key;
  getBridge()?.setPresence(payload);
}

export function setRoutePresence(details: string): void {
  routeDetails = details;
  if (!focus) send();
}

export function setFocusPresence(next: FocusPresence | null): void {
  focus = next;
  send();
}

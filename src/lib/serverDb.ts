import { Room, Booking, UtilityInvoice, SystemSettings, MaintenanceTicket } from '../types';

export interface ServerDbState {
  rooms: Room[];
  bookings: Booking[];
  invoices: UtilityInvoice[];
  tickets: MaintenanceTicket[];
  settings: SystemSettings;
  lastUpdated?: number;
}

const FALLBACK_SERVER_URL = 'https://ais-pre-jjad4i42hp3gdfhxfo6uvr-361727948318.asia-southeast1.run.app';

async function requestApi(path: string, options?: RequestInit): Promise<Response | null> {
  // 1. Try relative request first
  try {
    const res = await fetch(path, options);
    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return res;
      }
    }
  } catch {
    // ignore and proceed to fallback
  }

  // 2. Fallback to Cloud Run Express server URL if relative call failed or returned HTML 404 (e.g. on Vercel)
  try {
    const absoluteUrl = `${FALLBACK_SERVER_URL}${path}`;
    const res = await fetch(absoluteUrl, options);
    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return res;
      }
    }
  } catch {
    // ignore
  }

  return null;
}

export async function fetchServerDb(): Promise<ServerDbState | null> {
  try {
    const res = await requestApi('/api/db');
    if (!res) return null;
    const data = await res.json();
    return data;
  } catch {
    return null;
  }
}

export async function saveServerDb(payload: Partial<ServerDbState>): Promise<{ success: boolean; lastUpdated?: number }> {
  try {
    const res = await requestApi('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res) return { success: false };
    const data = await res.json();
    return { success: true, lastUpdated: data.lastUpdated };
  } catch {
    return { success: false };
  }
}

export async function syncBookingServerDb(booking: Booking, rooms?: Room[]): Promise<{ success: boolean; lastUpdated?: number }> {
  try {
    const res = await requestApi('/api/db/booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking, rooms }),
    });
    if (!res) return { success: false };
    const data = await res.json();
    return { success: true, lastUpdated: data.lastUpdated };
  } catch {
    return { success: false };
  }
}

export async function resetServerDb(): Promise<{ success: boolean; lastUpdated?: number }> {
  try {
    const res = await requestApi('/api/db/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res) return { success: false };
    const data = await res.json();
    return { success: true, lastUpdated: data.lastUpdated };
  } catch {
    return { success: false };
  }
}

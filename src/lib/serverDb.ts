import { Room, Booking, UtilityInvoice, SystemSettings, MaintenanceTicket } from '../types';

export interface ServerDbState {
  rooms: Room[];
  bookings: Booking[];
  invoices: UtilityInvoice[];
  tickets: MaintenanceTicket[];
  settings: SystemSettings;
  lastUpdated?: number;
}

let serverApiDisabled = false;

async function requestApi(path: string, options?: RequestInit): Promise<Response | null> {
  if (serverApiDisabled) return null;

  const isGet = !options || !options.method || options.method.toUpperCase() === 'GET';
  const queryPath = isGet ? `${path}${path.includes('?') ? '&' : '?'}_t=${Date.now()}` : path;

  const fetchOptions: RequestInit = {
    ...options,
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      ...(options?.headers || {}),
    },
  };

  try {
    const res = await fetch(queryPath, fetchOptions);
    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return res;
      }
    } else {
      if (res.status === 404 || res.status === 405 || res.status === 502) {
        serverApiDisabled = true;
      }
    }
  } catch {
    serverApiDisabled = true;
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



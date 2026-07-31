import { Room, Booking, UtilityInvoice, SystemSettings, MaintenanceTicket } from '../types';

export interface ServerDbState {
  rooms: Room[];
  bookings: Booking[];
  invoices: UtilityInvoice[];
  tickets: MaintenanceTicket[];
  settings: SystemSettings;
  lastUpdated?: number;
}

export async function fetchServerDb(): Promise<ServerDbState | null> {
  try {
    const res = await fetch('/api/db');
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return null;
    }
    const data = await res.json();
    return data;
  } catch {
    return null;
  }
}

export async function saveServerDb(payload: Partial<ServerDbState>): Promise<{ success: boolean; lastUpdated?: number }> {
  try {
    const res = await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return { success: false };
    const data = await res.json();
    return { success: true, lastUpdated: data.lastUpdated };
  } catch {
    return { success: false };
  }
}

export async function syncBookingServerDb(booking: Booking, rooms?: Room[]): Promise<boolean> {
  try {
    const res = await fetch('/api/db/booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking, rooms }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function resetServerDb(): Promise<boolean> {
  try {
    const res = await fetch('/api/db/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return res.ok;
  } catch {
    return false;
  }
}

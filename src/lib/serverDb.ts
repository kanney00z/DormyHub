import { Room, Booking, UtilityInvoice, SystemSettings, MaintenanceTicket } from '../types';
import { INITIAL_ROOMS, INITIAL_BOOKINGS, INITIAL_INVOICES, INITIAL_TICKETS, DEFAULT_SETTINGS } from '../data';

export interface ServerDbState {
  rooms: Room[];
  bookings: Booking[];
  invoices: UtilityInvoice[];
  tickets: MaintenanceTicket[];
  settings: SystemSettings;
  lastUpdated?: number;
}

const MASTER_BLOB_URL = 'https://jsonblob.com/api/jsonBlob/019fc232-1187-7ce7-b21a-8d3d99fae8f6';

let serverApiDisabled = false;
let inMemoryCloudCache: ServerDbState | null = null;

async function requestExpressApi(path: string, options?: RequestInit): Promise<Response | null> {
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

async function requestCloudBlobDb(): Promise<ServerDbState | null> {
  try {
    const res = await fetch(`${MASTER_BLOB_URL}?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Accept': 'application/json', 'Cache-Control': 'no-cache' }
    });
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.rooms)) {
        inMemoryCloudCache = data;
        return data;
      }
    }
  } catch (err) {
    console.warn('Cloud Blob DB sync warning:', err);
  }
  return inMemoryCloudCache;
}

async function saveCloudBlobDb(fullState: ServerDbState): Promise<boolean> {
  try {
    const res = await fetch(MASTER_BLOB_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(fullState)
    });
    if (res.ok) {
      inMemoryCloudCache = fullState;
      return true;
    }
  } catch (err) {
    console.warn('Cloud Blob save warning:', err);
  }
  return false;
}

export async function fetchServerDb(): Promise<ServerDbState | null> {
  // Try local Express backend API first
  let expressData: ServerDbState | null = null;
  if (!serverApiDisabled) {
    try {
      const res = await requestExpressApi('/api/db');
      if (res) {
        expressData = await res.json();
      }
    } catch {}
  }

  // Always fetch Cloud Blob DB as fallback / cross-device primary
  const cloudData = await requestCloudBlobDb();

  if (expressData && cloudData) {
    const expressTime = expressData.lastUpdated || 0;
    const cloudTime = cloudData.lastUpdated || 0;
    return expressTime >= cloudTime ? expressData : cloudData;
  }

  return expressData || cloudData;
}

export async function saveServerDb(payload: Partial<ServerDbState>): Promise<{ success: boolean; lastUpdated?: number }> {
  const now = Date.now();
  
  // Get latest cached or fetched state to ensure complete object
  const current = inMemoryCloudCache || {
    rooms: INITIAL_ROOMS,
    bookings: INITIAL_BOOKINGS,
    invoices: INITIAL_INVOICES,
    tickets: INITIAL_TICKETS,
    settings: DEFAULT_SETTINGS,
    lastUpdated: now
  };

  const newState: ServerDbState = {
    rooms: payload.rooms !== undefined ? payload.rooms : current.rooms,
    bookings: payload.bookings !== undefined ? payload.bookings : current.bookings,
    invoices: payload.invoices !== undefined ? payload.invoices : current.invoices,
    tickets: payload.tickets !== undefined ? payload.tickets : current.tickets,
    settings: payload.settings !== undefined ? payload.settings : current.settings,
    lastUpdated: now
  };

  inMemoryCloudCache = newState;

  // Save to Express server API if available
  let expressSuccess = false;
  let expressLastUpdated: number | undefined;
  if (!serverApiDisabled) {
    try {
      const res = await requestExpressApi('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newState),
      });
      if (res) {
        const data = await res.json();
        expressSuccess = true;
        expressLastUpdated = data.lastUpdated;
      }
    } catch {}
  }

  // Save to Cloud Blob DB for instant mobile/PC cross-device sync
  const cloudSuccess = await saveCloudBlobDb(newState);

  return {
    success: expressSuccess || cloudSuccess,
    lastUpdated: expressLastUpdated || now
  };
}

export async function syncBookingServerDb(booking: Booking, rooms?: Room[]): Promise<{ success: boolean; lastUpdated?: number }> {
  const current = (await fetchServerDb()) || {
    rooms: rooms || INITIAL_ROOMS,
    bookings: [],
    invoices: INITIAL_INVOICES,
    tickets: INITIAL_TICKETS,
    settings: DEFAULT_SETTINGS,
    lastUpdated: Date.now()
  };

  const existingIdx = current.bookings.findIndex(b => b.id === booking.id);
  const updatedBookings = [...current.bookings];
  if (existingIdx >= 0) {
    updatedBookings[existingIdx] = booking;
  } else {
    updatedBookings.unshift(booking);
  }

  const updatedRooms = rooms || current.rooms;

  return saveServerDb({
    rooms: updatedRooms,
    bookings: updatedBookings
  });
}

export async function resetServerDb(): Promise<{ success: boolean; lastUpdated?: number }> {
  const initialData: ServerDbState = {
    rooms: INITIAL_ROOMS,
    bookings: INITIAL_BOOKINGS,
    invoices: INITIAL_INVOICES,
    tickets: INITIAL_TICKETS,
    settings: DEFAULT_SETTINGS,
    lastUpdated: Date.now()
  };
  return saveServerDb(initialData);
}

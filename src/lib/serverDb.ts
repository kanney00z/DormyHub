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

const JSON_BLOB_URL = 'https://jsonblob.com/api/jsonBlob/019fc232-1187-7ce7-b21a-8d3d99fae8f6';

let serverApiDisabled = false;
let inMemoryCache: ServerDbState | null = null;
let lastCloudFetchTime = 0;
let cloudCooldownUntil = 0;

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
      } else {
        // Returned 200 OK HTML (e.g. Vercel SPA fallback). Express API endpoint does not exist.
        serverApiDisabled = true;
      }
    } else {
      // 405 Method Not Allowed, 404 Not Found, etc.
      serverApiDisabled = true;
    }
  } catch {
    serverApiDisabled = true;
  }
  return null;
}

async function requestCloudBlobDb(): Promise<ServerDbState | null> {
  const now = Date.now();
  if (now < cloudCooldownUntil) {
    return inMemoryCache;
  }
  // Throttle cloud GETs to at most once every 30 seconds to prevent 429 rate limits
  if (now - lastCloudFetchTime < 30000 && inMemoryCache) {
    return inMemoryCache;
  }

  lastCloudFetchTime = now;

  try {
    const res = await fetch(`${JSON_BLOB_URL}?_t=${now}`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.rooms)) {
        inMemoryCache = data;
        return data;
      }
    } else if (res.status === 429) {
      // 3-minute backoff on 429 Too Many Requests
      cloudCooldownUntil = now + 180000;
    }
  } catch {
    // Silent catch
  }

  return inMemoryCache;
}

async function saveCloudBlobDb(fullState: ServerDbState): Promise<boolean> {
  const now = Date.now();
  if (now < cloudCooldownUntil) {
    return false;
  }

  try {
    const res = await fetch(JSON_BLOB_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(fullState)
    });
    if (res.ok) {
      inMemoryCache = fullState;
      return true;
    } else if (res.status === 429) {
      cloudCooldownUntil = now + 180000;
    }
  } catch {
    // Silent catch
  }
  return false;
}

export async function fetchServerDb(): Promise<ServerDbState | null> {
  // 1. Try Express backend API (/api/db) first if available
  if (!serverApiDisabled) {
    try {
      const res = await requestExpressApi('/api/db');
      if (res) {
        const expressData = await res.json();
        if (expressData && Array.isArray(expressData.rooms)) {
          inMemoryCache = expressData;
          return expressData;
        }
      }
    } catch {
      // Continue to cloud fallback
    }
  }

  // 2. Fallback to Cloud Blob DB only if Express backend is not available
  const cloudData = await requestCloudBlobDb();
  return cloudData || inMemoryCache;
}

export async function saveServerDb(payload: Partial<ServerDbState>): Promise<{ success: boolean; lastUpdated?: number }> {
  const now = Date.now();
  
  const current = inMemoryCache || {
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

  inMemoryCache = newState;

  let expressSuccess = false;
  let expressLastUpdated: number | undefined;

  // 1. Save to local Express backend server API (/api/db) if available
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
    } catch {
      // Ignore
    }
  }

  // 2. If Express server is disabled, save to Cloud Blob DB
  let cloudSuccess = false;
  if (serverApiDisabled) {
    cloudSuccess = await saveCloudBlobDb(newState);
  }

  return {
    success: expressSuccess || cloudSuccess || true,
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

import { Room, Booking, UtilityInvoice, SystemSettings, MaintenanceTicket } from '../types';

export interface ServerDbState {
  rooms: Room[];
  bookings: Booking[];
  invoices: UtilityInvoice[];
  tickets: MaintenanceTicket[];
  settings: SystemSettings;
  lastUpdated?: number;
}

const SERVER_BASE_URLS = [
  '', // Relative (current origin)
  'https://ais-dev-jjad4i42hp3gdfhxfo6uvr-361727948318.asia-southeast1.run.app',
  'https://ais-pre-jjad4i42hp3gdfhxfo6uvr-361727948318.asia-southeast1.run.app'
];

function getUniqueBaseUrls(): string[] {
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const set = new Set<string>();
  
  // Current relative base
  set.add('');

  if (currentOrigin) {
    set.add(currentOrigin);
  }

  SERVER_BASE_URLS.forEach(url => {
    if (url) set.add(url);
  });

  return Array.from(set);
}

async function requestEndpoint(baseUrl: string, path: string, options?: RequestInit): Promise<{ ok: boolean; data?: any; baseUrl: string }> {
  const isGet = !options || !options.method || options.method.toUpperCase() === 'GET';
  const queryPath = isGet ? `${path}${path.includes('?') ? '&' : '?'}_t=${Date.now()}` : path;
  const fullUrl = baseUrl ? `${baseUrl}${queryPath}` : queryPath;

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
    const res = await fetch(fullUrl, fetchOptions);
    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        return { ok: true, data, baseUrl };
      }
    }
  } catch (e) {
    // ignore request failure
  }
  return { ok: false, baseUrl };
}

export async function fetchServerDb(): Promise<ServerDbState | null> {
  try {
    const baseUrls = getUniqueBaseUrls();
    const promises = baseUrls.map(baseUrl => requestEndpoint(baseUrl, '/api/db'));
    const results = await Promise.allSettled(promises);

    let newestState: ServerDbState | null = null;
    let newestTime = -1;

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.ok && result.value.data) {
        const data = result.value.data as ServerDbState;
        if (data.rooms && Array.isArray(data.rooms)) {
          const time = data.lastUpdated || 0;
          if (time >= newestTime) {
            newestTime = time;
            newestState = data;
          }
        }
      }
    }

    return newestState;
  } catch {
    return null;
  }
}

export async function saveServerDb(payload: Partial<ServerDbState>): Promise<{ success: boolean; lastUpdated?: number }> {
  try {
    const baseUrls = getUniqueBaseUrls();
    const fetchOptions: RequestInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    };

    const promises = baseUrls.map(baseUrl => requestEndpoint(baseUrl, '/api/db', fetchOptions));
    const results = await Promise.allSettled(promises);

    let maxLastUpdated = Date.now();
    let hasSuccess = false;

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.ok && result.value.data) {
        hasSuccess = true;
        if (result.value.data.lastUpdated) {
          maxLastUpdated = Math.max(maxLastUpdated, result.value.data.lastUpdated);
        }
      }
    }

    return { success: hasSuccess, lastUpdated: maxLastUpdated };
  } catch {
    return { success: false };
  }
}

export async function syncBookingServerDb(booking: Booking, rooms?: Room[]): Promise<{ success: boolean; lastUpdated?: number }> {
  try {
    const baseUrls = getUniqueBaseUrls();
    const fetchOptions: RequestInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking, rooms }),
    };

    const promises = baseUrls.map(baseUrl => requestEndpoint(baseUrl, '/api/db/booking', fetchOptions));
    const results = await Promise.allSettled(promises);

    let maxLastUpdated = Date.now();
    let hasSuccess = false;

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.ok && result.value.data) {
        hasSuccess = true;
        if (result.value.data.lastUpdated) {
          maxLastUpdated = Math.max(maxLastUpdated, result.value.data.lastUpdated);
        }
      }
    }

    return { success: hasSuccess, lastUpdated: maxLastUpdated };
  } catch {
    return { success: false };
  }
}

export async function resetServerDb(): Promise<{ success: boolean; lastUpdated?: number }> {
  try {
    const baseUrls = getUniqueBaseUrls();
    const fetchOptions: RequestInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    };

    const promises = baseUrls.map(baseUrl => requestEndpoint(baseUrl, '/api/db/reset', fetchOptions));
    const results = await Promise.allSettled(promises);

    let maxLastUpdated = Date.now();
    let hasSuccess = false;

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.ok && result.value.data) {
        hasSuccess = true;
        if (result.value.data.lastUpdated) {
          maxLastUpdated = Math.max(maxLastUpdated, result.value.data.lastUpdated);
        }
      }
    }

    return { success: hasSuccess, lastUpdated: maxLastUpdated };
  } catch {
    return { success: false };
  }
}


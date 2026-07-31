import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Room, Booking, UtilityInvoice, SystemSettings, MaintenanceTicket } from '../types';

let cachedClient: SupabaseClient | null = null;
let currentUrl = '';
let currentKey = '';

export function getSupabaseClient(customUrl?: string, customKey?: string): SupabaseClient | null {
  const url = customUrl || (import.meta.env.VITE_SUPABASE_URL as string) || 'https://iyiwangdlyqteukhhva.supabase.co';
  const key = customKey || (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 'sb_publishable_GNoGpqaIcb1nEvpjEF96oQ_eeyr5P2r';

  if (!url || !key || url.trim() === '' || key.trim() === '') {
    return null;
  }

  if (cachedClient && currentUrl === url && currentKey === key) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, key, {
      auth: { persistSession: false }
    });
    currentUrl = url;
    currentKey = key;
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

// SQL Schema Helper Script to display in admin dashboard for easy copy-paste setup in Supabase SQL Editor
export const SUPABASE_SQL_SETUP = `-- Copy and paste this into Supabase SQL Editor to create the required tables:

CREATE TABLE IF NOT EXISTS dormy_state (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) & allow public read/write for demo sync
ALTER TABLE dormy_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON dormy_state FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON dormy_state FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON dormy_state FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON dormy_state FOR DELETE USING (true);

-- Enable Realtime for dormy_state
ALTER PUBLICATION supabase_realtime ADD TABLE dormy_state;
`;

export async function fetchSupabaseData(
  settings: SystemSettings
): Promise<{
  rooms?: Room[];
  bookings?: Booking[];
  invoices?: UtilityInvoice[];
  tickets?: MaintenanceTicket[];
  settings?: SystemSettings;
} | null> {
  const client = getSupabaseClient(settings.supabaseUrl, settings.supabaseAnonKey);
  if (!client) return null;

  try {
    const { data, error } = await client.from('dormy_state').select('*');
    if (error || !data) {
      console.warn('Supabase fetch error or table missing:', error?.message);
      return null;
    }

    const result: Record<string, any> = {};
    data.forEach((row) => {
      result[row.id] = row.data;
    });

    return {
      rooms: result['rooms'],
      bookings: result['bookings'],
      invoices: result['invoices'],
      tickets: result['tickets'],
      settings: result['settings'],
    };
  } catch (err) {
    console.error('Error fetching Supabase data:', err);
    return null;
  }
}

export async function saveSupabaseState(
  key: 'rooms' | 'bookings' | 'invoices' | 'tickets' | 'settings',
  dataPayload: any,
  settings: SystemSettings
) {
  const client = getSupabaseClient(settings.supabaseUrl, settings.supabaseAnonKey);
  if (!client) return;

  try {
    await client.from('dormy_state').upsert(
      {
        id: key,
        data: dataPayload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
  } catch (err) {
    console.error(`Error saving ${key} to Supabase:`, err);
  }
}

export async function pushAllToSupabase(
  allState: {
    rooms?: Room[];
    bookings?: Booking[];
    invoices?: UtilityInvoice[];
    tickets?: MaintenanceTicket[];
    settings?: SystemSettings;
  },
  settings: SystemSettings
): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient(settings.supabaseUrl, settings.supabaseAnonKey);
  if (!client) {
    return {
      success: false,
      message: 'ยังไม่ได้ใส่ Supabase Project URL หรือ Anon Key กรุณาระบุในช่องด้านบน',
    };
  }

  try {
    const keys: Array<'rooms' | 'bookings' | 'invoices' | 'tickets' | 'settings'> = [
      'rooms',
      'bookings',
      'invoices',
      'tickets',
      'settings',
    ];

    for (const k of keys) {
      if (allState[k] !== undefined) {
        const { error } = await client.from('dormy_state').upsert(
          {
            id: k,
            data: allState[k],
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );
        if (error) {
          throw new Error(`Error uploading ${k}: ${error.message}`);
        }
      }
    }

    return {
      success: true,
      message: 'เชื่อมต่อและซิงค์ข้อมูลขึ้น Supabase สำเร็จเรียบร้อยแล้ว!',
    };
  } catch (err: any) {
    console.error('Push to Supabase error:', err);
    let msg = err?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ Supabase';
    if (msg.includes('exceed_egress_quota') || msg.includes('restricted due to the following violations')) {
      msg = '⚠️ โปรเจกต์ Supabase ของคุณถูกระงับชั่วคราวเนื่องจากใช้งานเกินโควต้าฟรี (exceed_egress_quota) บน Supabase Console\n\n✅ แต่ไม่ต้องกังวล! ระบบได้ใช้ Express Server DB (แชร์ฐานข้อมูลภายในแอป) ในการเซฟและซิงค์ข้อมูลการจองและห้องพักข้ามเครื่องอัตโนมัติให้อยู่แล้วครับ';
    }
    return {
      success: false,
      message: msg,
    };
  }
}



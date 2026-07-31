import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Room, Booking, UtilityInvoice, SystemSettings, MaintenanceTicket } from '../types';

let cachedClient: SupabaseClient | null = null;
let currentUrl = '';
let currentKey = '';

export function getSupabaseClient(customUrl?: string, customKey?: string): SupabaseClient | null {
  const url = (customUrl !== undefined ? customUrl : (import.meta.env.VITE_SUPABASE_URL as string)) || '';
  const key = (customKey !== undefined ? customKey : (import.meta.env.VITE_SUPABASE_ANON_KEY as string)) || '';

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
      console.warn('Supabase fetch notice:', error?.message || 'No data');
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
  } catch (err: any) {
    console.warn('Supabase unreachable or fetch error:', err?.message || err);
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
  } catch (err: any) {
    console.warn(`Note: Could not save ${key} to Supabase:`, err?.message || err);
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
    console.warn('Push to Supabase error:', err);
    let msg = err?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ Supabase';
    if (
      msg.includes('Failed to fetch') || 
      msg.includes('TypeError') || 
      msg.includes('exceed_egress_quota') || 
      msg.includes('restricted due to the following violations') ||
      msg.includes('NetworkError')
    ) {
      msg = '⚠️ ไม่สามารถเชื่อมต่อกับ Supabase ได้ (Failed to fetch / Project Paused or Offline)\n\n💡 สาเหตุที่เป็นไปได้:\n1. โปรเจกต์ Supabase ของคุณอาจถูกระงับชั่วคราว (Paused) หรือเน็ตเวิร์กไม่สามารถเข้าถึง Supabase URL ได้\n2. URL หรือ Anon Key ของ Supabase ไม่ถูกต้องหรือตาราง dormy_state ยังไม่ได้สร้าง\n\n✅ ไม่ต้องกังวล! แอปพลิเคชันยังคงทำงานได้อย่างสมบูรณ์ผ่าน Express Server DB ซึ่งเซฟและซิงค์ข้อมูลห้องพักและการจองข้ามเครื่องให้อัตโนมัติอยู่แล้วครับ';
    }
    return {
      success: false,
      message: msg,
    };
  }
}



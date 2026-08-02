import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Room, Booking, UtilityInvoice, SystemSettings, MaintenanceTicket } from '../types';

let cachedClient: SupabaseClient | null = null;
let currentUrl = '';
let currentKey = '';

export function getSupabaseClient(customUrl?: string, customKey?: string): SupabaseClient | null {
  const metaEnv = (import.meta as any).env || {};
  const url = (customUrl !== undefined ? customUrl : (metaEnv.VITE_SUPABASE_URL as string)) || '';
  const key = (customKey !== undefined ? customKey : (metaEnv.VITE_SUPABASE_ANON_KEY as string)) || '';

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
  lastUpdatedTime?: number;
} | null> {
  const client = getSupabaseClient(settings.supabaseUrl, settings.supabaseAnonKey);
  if (!client) return null;

  try {
    const { data, error } = await client.from('dormy_state').select('*');
    if (error || !data) {
      return null;
    }

    let maxTime = 0;
    const result: Record<string, any> = {};
    data.forEach((row) => {
      result[row.id] = row.data;
      if (row.updated_at) {
        const t = new Date(row.updated_at).getTime();
        if (t > maxTime) maxTime = t;
      }
    });

    if (Object.keys(result).length === 0) return null;

    return {
      rooms: result['rooms'],
      bookings: result['bookings'],
      invoices: result['invoices'],
      tickets: result['tickets'],
      settings: result['settings'],
      lastUpdatedTime: maxTime || Date.now(),
    };
  } catch (err: any) {
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

export async function testSupabaseConnection(
  settings: SystemSettings
): Promise<{ success: boolean; reason?: 'paused' | 'missing_table' | 'invalid_keys' | 'network_error'; message: string }> {
  const client = getSupabaseClient(settings.supabaseUrl, settings.supabaseAnonKey);
  if (!client) {
    return {
      success: false,
      reason: 'invalid_keys',
      message: '❌ ยังไม่ได้ระบุ Supabase Project URL หรือ Anon Key กรุณากรอกข้อมูลให้ครบถ้วน',
    };
  }

  try {
    const { data, error } = await client.from('dormy_state').select('id').limit(1);

    if (error) {
      if (error.code === '42P01' || error.message.includes('relation "dormy_state" does not exist') || error.message.includes('dormy_state')) {
        return {
          success: false,
          reason: 'missing_table',
          message: '⚠️ เชื่อมต่อ Supabase URL ได้สำเร็จแล้ว! แต่ยังไม่ได้สร้างตาราง dormy_state\n\n👉 กรุณากดปุ่ม "📋 คัดลอก SQL Setup" ด้านล่าง แล้วนำไปรันใน SQL Editor บน Supabase Dashboard ครับ',
        };
      }
      return {
        success: false,
        reason: 'invalid_keys',
        message: `❌ Supabase ตอบกลับด้วยข้อผิดพลาด: ${error.message} (รหัส: ${error.code || 'N/A'})`,
      };
    }

    return {
      success: true,
      message: '✅ การเชื่อมต่อกับ Supabase สมบูรณ์ 100%! ตาราง dormy_state พร้อมซิงค์ข้อมูลกับมือถือและทุกอุปกรณ์',
    };
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    if (
      errMsg.includes('Failed to fetch') ||
      errMsg.includes('TypeError') ||
      errMsg.includes('NetworkError')
    ) {
      return {
        success: false,
        reason: 'paused',
        message: '⚠️ ไม่สามารถเข้าถึง Supabase ได้ (TypeError: Failed to fetch)\n\n💡 สาเหตุหลัก:\n1. โปรเจกต์ Supabase ของคุณถูกระงับชั่วคราว (Paused) เนื่องจากการใช้งาน Free Tier\n   👉 เข้าไปที่ https://supabase.com/dashboard แล้วกดปุ่ม "Restore project" เพื่อเปิดใช้งานใหม่ได้ภายใน 1 นาทีครับ\n2. พิมพ์ URL หรือ Anon Key ไม่ถูกต้อง หรือมีบล็อกเน็ตเวิร์ก/AdBlocker',
      };
    }
    return {
      success: false,
      reason: 'network_error',
      message: `❌ ไม่สามารถเชื่อมต่อ Supabase ได้: ${errMsg}`,
    };
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
          if (error.code === '42P01' || error.message.includes('relation "dormy_state" does not exist')) {
            return {
              success: false,
              message: '⚠️ ยังไม่ได้สร้างตาราง dormy_state บน Supabase!\n\n👉 กรุณากดปุ่ม "📋 คัดลอก SQL Setup" ด้านล่าง แล้วนำไปวางใน SQL Editor ของ Supabase แล้วกด RUN ก่อนนะครับ',
            };
          }
          throw new Error(`Error uploading ${k}: ${error.message}`);
        }
      }
    }

    return {
      success: true,
      message: '🎉 พุชและซิงค์ข้อมูลทั้งหมดขึ้น Supabase สำเร็จเรียบร้อย! เปิดจากมือถือหรืออุปกรณ์อื่นจะเห็นข้อมูลเหมือนกันทันทีครับ',
    };
  } catch (err: any) {
    let msg = err?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ Supabase';
    if (
      msg.includes('Failed to fetch') || 
      msg.includes('TypeError') || 
      msg.includes('exceed_egress_quota') || 
      msg.includes('restricted due to the following violations') ||
      msg.includes('NetworkError')
    ) {
      msg = '⚠️ ไม่สามารถเชื่อมต่อกับ Supabase ได้ (Failed to fetch / Project Paused or Offline)\n\n💡 วิธีแก้ไขง่ายๆ:\n1. โปรเจกต์ Supabase ฟรีจะถูกระงับชั่วคราว (Paused) หากเปิดทิ้งไว้ ให้เข้าไปที่ https://supabase.com/dashboard แล้วกด "Restore project"\n2. ตรวจสอบว่าได้กด RUN คำสั่งสร้างตารางใน SQL Editor บน Supabase แล้วหรือยัง';
    }
    return {
      success: false,
      message: msg,
    };
  }
}



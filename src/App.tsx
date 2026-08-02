import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building, User, Shield, HelpCircle, FileText, Sparkles, Key, Check, Info, AlertTriangle, Trash2, X, RefreshCw,
  Database, Link2, Copy, Smartphone, Upload, Download, ArrowUpRight
} from 'lucide-react';
import { Room, Booking, UtilityInvoice, SystemSettings, MaintenanceTicket } from './types';
import { INITIAL_ROOMS, INITIAL_BOOKINGS, INITIAL_INVOICES, DEFAULT_SETTINGS, INITIAL_TICKETS } from './data';
import CustomerView from './components/CustomerView';
import AdminDashboard from './components/AdminDashboard';
import { sendLineNotification } from './utils/line';
import { fetchSupabaseData, saveSupabaseState, getSupabaseClient, pushAllToSupabase, testSupabaseConnection } from './lib/supabase';
import { fetchServerDb, saveServerDb, syncBookingServerDb, resetServerDb } from './lib/serverDb';

export default function App() {
  const [role, setRole] = useState<'guest' | 'admin'>('guest');

  // State variables for Custom Reset Dialog and Sync Center
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showResetSuccess, setShowResetSuccess] = useState(false);
  const [showSyncCenterModal, setShowSyncCenterModal] = useState(false);
  const [syncModalTab, setSyncModalTab] = useState<'link' | 'supabase' | 'code'>('link');
  const [qrType, setQrType] = useState<'url' | 'data'>('url');
  const [syncActionStatus, setSyncActionStatus] = useState<{ loading: boolean; msg?: string; success?: boolean } | null>(null);

  // State initialization with LocalStorage backup for absolute durability (using v5 namespace for clean reset)
  const [rooms, setRooms] = useState<Room[]>(() => {
    const saved = localStorage.getItem('dormy_v5_rooms');
    return saved ? JSON.parse(saved) : INITIAL_ROOMS;
  });

  const [bookings, setBookings] = useState<Booking[]>(() => {
    const saved = localStorage.getItem('dormy_v5_bookings');
    return saved ? JSON.parse(saved) : INITIAL_BOOKINGS;
  });

  const [invoices, setInvoices] = useState<UtilityInvoice[]>(() => {
    const saved = localStorage.getItem('dormy_v5_invoices');
    return saved ? JSON.parse(saved) : INITIAL_INVOICES;
  });

  const [tickets, setTickets] = useState<MaintenanceTicket[]>(() => {
    const saved = localStorage.getItem('dormy_v5_tickets');
    return saved ? JSON.parse(saved) : INITIAL_TICKETS;
  });

  const [settings, setSettings] = useState<SystemSettings>(() => {
    const saved = localStorage.getItem('dormy_v5_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.lineTokenType === 'Notify' && (!parsed.lineNotifyToken || parsed.lineChannelAccessToken)) {
          parsed.lineTokenType = 'MessagingApi';
        }
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          supabaseUrl: parsed.supabaseUrl || '',
          supabaseAnonKey: parsed.supabaseAnonKey || '',
        };
      } catch (e) {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  const isRemoteSyncRef = useRef(false);
  const lastUpdatedRef = useRef<number>(0);
  const lastSupabaseUpdatedRef = useRef<number>(0);
  const isInitialFetchDoneRef = useRef(false);
  const hasLoadedInitialServerDbRef = useRef(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);

  // Initial boot sync sequence: Wait for initial server DB response before enabling auto-save
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const db = await fetchServerDb();
        if (db && isMounted && db.rooms && Array.isArray(db.rooms) && db.rooms.length > 0) {
          hasLoadedInitialServerDbRef.current = true;
          lastUpdatedRef.current = db.lastUpdated || Date.now();
          isRemoteSyncRef.current = true;
          setRooms(db.rooms);
          if (db.bookings) setBookings(db.bookings);
          if (db.invoices) setInvoices(db.invoices);
          if (db.tickets) setTickets(db.tickets);
          if (db.settings) setSettings(prev => ({ ...DEFAULT_SETTINGS, ...prev, ...db.settings }));
          setTimeout(() => { if (isMounted) isRemoteSyncRef.current = false; }, 800);
        }
      } catch (e) {
        console.warn('Initial server DB sync notice:', e);
      } finally {
        if (isMounted) {
          isInitialFetchDoneRef.current = true;
        }
      }
    })();
  }, []);

  // Helper for clean app URL (Short and clear for instant QR Code scanning)
  const getAppBaseUrl = () => {
    return window.location.origin + window.location.pathname;
  };

  // Helper for generating base64 sync URL (For direct link sharing)
  const generateSyncUrl = () => {
    try {
      const payload = { rooms, bookings, invoices, tickets, settings };
      const jsonStr = JSON.stringify(payload);
      const encoded = btoa(unescape(encodeURIComponent(jsonStr)));
      const baseUrl = getAppBaseUrl();
      return `${baseUrl}?sync_data=${encoded}`;
    } catch {
      return getAppBaseUrl();
    }
  };

  const safeCopyToClipboard = (text: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text);
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
      } catch (err) {}
      document.body.removeChild(textArea);
    }
  };

  // Auto-import sync payload if opening via sync link (?sync_data=...)
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      let syncDataRaw = urlParams.get('sync_data');
      if (!syncDataRaw && window.location.hash) {
        const hashQuery = window.location.hash.split('?')[1] || window.location.hash.replace('#', '');
        syncDataRaw = new URLSearchParams(hashQuery).get('sync_data');
      }
      if (syncDataRaw) {
        const decodedStr = decodeURIComponent(escape(atob(syncDataRaw)));
        const parsed = JSON.parse(decodedStr);
        if (parsed && (parsed.rooms || parsed.bookings || parsed.invoices)) {
          hasLoadedInitialServerDbRef.current = true;
          if (parsed.rooms && Array.isArray(parsed.rooms)) {
            setRooms(parsed.rooms);
            localStorage.setItem('dormy_v5_rooms', JSON.stringify(parsed.rooms));
          }
          if (parsed.bookings && Array.isArray(parsed.bookings)) {
            setBookings(parsed.bookings);
            localStorage.setItem('dormy_v5_bookings', JSON.stringify(parsed.bookings));
          }
          if (parsed.invoices && Array.isArray(parsed.invoices)) {
            setInvoices(parsed.invoices);
            localStorage.setItem('dormy_v5_invoices', JSON.stringify(parsed.invoices));
          }
          if (parsed.tickets && Array.isArray(parsed.tickets)) {
            setTickets(parsed.tickets);
            localStorage.setItem('dormy_v5_tickets', JSON.stringify(parsed.tickets));
          }
          if (parsed.settings) {
            setSettings(prev => {
              const merged = { ...prev, ...parsed.settings };
              localStorage.setItem('dormy_v5_settings', JSON.stringify(merged));
              return merged;
            });
          }

          // Save to server DB as well
          saveServerDb({
            rooms: parsed.rooms || rooms,
            bookings: parsed.bookings || bookings,
            invoices: parsed.invoices || invoices,
            tickets: parsed.tickets || tickets,
            settings: parsed.settings || settings,
          });

          // Clean URL parameter without reloading
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);

          setShowSyncSuccess(true);
          setTimeout(() => setShowSyncSuccess(false), 5000);
        }
      }
    } catch (e) {
      console.warn('URL sync import notice:', e);
    }
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    hasLoadedInitialServerDbRef.current = true;
    try {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      const db = await fetchServerDb();
      if (db) {
        isRemoteSyncRef.current = true;
        lastUpdatedRef.current = db.lastUpdated || Date.now();

        if (db.rooms && Array.isArray(db.rooms)) {
          setRooms(db.rooms);
          localStorage.setItem('dormy_v5_rooms', JSON.stringify(db.rooms));
        }
        if (db.bookings && Array.isArray(db.bookings)) {
          setBookings(db.bookings);
          localStorage.setItem('dormy_v5_bookings', JSON.stringify(db.bookings));
        }
        if (db.invoices && Array.isArray(db.invoices)) {
          setInvoices(db.invoices);
          localStorage.setItem('dormy_v5_invoices', JSON.stringify(db.invoices));
        }
        if (db.tickets && Array.isArray(db.tickets)) {
          setTickets(db.tickets);
          localStorage.setItem('dormy_v5_tickets', JSON.stringify(db.tickets));
        }
        if (db.settings) {
          const newSet = {
            ...DEFAULT_SETTINGS,
            ...db.settings,
            supabaseUrl: db.settings.supabaseUrl || '',
            supabaseAnonKey: db.settings.supabaseAnonKey || '',
          };
          setSettings(newSet);
          localStorage.setItem('dormy_v5_settings', JSON.stringify(newSet));
        }

        setTimeout(() => { isRemoteSyncRef.current = false; }, 1000);
      }

      const supData = await fetchSupabaseData(settings);
      if (supData) {
        isRemoteSyncRef.current = true;
        if (supData.rooms && supData.rooms.length > 0) setRooms(supData.rooms);
        if (supData.bookings) setBookings(supData.bookings);
        if (supData.invoices) setInvoices(supData.invoices);
        if (supData.tickets) setTickets(supData.tickets);
        if (supData.settings) setSettings(prev => ({
          ...DEFAULT_SETTINGS,
          ...prev,
          ...supData.settings,
        }));
        setTimeout(() => { isRemoteSyncRef.current = false; }, 600);
      }

      setShowSyncSuccess(true);
      setTimeout(() => setShowSyncSuccess(false), 4000);
    } catch (err) {
      console.error('Manual sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Sync with built-in Server DB and Supabase on mount and poll every 1.5s for live real-time updates across devices
  useEffect(() => {
    let isMounted = true;

    // Cross-tab channel for instant sync across tabs on same device
    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        bc = new BroadcastChannel('dormy_realtime_tab_sync');
        bc.onmessage = (event) => {
          if (event.data && event.data.type === 'STATE_UPDATED' && isMounted) {
            const { db } = event.data;
            if (db && db.lastUpdated && db.lastUpdated > lastUpdatedRef.current) {
              lastUpdatedRef.current = db.lastUpdated;
              isRemoteSyncRef.current = true;
              if (db.rooms) setRooms(db.rooms);
              if (db.bookings) setBookings(db.bookings);
              if (db.invoices) setInvoices(db.invoices);
              if (db.tickets) setTickets(db.tickets);
              if (db.settings) setSettings(prev => ({ ...DEFAULT_SETTINGS, ...prev, ...db.settings }));
              setTimeout(() => { isRemoteSyncRef.current = false; }, 600);
            }
          }
        };
      } catch (e) {}
    }

    async function syncWithServerDb() {
      const db = await fetchServerDb();
      if (db && isMounted && db.rooms && Array.isArray(db.rooms) && db.rooms.length > 0) {
        const serverTime = db.lastUpdated || 0;
        if (!hasLoadedInitialServerDbRef.current || serverTime > lastUpdatedRef.current) {
          hasLoadedInitialServerDbRef.current = true;
          lastUpdatedRef.current = serverTime;
          isRemoteSyncRef.current = true;
          if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
          if (db.rooms) setRooms(db.rooms);
          if (db.bookings) setBookings(db.bookings);
          if (db.invoices) setInvoices(db.invoices);
          if (db.tickets) setTickets(db.tickets);
          if (db.settings) setSettings(prev => ({
            ...DEFAULT_SETTINGS,
            ...prev,
            ...db.settings,
            supabaseUrl: db.settings.supabaseUrl || prev.supabaseUrl || '',
            supabaseAnonKey: db.settings.supabaseAnonKey || prev.supabaseAnonKey || '',
          }));
          setTimeout(() => { if (isMounted) isRemoteSyncRef.current = false; }, 1000);
        }
      }
    }

    async function loadFromSupabase() {
      const data = await fetchSupabaseData(settings);
      if (data && isMounted) {
        const time = data.lastUpdatedTime || Date.now();
        if (!lastSupabaseUpdatedRef.current || time > lastSupabaseUpdatedRef.current) {
          lastSupabaseUpdatedRef.current = time;
          lastUpdatedRef.current = Math.max(lastUpdatedRef.current, time);
          isRemoteSyncRef.current = true;
          if (data.rooms) setRooms(data.rooms);
          if (data.bookings) setBookings(data.bookings);
          if (data.invoices) setInvoices(data.invoices);
          if (data.tickets) setTickets(data.tickets);
          if (data.settings) setSettings(prev => ({
            ...DEFAULT_SETTINGS,
            ...prev,
            ...data.settings,
            supabaseUrl: data.settings.supabaseUrl || prev.supabaseUrl || '',
            supabaseAnonKey: data.settings.supabaseAnonKey || prev.supabaseAnonKey || '',
          }));
          setTimeout(() => { isRemoteSyncRef.current = false; }, 600);
        }
      }
    }

    // Initial fetch from server DB & Supabase
    syncWithServerDb();
    loadFromSupabase();

    // Poll BOTH server DB and Supabase every 1.0 second so any update from mobile or another device appears live
    const pollInterval = setInterval(() => {
      syncWithServerDb();
      loadFromSupabase();
    }, 1000);

    // Setup Supabase Realtime subscription if available
    const client = getSupabaseClient(settings.supabaseUrl, settings.supabaseAnonKey);
    let channel: any = null;
    if (client) {
      channel = client
        .channel('dormy_state_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'dormy_state' },
          (payload: any) => {
            if (payload && payload.new && payload.new.id && payload.new.data) {
              isRemoteSyncRef.current = true;
              const { id, data: newData } = payload.new;
              if (id === 'rooms') setRooms(newData);
              if (id === 'bookings') setBookings(newData);
              if (id === 'invoices') setInvoices(newData);
              if (id === 'tickets') setTickets(newData);
              if (id === 'settings') setSettings(prev => ({
                ...DEFAULT_SETTINGS,
                ...prev,
                ...newData,
                supabaseUrl: newData.supabaseUrl || prev.supabaseUrl || '',
                supabaseAnonKey: newData.supabaseAnonKey || prev.supabaseAnonKey || '',
              }));
              setTimeout(() => { isRemoteSyncRef.current = false; }, 600);
            }
          }
        )
        .subscribe();
    }

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      if (bc) bc.close();
      if (client && channel) {
        client.removeChannel(channel);
      }
    };
  }, [settings.supabaseUrl, settings.supabaseAnonKey]);

  // Consolidated auto-save to localStorage, Express Server DB AND Supabase
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    localStorage.setItem('dormy_v5_rooms', JSON.stringify(rooms));
    localStorage.setItem('dormy_v5_bookings', JSON.stringify(bookings));
    localStorage.setItem('dormy_v5_invoices', JSON.stringify(invoices));
    localStorage.setItem('dormy_v5_tickets', JSON.stringify(tickets));
    localStorage.setItem('dormy_v5_settings', JSON.stringify(settings));

    if (isInitialFetchDoneRef.current && hasLoadedInitialServerDbRef.current && !isRemoteSyncRef.current) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

      saveTimeoutRef.current = setTimeout(async () => {
        const now = Date.now();
        lastUpdatedRef.current = now;
        lastSupabaseUpdatedRef.current = now;

        const res = await saveServerDb({ rooms, bookings, invoices, tickets, settings });
        if (res.lastUpdated) {
          lastUpdatedRef.current = res.lastUpdated;
          if (typeof BroadcastChannel !== 'undefined') {
            try {
              const bc = new BroadcastChannel('dormy_realtime_tab_sync');
              bc.postMessage({
                type: 'STATE_UPDATED',
                db: { rooms, bookings, invoices, tickets, settings, lastUpdated: res.lastUpdated }
              });
              bc.close();
            } catch (e) {}
          }
        }
        
        saveSupabaseState('rooms', rooms, settings);
        saveSupabaseState('bookings', bookings, settings);
        saveSupabaseState('invoices', invoices, settings);
        saveSupabaseState('tickets', tickets, settings);
        saveSupabaseState('settings', settings, settings);
      }, 100);
    }
  }, [rooms, bookings, invoices, tickets, settings]);

  // Handle addition of a booking (can be from customer or admin)
  const handleAddBooking = async (newBookingData: Omit<Booking, 'id' | 'createdAt'>) => {
    const newBooking: Booking = {
      ...newBookingData,
      id: 'BK-' + Math.floor(100000 + Math.random() * 900000),
      createdAt: new Date().toISOString()
    };
    
    // Append booking
    setBookings(prev => [newBooking, ...prev]);

    // Push immediately to server DB
    const res = await syncBookingServerDb(newBooking, rooms);
    if (res && res.lastUpdated) {
      lastUpdatedRef.current = res.lastUpdated;
    }

    // Send LINE Notification
    if (settings.lineNotificationEnabled) {
      const typeText = newBooking.bookingType === 'daily' ? 'รายวัน (Daily)' : 'รายเดือน (Monthly)';
      const msg = `✨ [${settings.propertyName || 'DORMYHUB'} - แจ้งเตือนจองห้องพักใหม่]
──────────────────────────
รหัสการจอง: ${newBooking.id}
ห้องพัก: Room ${newBooking.roomNumber}
ประเภทการจอง: ${typeText}
──────────────────────────
👤 ผู้จอง: คุณ ${newBooking.guestName}
📞 เบอร์โทร: ${newBooking.guestPhone}
💬 LINE ID: ${newBooking.guestLine || 'ไม่ได้ระบุ'}
📅 เช็คอิน: ${newBooking.checkInDate}
📅 เช็คเอาท์: ${newBooking.checkOutDate}
──────────────────────────
💰 ยอดรวม/มัดจำ: ฿${newBooking.totalPrice.toLocaleString()} บาท
⏳ สถานะ: รอการเช็คอินเข้าพัก ⏳
──────────────────────────
ระบบบันทึกเมื่อ: ${new Date().toLocaleDateString('th-TH')} ${new Date().toLocaleTimeString('th-TH')}`;
      sendLineNotification(settings, msg).catch(err => console.error('Failed to send booking notification', err));
    }

    // Note: Room availability will be updated to "Occupied" when the admin explicitly checks them in
  };

  // Reset simulator database safely without using window.confirm
  const handleResetDatabase = () => {
    setShowResetConfirm(true);
  };

  // Execute database reset
  const executeResetDatabase = async () => {
    localStorage.removeItem('dormy_v5_rooms');
    localStorage.removeItem('dormy_v5_bookings');
    localStorage.removeItem('dormy_v5_invoices');
    localStorage.removeItem('dormy_v5_tickets');
    localStorage.removeItem('dormy_v5_settings');

    setRooms(INITIAL_ROOMS);
    setBookings(INITIAL_BOOKINGS);
    setInvoices(INITIAL_INVOICES);
    setTickets(INITIAL_TICKETS);
    setSettings(DEFAULT_SETTINGS);

    const res = await resetServerDb();
    if (res && res.lastUpdated) {
      lastUpdatedRef.current = res.lastUpdated;
    }

    setShowResetConfirm(false);
    setShowResetSuccess(true);
    
    // Auto close success toast after 3 seconds
    setTimeout(() => {
      setShowResetSuccess(false);
    }, 3000);
  };

  return (
    <div className="w-full min-h-screen bg-[#060608] flex flex-col font-sans select-none text-slate-100 relative overflow-hidden">
      
      {/* Premium Ambient Background Decorations */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-600/10 blur-[180px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-sky-500/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[800px] h-[200px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />
      
      {/* High-end Subtle Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_10%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Universal Mode switcher navigation bar wrapped in a sticky container to maintain correct document flow spacing */}
      <div className="sticky top-0 z-40 w-full backdrop-blur-xl border-b border-white/5 bg-[#0a0a0f]/60">
        <header className="max-w-7xl mx-auto py-3 px-4 md:px-8 flex flex-col xl:flex-row items-center justify-between gap-4">
          
          {/* Left Side: Brand Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:scale-105 transition-all duration-300">
              <Building className="w-5.5 h-5.5 text-white stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent inline-block">
                  {settings.propertyName || 'DORMYHUB'}
                </span>
                <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[9px] px-1.5 py-0.5 rounded-md font-bold tracking-wider uppercase animate-pulse">
                  v4.12
                </span>
              </div>
              <span className="text-[10px] uppercase tracking-widest text-slate-500 block leading-none mt-1 font-mono">Premium Residences</span>
            </div>
          </div>

          {/* Right Side: Role Selector and Reset button */}
          <div className="flex items-center gap-3 w-full xl:w-auto justify-center xl:justify-end">
            <div className="flex bg-[#060608]/80 p-1 rounded-xl border border-white/5 shadow-inner">
              <button
                id="switch-to-guest"
                onClick={() => setRole('guest')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-300 cursor-pointer ${
                  role === 'guest'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_4px_12px_rgba(37,99,235,0.3)] border border-blue-500/20 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                หน้าผู้เช่าพัก (Guest)
              </button>
              <button
                id="switch-to-admin"
                onClick={() => setRole('admin')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-300 cursor-pointer ${
                  role === 'admin'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_4px_12px_rgba(37,99,235,0.3)] border border-blue-500/20 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                ผู้ดูแลระบบ (Admin)
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="btn-sync-center"
                onClick={async () => {
                  setShowSyncCenterModal(true);
                  saveServerDb({ rooms, bookings, invoices, tickets, settings });
                }}
                className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-500/30 px-3.5 py-2 rounded-xl transition-all duration-300 font-bold whitespace-nowrap cursor-pointer flex items-center gap-1.5 shadow-sm hover:shadow-indigo-500/10"
                title="เปิดศูนย์บริการซิงค์ข้อมูล PC <-> มือถือ เพื่อแสดง QR Code หรือสแกนดึงข้อมูล"
              >
                <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                <span>📱 ซิงค์ PC ↔ มือถือ</span>
              </button>

              <button
                id="btn-sync-now"
                onClick={handleManualSync}
                disabled={isSyncing}
                className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 px-3.5 py-2 rounded-xl transition-all duration-300 font-semibold whitespace-nowrap cursor-pointer flex items-center gap-1.5 shadow-sm hover:shadow-emerald-500/10"
                title="ระบบซิงค์ข้อมูล Real-time อัตโนมัติแบบ 100% ทุก 1 วินาทีระหว่าง PC และมือถือโดยไม่ต้องกดอะไร"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-400' : 'text-emerald-400'}`} />
                <span>{isSyncing ? 'กำลังดึง...' : '🟢 Real-Time Active'}</span>
              </button>
            </div>

            <button
              id="btn-reset-db"
              onClick={handleResetDatabase}
              className="text-xs bg-white/5 text-slate-400 border border-white/5 px-3.5 py-2 rounded-xl hover:bg-white/10 hover:text-white transition-all duration-300 font-light whitespace-nowrap cursor-pointer hover:border-white/10"
              title="รีเซ็ตค่าเริ่มต้นทั้งหมด"
            >
              รีเซ็ตระบบ
            </button>
          </div>
        </header>
      </div>

      {/* Main Container Views with smooth Fade-in animation */}
      <div className="flex-1 relative z-10">
        <AnimatePresence mode="wait">
          {role === 'guest' ? (
            <motion.div
              key="guest-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35 }}
            >
              <CustomerView 
                rooms={rooms} 
                settings={settings} 
                onAddBooking={handleAddBooking} 
                invoices={invoices}
                onUpdateInvoices={setInvoices}
                tickets={tickets}
                onUpdateTickets={setTickets}
                onSyncNow={handleManualSync}
                isSyncing={isSyncing}
              />
            </motion.div>
          ) : (
            <motion.div
              key="admin-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35 }}
            >
              <AdminDashboard
                rooms={rooms}
                bookings={bookings}
                invoices={invoices}
                tickets={tickets}
                settings={settings}
                onUpdateRooms={setRooms}
                onUpdateBookings={setBookings}
                onUpdateInvoices={setInvoices}
                onUpdateTickets={setTickets}
                onUpdateSettings={setSettings}
                onSyncNow={handleManualSync}
                isSyncing={isSyncing}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Custom Confirmation Modal & Toast */}
      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowResetConfirm(false)}
              className="absolute inset-0 bg-[#060608]/80 backdrop-blur-md"
            />
            {/* Content Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-slate-950 border border-white/10 rounded-3xl p-6 shadow-2xl z-10 text-center overflow-hidden"
            >
              {/* Premium Glow effect */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-7 h-7" />
              </div>

              <h3 className="text-xl font-bold text-white mb-2">ยืนยันการรีเซ็ตระบบ</h3>
              <p className="text-sm text-slate-400 font-light leading-relaxed mb-6">
                การดำเนินการนี้จะล้างข้อมูลห้องพัก ประวัติการจองห้อง บิลค่าน้ำค่าไฟที่เคยออก และล้างการตั้งค่าระบบจำลองทั้งหมดกลับเป็นค่าเริ่มต้นดั้งเดิม <strong className="text-rose-400 font-medium">ไม่สามารถกู้คืนข้อมูลได้</strong>
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl font-bold text-xs text-slate-300 transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={executeResetDatabase}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-rose-600/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  ยืนยันรีเซ็ต
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Custom Reset Success Toast */}
        {showResetSuccess && (
          <div className="fixed bottom-6 right-6 z-50 max-w-sm">
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="bg-[#0c0c12] border border-emerald-500/20 rounded-2xl p-4 shadow-2xl flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Check className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div className="text-left">
                <h4 className="text-xs font-bold text-white font-semibold">รีเซ็ตระบบสำเร็จ</h4>
                <p className="text-[10px] text-slate-400 mt-0.5 font-light">ข้อมูลจำลองทั้งหมดถูกตั้งค่ากลับเป็นเริ่มต้นแล้ว</p>
              </div>
              <button
                onClick={() => setShowResetSuccess(false)}
                className="ml-auto text-slate-500 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          </div>
        )}

        {/* Custom Sync Success Toast */}
        {showSyncSuccess && (
          <div className="fixed bottom-6 right-6 z-50 max-w-md">
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="bg-[#0c0c12] border border-emerald-500/30 rounded-2xl p-4 shadow-2xl flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="text-left flex-1">
                <h4 className="text-xs font-bold text-white">✨ ซิงค์ข้อมูลข้ามอุปกรณ์สำเร็จ!</h4>
                <p className="text-[11px] text-slate-300 mt-0.5 font-light leading-snug">ดึงและอัปเดตข้อมูลล่าสุดจากเซิร์ฟเวอร์เรียบร้อยแล้ว มือถือและคอมพิวเตอร์เห็นตรงกัน 100%</p>
              </div>
              <button
                onClick={() => setShowSyncSuccess(false)}
                className="ml-auto text-slate-500 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          </div>
        )}

        {/* Multi-Device Sync Center Modal Dialog */}
        {showSyncCenterModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
            <div className="bg-[#12131c] border border-white/10 rounded-2xl max-w-xl w-full p-6 space-y-5 text-white shadow-2xl relative overflow-hidden">
              <button 
                onClick={() => setShowSyncCenterModal(false)}
                className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-lg">
                  📱
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">ศูนย์บริการซิงค์ข้อมูล PC ↔ มือถือ</h3>
                  <p className="text-xs text-slate-400">เลือกวิธีเชื่อมข้อมูลหอพักของคุณให้ตรงกันทุกอุปกรณ์ทันที</p>
                </div>
              </div>

              {/* Sync Methods Tabs */}
              <div className="grid grid-cols-3 gap-2 p-1 bg-black/40 border border-white/5 rounded-xl text-xs">
                <button
                  onClick={() => setSyncModalTab('link')}
                  className={`py-2 px-3 rounded-lg font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    syncModalTab === 'link' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>QR Code & ลิงก์</span>
                </button>
                <button
                  onClick={() => setSyncModalTab('supabase')}
                  className={`py-2 px-3 rounded-lg font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    syncModalTab === 'supabase' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Supabase Sync</span>
                </button>
                <button
                  onClick={() => setSyncModalTab('code')}
                  className={`py-2 px-3 rounded-lg font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    syncModalTab === 'code' ? 'bg-sky-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>รหัสข้อมูล (Code)</span>
                </button>
              </div>

              {/* Tab 1: QR Code & Direct Sync Link */}
              {syncModalTab === 'link' && (
                <div className="space-y-4 text-center">
                  <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
                    <button
                      onClick={() => setQrType('url')}
                      className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition-all cursor-pointer ${
                        qrType === 'url' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      📷 QR Code เปิดเว็บ (Auto-Sync)
                    </button>
                    <button
                      onClick={() => setQrType('data')}
                      className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition-all cursor-pointer ${
                        qrType === 'data' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      ⚡ QR Code ฝังข้อมูลตรง (Instant QR)
                    </button>
                  </div>

                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col items-center justify-center gap-3">
                    <p className="text-xs text-slate-300 font-medium">
                      {qrType === 'url' 
                        ? '📷 สแกนเพื่อเปิดเว็บหอพักบนมือถือ (ระบบจะซิงค์ Real-Time ดึงข้อมูลอัตโนมัติจาก Server PC)' 
                        : '⚡ สแกน QR Code นี้เพื่อดึงข้อมูลทั้งหมดเข้ามือถือทันที (รวมห้อง พัก การจอง และใบแจ้งหนี้)'}
                    </p>
                    <div className="p-3 bg-white rounded-2xl border-4 border-indigo-500/30 shadow-lg">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrType === 'url' ? getAppBaseUrl() : generateSyncUrl())}`} 
                        alt="Scan to Sync Mobile"
                        className="w-52 h-52 rounded-lg object-contain"
                      />
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-mono bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                      <span className="truncate">{qrType === 'url' ? getAppBaseUrl() : 'dormy://sync-payload-embedded'}</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => {
                        const url = getAppBaseUrl();
                        safeCopyToClipboard(url);
                        setSyncActionStatus({ loading: false, msg: 'คัดลอก URL เว็บเรียบร้อย! นำไปส่งใน LINE หรือเบราว์เซอร์มือถือได้เลย', success: true });
                        setTimeout(() => setSyncActionStatus(null), 4000);
                      }}
                      className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                    >
                      <Copy className="w-4 h-4" />
                      <span>คัดลอก URL เว็บเปิดบนมือถือ</span>
                    </button>
                    <button
                      onClick={() => {
                        const syncUrl = generateSyncUrl();
                        safeCopyToClipboard(syncUrl);
                        setSyncActionStatus({ loading: false, msg: 'คัดลอกลิงก์ซิงค์ข้อมูลเรียบร้อยแล้ว!', success: true });
                        setTimeout(() => setSyncActionStatus(null), 4000);
                      }}
                      className="py-3 px-4 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Link2 className="w-4 h-4" />
                      <span>คัดลอกลิงก์ข้อมูลตรง</span>
                    </button>
                    <button
                      onClick={handleManualSync}
                      disabled={isSyncing}
                      className="py-3 px-4 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>ดึงข้อมูลทันที</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 2: Supabase Realtime Sync */}
              {syncModalTab === 'supabase' && (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-2">
                    <h4 className="text-sm font-bold text-emerald-300 flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      <span>การเชื่อมต่อ Supabase Real-time Cloud</span>
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      หากตั้งค่า Supabase URL และ Key ไว้ ข้อมูลทุกการจอง/เพิ่มห้องจะซิงค์ตรงระหว่าง PC และมือถือแบบ Real-time 100% อัตโนมัติ ไม่ต้องกดปุ่มใดๆ
                    </p>
                  </div>

                  <div className="space-y-3 bg-black/30 p-4 rounded-xl border border-white/5 text-xs">
                    <div className="flex justify-between items-center text-slate-300">
                      <span>สถานะการเชื่อมต่อ Supabase:</span>
                      <span className={`font-bold px-2 py-0.5 rounded-md ${settings.supabaseUrl && settings.supabaseAnonKey ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                        {settings.supabaseUrl && settings.supabaseAnonKey ? '✓ มีการตั้งค่า Key แล้ว' : '⚠️ ยังไม่ได้กรอก Key'}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        setSyncActionStatus({ loading: true, msg: 'กำลังส่งข้อมูลทั้งหมดขึ้น Supabase Cloud...' });
                        const ok = await pushAllToSupabase({ rooms, bookings, invoices, tickets, settings }, settings);
                        if (ok) {
                          setSyncActionStatus({ loading: false, msg: 'ส่งข้อมูลทั้งหมดขึ้น Supabase สำเร็จ! มือถือและ PC จะซิงค์ข้อมูลตรงกันทันที', success: true });
                        } else {
                          setSyncActionStatus({ loading: false, msg: 'เกิดข้อผิดพลาด: กรุณาตรวจสอบ Supabase URL และ Key ในหน้าตั้งค่าระบบ', success: false });
                        }
                      }}
                      className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                    >
                      <Upload className="w-4 h-4" />
                      <span>พุช (Push) ข้อมูลเครื่องนี้ขึ้น Supabase</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowSyncCenterModal(false);
                        setRole('admin');
                      }}
                      className="py-3 px-4 bg-white/10 hover:bg-white/20 text-slate-200 font-bold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      ตั้งค่า Key
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 3: JSON Code Export/Import */}
              {syncModalTab === 'code' && (
                <div className="space-y-4">
                  <div className="p-4 bg-sky-500/10 border border-sky-500/20 rounded-2xl space-y-2">
                    <h4 className="text-sm font-bold text-sky-300 flex items-center gap-2">
                      <Copy className="w-4 h-4" />
                      <span>ส่งออก / นำเข้ารหัสข้อมูล (Manual Data Code)</span>
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      ใช้ในกรณีไม่ได้ต่อ Supabase: สามารถกดคัดลอกโค้ดข้อมูลจาก PC ไปวางบนมือถือเพื่อเปลี่ยนข้อมูลให้เหมือนกันทันที
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        const backupObj = { rooms, bookings, invoices, tickets, settings, exportedAt: new Date().toISOString() };
                        safeCopyToClipboard(JSON.stringify(backupObj, null, 2));
                        setSyncActionStatus({ loading: false, msg: 'คัดลอกรหัสข้อมูลลง Clipboard แล้ว! นำไปวางในมือถือได้เลย', success: true });
                      }}
                      className="py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      <span>คัดลอกรหัสจากเครื่องนี้</span>
                    </button>
                    <button
                      onClick={() => {
                        const userCode = prompt('วางรหัสข้อมูล (JSON) ที่คัดลอกมาจาก PC หรืออุปกรณ์อื่น:');
                        if (!userCode || userCode.trim() === '') return;
                        try {
                          const parsed = JSON.parse(userCode.trim());
                          if (parsed.rooms && Array.isArray(parsed.rooms)) setRooms(parsed.rooms);
                          if (parsed.bookings && Array.isArray(parsed.bookings)) setBookings(parsed.bookings);
                          if (parsed.invoices && Array.isArray(parsed.invoices)) setInvoices(parsed.invoices);
                          if (parsed.tickets && Array.isArray(parsed.tickets)) setTickets(parsed.tickets);
                          if (parsed.settings) setSettings(prev => ({ ...prev, ...parsed.settings }));
                          setSyncActionStatus({ loading: false, msg: 'นำเข้าข้อมูลสำเร็จ! ข้อมูลถูกอัปเดตเรียบร้อยแล้ว', success: true });
                        } catch (e) {
                          alert('รหัสข้อมูลไม่ถูกต้อง');
                        }
                      }}
                      className="py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>วางรหัสเพื่ออัปเดตเครื่องนี้</span>
                    </button>
                  </div>
                </div>
              )}

              {syncActionStatus && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 font-medium border ${
                  syncActionStatus.loading ? 'bg-blue-500/10 text-blue-300 border-blue-500/30' :
                  syncActionStatus.success ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' :
                  'bg-rose-500/10 text-rose-300 border-rose-500/30'
                }`}>
                  {syncActionStatus.loading && <RefreshCw className="w-4 h-4 animate-spin shrink-0" />}
                  <span>{syncActionStatus.msg}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building, User, Shield, HelpCircle, FileText, Sparkles, Key, Check, Info
} from 'lucide-react';
import { Room, Booking, UtilityInvoice, SystemSettings } from './types';
import { INITIAL_ROOMS, INITIAL_BOOKINGS, INITIAL_INVOICES, DEFAULT_SETTINGS } from './data';
import CustomerView from './components/CustomerView';
import AdminDashboard from './components/AdminDashboard';
import { sendLineNotification } from './utils/line';

export default function App() {
  const [role, setRole] = useState<'guest' | 'admin'>('guest');

  // State initialization with LocalStorage backup for absolute durability
  const [rooms, setRooms] = useState<Room[]>(() => {
    const saved = localStorage.getItem('dormy_rooms');
    return saved ? JSON.parse(saved) : INITIAL_ROOMS;
  });

  const [bookings, setBookings] = useState<Booking[]>(() => {
    const saved = localStorage.getItem('dormy_bookings');
    return saved ? JSON.parse(saved) : INITIAL_BOOKINGS;
  });

  const [invoices, setInvoices] = useState<UtilityInvoice[]>(() => {
    const saved = localStorage.getItem('dormy_invoices');
    return saved ? JSON.parse(saved) : INITIAL_INVOICES;
  });

  const [settings, setSettings] = useState<SystemSettings>(() => {
    const saved = localStorage.getItem('dormy_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Automatically switch to MessagingApi if they are still on Notify but have a channel access token,
        // or if they had Notify selected but Notify is deprecated.
        if (parsed.lineTokenType === 'Notify' && (!parsed.lineNotifyToken || parsed.lineChannelAccessToken)) {
          parsed.lineTokenType = 'MessagingApi';
        }
        return parsed;
      } catch (e) {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  // Save states automatically on changes
  useEffect(() => {
    localStorage.setItem('dormy_rooms', JSON.stringify(rooms));
  }, [rooms]);

  useEffect(() => {
    localStorage.setItem('dormy_bookings', JSON.stringify(bookings));
  }, [bookings]);

  useEffect(() => {
    localStorage.setItem('dormy_invoices', JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
    localStorage.setItem('dormy_settings', JSON.stringify(settings));
  }, [settings]);

  // Handle addition of a booking (can be from customer or admin)
  const handleAddBooking = (newBookingData: Omit<Booking, 'id' | 'createdAt'>) => {
    const newBooking: Booking = {
      ...newBookingData,
      id: 'BK-' + Math.floor(100000 + Math.random() * 900000),
      createdAt: new Date().toISOString()
    };
    
    // Append booking
    setBookings(prev => [newBooking, ...prev]);

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

  // Reset simulator database
  const handleResetDatabase = () => {
    if (window.confirm('คุณต้องการรีเซ็ตระบบและล้างประวัติกลับเป็นค่าเริ่มต้นทั้งหมดหรือไม่?')) {
      localStorage.clear();
      setRooms(INITIAL_ROOMS);
      setBookings(INITIAL_BOOKINGS);
      setInvoices(INITIAL_INVOICES);
      setSettings(DEFAULT_SETTINGS);
      alert('รีเซ็ตฐานข้อมูลจำลองเรียบร้อยแล้ว');
    }
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

          {/* Center: Live Simulator Hint - visible on xl screens to ensure perfect spacing */}
          <div className="hidden xl:flex items-center gap-2 bg-white/5 border border-white/5 px-4 py-2 rounded-xl text-xs backdrop-blur-sm shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="text-slate-400 font-light">
              แนะนำ: บันทึกจองห้องพักในระบบ และตั้งค่าความเชื่อมโยงกับ <strong className="text-white font-medium">LINE Messaging API (Bot)</strong> ในแท็บตั้งค่าเพื่อทดสอบแจ้งเตือนแบบเรียลไทม์!
            </span>
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
                settings={settings}
                onUpdateRooms={setRooms}
                onUpdateBookings={setBookings}
                onUpdateInvoices={setInvoices}
                onUpdateSettings={setSettings}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}

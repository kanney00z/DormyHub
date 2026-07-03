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
      const msg = `✨ มีรายการจองห้องพักใหม่!\nรหัสการจอง: ${newBooking.id}\nห้องพัก: ${newBooking.roomNumber}\nประเภทการจอง: ${typeText}\n👤 ผู้จอง: ${newBooking.guestName}\n📞 เบอร์โทร: ${newBooking.guestPhone}\n📅 เช็คอิน: ${newBooking.checkInDate}\n📅 เช็คเอาท์: ${newBooking.checkOutDate}\n💰 ยอดรวม: ${newBooking.totalPrice.toLocaleString()} บาท\nสถานะ: รอการเช็คอิน ⏳`;
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
    <div className="w-full min-h-screen bg-[#0a0a0c] flex flex-col font-sans select-none text-slate-200">
      
      {/* Universal Mode switcher navigation bar wrapped in a sticky container to maintain correct document flow spacing */}
      <div className="sticky top-0 z-40 w-full backdrop-blur-md">
        <header className="bg-[#121216]/95 border-b border-white/10 text-white py-4 px-4 md:px-8 flex flex-col xl:flex-row items-center justify-between gap-4 shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
          
          {/* Left Side: Brand Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.4)]">
              <Building className="w-5.5 h-5.5 text-white stroke-[2.5]" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tighter bg-gradient-to-r from-brand-400 via-blue-400 to-indigo-300 bg-clip-text text-transparent inline-block">
                {settings.propertyName || 'DORMYHUB'}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-slate-500 block leading-none mt-1">Property Management</span>
            </div>
          </div>

          {/* Center: Live Simulator Hint - visible on xl screens to ensure perfect spacing */}
          <div className="hidden xl:flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-xs backdrop-blur-sm">
            <Info className="w-4 h-4 text-brand-400 shrink-0" />
            <span className="text-slate-300 font-light">
              💡 แนะนำ: ลองจองห้องในหน้าผู้เช่าพัก แล้วเปิด <strong className="text-brand-400 font-semibold">ระบบหลังบ้านแอดมิน</strong> เพื่อเช็คอินหรือบันทึกค่าน้ำค่าไฟได้ทันที!
            </span>
          </div>

          {/* Right Side: Role Selector and Reset button */}
          <div className="flex items-center gap-3 w-full xl:w-auto justify-center xl:justify-end">
            <div className="flex bg-[#0a0a0c] p-1 rounded-xl border border-white/10">
              <button
                id="switch-to-guest"
                onClick={() => setRole('guest')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-350 ${
                  role === 'guest'
                    ? 'bg-brand-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.4)] border border-brand-500/30 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                หน้าผู้เช่าพัก (Guest)
              </button>
              <button
                id="switch-to-admin"
                onClick={() => setRole('admin')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-350 ${
                  role === 'admin'
                    ? 'bg-brand-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.4)] border border-brand-500/30 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                หลังบ้านแอดมิน (Admin)
              </button>
            </div>

            <button
              id="btn-reset-db"
              onClick={handleResetDatabase}
              className="text-xs bg-white/5 text-slate-400 border border-white/10 px-3.5 py-2 rounded-xl hover:bg-white/10 hover:text-white transition-all font-light whitespace-nowrap"
              title="รีเซ็ตค่าเริ่มต้นทั้งหมด"
            >
              รีเซ็ตระบบ
            </button>
          </div>
        </header>
      </div>

      {/* Main Container Views with smooth Fade-in animation */}
      <div className="flex-1">
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

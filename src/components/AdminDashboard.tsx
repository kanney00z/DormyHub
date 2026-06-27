import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, Droplet, Users, Key, Settings, Plus, 
  Trash2, FileText, Check, Clock, TrendingUp, AlertTriangle, 
  Home, ClipboardList, CreditCard, ChevronRight, CheckCircle2, DollarSign, Edit3, X, HelpCircle,
  Upload, Image as ImageIcon, Bell, Send, AlertCircle, Calendar, ChevronLeft
} from 'lucide-react';
import { Room, Booking, UtilityInvoice, SystemSettings } from '../types';
import { testLineNotification, sendLineNotification } from '../utils/line';

const ROOM_IMAGE_PRESETS = [
  { name: 'Standard Cozy', url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80' },
  { name: 'Modern Deluxe', url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80' },
  { name: 'Luxury Suite', url: 'https://images.unsplash.com/photo-1582719478250-c89cae4db85b?auto=format&fit=crop&w=800&q=80' },
  { name: 'Family Loft', url: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80' }
];

interface AdminDashboardProps {
  rooms: Room[];
  bookings: Booking[];
  invoices: UtilityInvoice[];
  settings: SystemSettings;
  onUpdateRooms: (rooms: Room[]) => void;
  onUpdateBookings: (bookings: Booking[]) => void;
  onUpdateInvoices: (invoices: UtilityInvoice[]) => void;
  onUpdateSettings: (settings: SystemSettings) => void;
}

export default function AdminDashboard({
  rooms,
  bookings,
  invoices,
  settings,
  onUpdateRooms,
  onUpdateBookings,
  onUpdateInvoices,
  onUpdateSettings,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'rooms' | 'bookings' | 'utilities' | 'settings'>('overview');
  
  // Room Form State
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newRoomType, setNewRoomType] = useState<Room['type']>('Standard');
  const [newRoomFloor, setNewRoomFloor] = useState(1);
  const [newRoomDaily, setNewRoomDaily] = useState(550);
  const [newRoomMonthly, setNewRoomMonthly] = useState(4200);
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [newRoomImage, setNewRoomImage] = useState('');
  const [imageUploadType, setImageUploadType] = useState<'url' | 'upload' | 'preset'>('preset');
  const [isDragging, setIsDragging] = useState(false);
  
  // Utility bill billing Form state
  const [selectedRoomIdForBill, setSelectedRoomIdForBill] = useState('');
  const [inputCurrElectricity, setInputCurrElectricity] = useState<number | ''>('');
  const [inputCurrWater, setInputCurrWater] = useState<number | ''>('');
  const [selectedBillingMonth, setSelectedBillingMonth] = useState('มิถุนายน 2569');
  
  // Quick Edit Room status
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editDailyPrice, setEditDailyPrice] = useState(0);
  const [editMonthlyPrice, setEditMonthlyPrice] = useState(0);
  const [editStatus, setEditStatus] = useState<Room['status']>('Available');
  const [deleteConfirmRoomId, setDeleteConfirmRoomId] = useState<string | null>(null);
  const [deleteConfirmBookingId, setDeleteConfirmBookingId] = useState<string | null>(null);
  const [deleteConfirmInvoiceId, setDeleteConfirmInvoiceId] = useState<string | null>(null);
  const [filterHistoryRoomId, setFilterHistoryRoomId] = useState<string>('All');

  // Calendar State
  const [bookingViewMode, setBookingViewMode] = useState<'list' | 'calendar'>('list');
  const [calendarYear, setCalendarYear] = useState<number>(2026);
  const [calendarMonth, setCalendarMonth] = useState<number>(5); // 0-indexed: 5 is June
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<string | null>(null);
  const [calendarFilterType, setCalendarFilterType] = useState<'all' | 'daily' | 'monthly'>('all');

  // LINE Notification Testing state
  const [lineTestLoading, setLineTestLoading] = useState(false);
  const [lineTestResult, setLineTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Stats Calculations
  const stats = useMemo(() => {
    const totalRoomsCount = rooms.length;
    const occupiedCount = rooms.filter(r => r.status === 'Occupied').length;
    const maintenanceCount = rooms.filter(r => r.status === 'Maintenance').length;
    const availableCount = totalRoomsCount - occupiedCount - maintenanceCount;
    
    // Revenue this month: paid invoices + daily bookings status = active / checkedout
    const paidInvoicesSum = invoices
      .filter(inv => inv.status === 'Paid')
      .reduce((sum, inv) => sum + inv.totalCost, 0);
      
    const activeDailyBookingsSum = bookings
      .filter(b => b.bookingType === 'daily' && (b.status === 'Active' || b.status === 'CheckedOut'))
      .reduce((sum, b) => sum + b.totalPrice, 0);

    const pendingUtilityInvoices = invoices.filter(inv => inv.status === 'Unpaid').length;
    const pendingBookings = bookings.filter(b => b.status === 'Pending').length;

    return {
      occupancyRate: totalRoomsCount > 0 ? Math.round((occupiedCount / totalRoomsCount) * 100) : 0,
      occupiedCount,
      maintenanceCount,
      availableCount,
      revenueThisMonth: paidInvoicesSum + activeDailyBookingsSum,
      pendingUtilityInvoices,
      pendingBookings
    };
  }, [rooms, bookings, invoices]);

  const THAI_MONTHS_FULL = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  const calendarGrid = useMemo(() => {
    const firstDayIndex = new Date(calendarYear, calendarMonth, 1).getDay();
    const totalDays = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const prevMonthTotalDays = new Date(calendarYear, calendarMonth, 0).getDate();
    
    const cells = [];
    
    // Previous month's trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthTotalDays - i;
      const m = calendarMonth === 0 ? 11 : calendarMonth - 1;
      const y = calendarMonth === 0 ? calendarYear - 1 : calendarYear;
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      cells.push({
        dayNumber: dayNum,
        isCurrentMonth: false,
        dateString: dateStr,
      });
    }
    
    // Current month's days
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        dayNumber: d,
        isCurrentMonth: true,
        dateString: dateStr,
      });
    }
    
    // Next month's leading days to complete a standard 42-day grid
    const remainingCells = 42 - cells.length;
    for (let n = 1; n <= remainingCells; n++) {
      const m = calendarMonth === 11 ? 0 : calendarMonth + 1;
      const y = calendarMonth === 11 ? calendarYear + 1 : calendarYear;
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(n).padStart(2, '0')}`;
      cells.push({
        dayNumber: n,
        isCurrentMonth: false,
        dateString: dateStr,
      });
    }
    
    return cells;
  }, [calendarYear, calendarMonth]);

  const getBookingsForDate = (dateStr: string) => {
    return bookings.filter(b => {
      if (b.status === 'Cancelled') return false;
      if (calendarFilterType === 'daily' && b.bookingType !== 'daily') return false;
      if (calendarFilterType === 'monthly' && b.bookingType !== 'monthly') return false;
      return b.checkInDate <= dateStr && b.checkOutDate >= dateStr;
    });
  };

  // Selected room for billing details
  const selectedRoomForBill = useMemo(() => {
    return rooms.find(r => r.id === selectedRoomIdForBill);
  }, [rooms, selectedRoomIdForBill]);

  // Utility Bill Calculation Preview
  const utilityBillPreview = useMemo(() => {
    if (!selectedRoomForBill || inputCurrElectricity === '' || inputCurrWater === '') {
      return null;
    }
    const prevElec = selectedRoomForBill.electricityMeter;
    const currElec = Number(inputCurrElectricity);
    const prevWat = selectedRoomForBill.waterMeter;
    const currWat = Number(inputCurrWater);

    const elecUnits = Math.max(0, currElec - prevElec);
    const watUnits = Math.max(0, currWat - prevWat);

    const elecCost = elecUnits * settings.electricityUnitRate;
    const watCost = watUnits * settings.waterUnitRate;
    const common = settings.commonFee;
    const totalCost = elecCost + watCost + common;

    return {
      elecUnits,
      watUnits,
      elecCost,
      watCost,
      common,
      totalCost,
      isValid: currElec >= prevElec && currWat >= prevWat
    };
  }, [selectedRoomForBill, inputCurrElectricity, inputCurrWater, settings]);

  // Handlers for image file upload
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewRoomImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewRoomImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Add Room
  const handleAddRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomNumber) return;

    const defaultImage = newRoomType === 'Suite' ? 'https://images.unsplash.com/photo-1582719478250-c89cae4db85b?auto=format&fit=crop&w=800&q=80' :
                         newRoomType === 'Deluxe' ? 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80' :
                         newRoomType === 'Family' ? 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80' :
                         'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80';

    const newRoom: Room = {
      id: 'room-' + newRoomNumber,
      number: newRoomNumber,
      type: newRoomType,
      status: 'Available',
      dailyPrice: Number(newRoomDaily),
      monthlyPrice: Number(newRoomMonthly),
      amenities: ['เครื่องปรับอากาศ', 'อินเทอร์เน็ตความเร็วสูง', 'เครื่องทำน้ำอุ่น', 'ตู้เสื้อผ้า'],
      description: newRoomDesc || 'ห้องเช่าคุณภาพเยี่ยม ตกแต่งพร้อมเข้าอยู่',
      image: newRoomImage || defaultImage,
      floor: Number(newRoomFloor),
      electricityMeter: 1000,
      waterMeter: 100
    };

    onUpdateRooms([...rooms, newRoom]);
    
    // Reset Form
    setNewRoomNumber('');
    setNewRoomFloor(1);
    setNewRoomDesc('');
    setNewRoomImage('');
    setShowAddRoom(false);
  };

  // Handle Room Edit
  const handleStartEditRoom = (room: Room) => {
    setEditingRoomId(room.id);
    setEditDailyPrice(room.dailyPrice);
    setEditMonthlyPrice(room.monthlyPrice);
    setEditStatus(room.status);
  };

  const handleSaveRoomEdit = (id: string) => {
    const updated = rooms.map(room => {
      if (room.id === id) {
        return {
          ...room,
          dailyPrice: editDailyPrice,
          monthlyPrice: editMonthlyPrice,
          status: editStatus
        };
      }
      return room;
    });
    onUpdateRooms(updated);
    setEditingRoomId(null);
  };

  // Handle Booking Check-in/Out/Actions
  const handleBookingStatusChange = (bookingId: string, newStatus: Booking['status']) => {
    const updatedBookings = bookings.map(b => {
      if (b.id === bookingId) {
        return { ...b, status: newStatus };
      }
      return b;
    });
    onUpdateBookings(updatedBookings);

    // If check-in (Active), set room to Occupied
    const booking = bookings.find(b => b.id === bookingId);
    if (booking && newStatus === 'Active') {
      onUpdateRooms(rooms.map(r => r.id === booking.roomId ? { ...r, status: 'Occupied' } : r));
    }
    // If check-out (CheckedOut), set room to Available
    if (booking && newStatus === 'CheckedOut') {
      onUpdateRooms(rooms.map(r => r.id === booking.roomId ? { ...r, status: 'Available' } : r));
    }

    // LINE Notification on Booking status change
    if (booking && settings.lineNotificationEnabled) {
      let statusText = '';
      let emoji = '🔔';
      if (newStatus === 'Active') {
        statusText = 'เช็คอินเข้าพัก (Check-in)';
        emoji = '🛎️';
      } else if (newStatus === 'CheckedOut') {
        statusText = 'เช็คเอาท์ออกจากห้อง (Check-out)';
        emoji = '🚪';
      } else if (newStatus === 'Cancelled') {
        statusText = 'ยกเลิกการจองห้องพัก (Cancelled)';
        emoji = '❌';
      }

      if (statusText) {
        const msg = `${emoji} อัปเดตสถานะการจอง!\nห้องพัก: ${booking.roomNumber}\nผู้เช่า: ${booking.guestName}\nเบอร์โทร: ${booking.guestPhone}\nสถานะใหม่: ${statusText}\nอัปเดตเมื่อ: ${new Date().toLocaleTimeString('th-TH')}`;
        sendLineNotification(settings, msg).catch(err => console.error('Failed to send status change notification', err));
      }
    }
  };

  // Create utility invoice
  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomForBill || !utilityBillPreview || !utilityBillPreview.isValid) return;

    const newInvoice: UtilityInvoice = {
      id: `inv-${selectedRoomForBill.number}-${Date.now().toString().slice(-4)}`,
      roomId: selectedRoomForBill.id,
      roomNumber: selectedRoomForBill.number,
      billingMonth: selectedBillingMonth,
      prevElectricity: selectedRoomForBill.electricityMeter,
      currElectricity: Number(inputCurrElectricity),
      prevWater: selectedRoomForBill.waterMeter,
      currWater: Number(inputCurrWater),
      electricityUnitRate: settings.electricityUnitRate,
      waterUnitRate: settings.waterUnitRate,
      electricityCost: utilityBillPreview.elecCost,
      waterCost: utilityBillPreview.watCost,
      commonFee: settings.commonFee,
      totalCost: utilityBillPreview.totalCost,
      status: 'Unpaid',
      issueDate: new Date().toISOString().split('T')[0]
    };

    // Update Room's meter readings to the new ones
    const updatedRooms = rooms.map(r => {
      if (r.id === selectedRoomForBill.id) {
        return {
          ...r,
          electricityMeter: Number(inputCurrElectricity),
          waterMeter: Number(inputCurrWater)
        };
      }
      return r;
    });

    onUpdateRooms(updatedRooms);
    onUpdateInvoices([newInvoice, ...invoices]);

    // LINE Notification on Invoice Created
    if (settings.lineNotificationEnabled) {
      const msg = `📝 ออกใบแจ้งหนี้ใหม่!\nห้องพัก: ${newInvoice.roomNumber}\nประจำเดือน: ${newInvoice.billingMonth}\nค่าไฟ: ${newInvoice.electricityCost.toLocaleString()} บาท (${newInvoice.currElectricity - newInvoice.prevElectricity} หน่วย)\nค่าน้ำ: ${newInvoice.waterCost.toLocaleString()} บาท (${newInvoice.currWater - newInvoice.prevWater} หน่วย)\nค่าส่วนกลาง: ${newInvoice.commonFee.toLocaleString()} บาท\n💰 ยอดรวมสุทธิ: ${newInvoice.totalCost.toLocaleString()} บาท\nสถานะ: รอการชำระเงิน ⏳`;
      sendLineNotification(settings, msg).catch(err => console.error('Failed to send invoice notification', err));
    }

    // Reset fields
    setSelectedRoomIdForBill('');
    setInputCurrElectricity('');
    setInputCurrWater('');
  };

  // Pay invoice
  const handlePayInvoice = (invId: string) => {
    const invoice = invoices.find(inv => inv.id === invId);
    onUpdateInvoices(invoices.map(inv => {
      if (inv.id === invId) {
        return {
          ...inv,
          status: 'Paid',
          paidDate: new Date().toISOString().split('T')[0]
        };
      }
      return inv;
    }));

    if (invoice && settings.lineNotificationEnabled) {
      const msg = `✅ ชำระเงินเรียบร้อยแล้ว!\nห้องพัก: ${invoice.roomNumber}\nประจำเดือน: ${invoice.billingMonth}\n💰 ยอดเงินที่รับชำระ: ${invoice.totalCost.toLocaleString()} บาท\nวันเวลาที่บันทึก: ${new Date().toLocaleTimeString('th-TH')} (${new Date().toLocaleDateString('th-TH')})\nขอบคุณสำหรับความร่วมมือครับ 🙏`;
      sendLineNotification(settings, msg).catch(err => console.error('Failed to send payment notification', err));
    }
  };

  // Test LINE notification
  const handleTestLineNotification = async () => {
    setLineTestLoading(true);
    setLineTestResult(null);
    const tokenType = settings.lineTokenType || 'Notify';
    
    let isConfigured = false;
    if (tokenType === 'Notify' && settings.lineNotifyToken) {
      isConfigured = true;
    } else if (tokenType === 'MessagingApi' && settings.lineChannelAccessToken) {
      isConfigured = true;
    }

    if (!isConfigured) {
      setLineTestResult({
        success: false,
        message: 'กรุณากรอก Token ให้เรียบร้อยก่อนทดสอบ',
      });
      setLineTestLoading(false);
      return;
    }

    const testMsg = `🔔 ทดสอบระบบแจ้งเตือนไลน์หอพัก\nสถานที่: ${settings.propertyName || 'DORMYHUB'}\nสถานะเชื่อมต่อ: สำเร็จแล้ว! 🎉\nเวลา: ${new Date().toLocaleTimeString('th-TH')}`;
    
    const result = await testLineNotification({
      tokenType,
      notifyToken: settings.lineNotifyToken,
      channelAccessToken: settings.lineChannelAccessToken,
      userId: settings.lineUserId,
      message: testMsg,
    });

    if (result.success) {
      setLineTestResult({
        success: true,
        message: 'ส่งข้อความทดสอบไปยัง LINE เรียบร้อยแล้ว! กรุณาตรวจสอบโทรศัพท์ของคุณ',
      });
    } else {
      setLineTestResult({
        success: false,
        message: `ส่งข้อความไม่สำเร็จ: ${result.error}`,
      });
    }
    setLineTestLoading(false);
  };

  return (
    <div className="w-full min-h-screen bg-[#0a0a0c] text-slate-100 flex flex-col lg:flex-row">
      
      {/* Sidebar Control Panel */}
      <aside className="lg:w-72 bg-[#121216]/95 border-r border-white/10 p-6 flex flex-col justify-between shrink-0 backdrop-blur-md">
        <div>
          {/* Brand header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]">
              <Key className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-white leading-none bg-gradient-to-r from-brand-400 via-blue-400 to-indigo-300 bg-clip-text text-transparent">DormyHub</h2>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono mt-1 block">OPERATIONS</span>
            </div>
          </div>

          {/* Navigation links */}
          <nav className="space-y-2">
            {[
              { id: 'overview', label: 'ภาพรวมระบบ', icon: Home },
              { id: 'rooms', label: 'จัดการยูนิต/ห้องพัก', icon: Key },
              { id: 'bookings', label: 'ประวัติการจองห้อง', icon: ClipboardList },
              { id: 'utilities', label: 'บันทึกค่าน้ำค่าไฟ', icon: Zap },
              { id: 'settings', label: 'ตั้งค่าระบบกลาง', icon: Settings },
            ].map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-link-${item.id}`}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                    isActive 
                      ? 'bg-brand-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-brand-500/20' 
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                  {item.id === 'bookings' && stats.pendingBookings > 0 && (
                    <span className="ml-auto bg-amber-500 text-slate-950 font-bold text-xxs px-2 py-0.5 rounded-full">
                      {stats.pendingBookings}
                    </span>
                  )}
                  {item.id === 'utilities' && stats.pendingUtilityInvoices > 0 && (
                    <span className="ml-auto bg-rose-500 text-white font-bold text-xxs px-2 py-0.5 rounded-full">
                      {stats.pendingUtilityInvoices}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer info */}
        <div className="pt-6 border-t border-slate-800 text-xs text-slate-500 space-y-1">
          <p>🧑‍💼 บัญชีผู้ดูแลระบบ (Admin)</p>
          <p>🏢 เวอร์ชันระบบ: v4.12.0</p>
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto max-h-screen">
        
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-extrabold text-white tracking-tight">แดชบอร์ดสรุปผลผู้บริหาร</h1>
                <p className="text-slate-400 text-sm mt-1">ข้อมูลสถานะห้องพัก รายได้ประจำเดือน และใบเสร็จค้างจ่ายแบบเรียลไทม์</p>
              </div>
              <div className="bg-slate-800/80 px-4 py-2.5 rounded-xl border border-slate-700/60 flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-slate-300 font-medium">ระบบกำลังทำงาน (Live Synced)</span>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-[#121216]/90 p-6 rounded-2xl border border-white/10 shadow-[0_4px_25px_rgba(0,0,0,0.3)] hover:border-brand-500/20 hover:shadow-[0_4px_30px_rgba(37,99,235,0.1)] transition-all duration-300 flex items-center justify-between group">
                <div>
                  <span className="text-xs text-slate-400 block font-medium">รายได้ประมาณการเดือนนี้</span>
                  <span className="text-3xl font-extrabold text-white mt-1.5 block tracking-tight">฿{stats.revenueThisMonth.toLocaleString()}</span>
                  <span className="text-xs text-emerald-400 flex items-center gap-1 mt-2 font-medium">
                    <TrendingUp className="w-3.5 h-3.5" /> +12.4% คาดการณ์
                  </span>
                </div>
                <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.15)]">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-[#121216]/90 p-6 rounded-2xl border border-white/10 shadow-[0_4px_25px_rgba(0,0,0,0.3)] hover:border-brand-500/20 hover:shadow-[0_4px_30px_rgba(37,99,235,0.1)] transition-all duration-300 flex items-center justify-between group">
                <div>
                  <span className="text-xs text-slate-400 block font-medium">อัตราการเช่าห้องพัก</span>
                  <span className="text-3xl font-extrabold text-white mt-1.5 block tracking-tight">{stats.occupancyRate}%</span>
                  <span className="text-xs text-slate-300 block mt-2 font-light">
                    ว่าง <span className="text-emerald-400 font-semibold">{stats.availableCount}</span> / มีผู้เช่า <span className="text-brand-400 font-semibold">{stats.occupiedCount}</span> ยูนิต
                  </span>
                </div>
                <div className="w-12 h-12 bg-brand-500/10 text-brand-400 rounded-xl flex items-center justify-center shadow-[0_0_12px_rgba(37,99,235,0.15)]">
                  <Users className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-[#121216]/90 p-6 rounded-2xl border border-white/10 shadow-[0_4px_25px_rgba(0,0,0,0.3)] hover:border-brand-500/20 hover:shadow-[0_4px_30px_rgba(37,99,235,0.1)] transition-all duration-300 flex items-center justify-between group">
                <div>
                  <span className="text-xs text-slate-400 block font-medium">บิลน้ำ-ไฟค้างชำระ</span>
                  <span className="text-3xl font-extrabold text-rose-400 mt-1.5 block tracking-tight">{stats.pendingUtilityInvoices} ห้อง</span>
                  <span className="text-xs text-slate-300 block mt-2 font-light">
                    รอทำรายการชำระเงิน
                  </span>
                </div>
                <div className="w-12 h-12 bg-rose-500/10 text-rose-400 rounded-xl flex items-center justify-center shadow-[0_0_12px_rgba(244,63,94,0.15)]">
                  <Zap className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-[#121216]/90 p-6 rounded-2xl border border-white/10 shadow-[0_4px_25px_rgba(0,0,0,0.3)] hover:border-brand-500/20 hover:shadow-[0_4px_30px_rgba(37,99,235,0.1)] transition-all duration-300 flex items-center justify-between group">
                <div>
                  <span className="text-xs text-slate-400 block font-medium">ห้องพักชำรุด/ปรับปรุง</span>
                  <span className="text-3xl font-extrabold text-amber-400 mt-1.5 block tracking-tight">{stats.maintenanceCount} ห้อง</span>
                  <span className="text-xs text-slate-300 block mt-2 font-light">
                    อยู่ระหว่างการซ่อมแซม
                  </span>
                </div>
                <div className="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.15)]">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Invoices and Active Rentals Split */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Left Column: Recent Utility Invoices list */}
              <div className="bg-[#121216]/90 rounded-2xl border border-white/10 p-6 shadow-[0_4px_30px_rgba(0,0,0,0.4)] backdrop-blur-md">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">ประวัติบิลน้ำ-ไฟล่าสุด</h3>
                    <p className="text-xs text-slate-400">รายการคิดค่าสาธารณูปโภคประจำอาคาร</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('utilities')} 
                    className="text-xs text-brand-400 hover:text-brand-300 font-semibold transition-colors"
                  >
                    ออกบิลใหม่ &rarr;
                  </button>
                </div>

                <div className="space-y-4">
                  {invoices.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-sm">ยังไม่มีบิลค่าน้ำค่าไฟในระบบ</div>
                  ) : (
                    invoices.map((inv) => (
                      <div key={inv.id} className="bg-[#181820]/90 rounded-xl p-4 border border-white/5 flex items-center justify-between hover:border-white/10 transition-colors">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white">ห้อง {inv.roomNumber}</span>
                            <span className="text-[10px] text-brand-400 font-semibold bg-brand-500/10 border border-brand-500/20 px-2 py-0.5 rounded-md">{inv.billingMonth}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-400 mt-2">
                            <span className="flex items-center gap-1">⚡ ไฟ: {inv.currElectricity - inv.prevElectricity} หน่วย</span>
                            <span className="flex items-center gap-1">💧 น้ำ: {inv.currWater - inv.prevWater} หน่วย</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-sm font-bold text-white block">฿{inv.totalCost.toLocaleString()}</span>
                          <span className={`inline-block text-[10px] px-2 py-0.5 mt-1 rounded-full font-semibold ${
                            inv.status === 'Paid' 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' 
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/25'
                          }`}>
                            {inv.status === 'Paid' ? 'ชำระแล้ว' : 'ค้างชำระ'}
                          </span>
                          {inv.status === 'Unpaid' && (
                            <button
                              id={`btn-pay-inv-${inv.id}`}
                              onClick={() => handlePayInvoice(inv.id)}
                              className="block mt-1.5 text-xxs bg-emerald-500 text-slate-950 font-bold px-2.5 py-1 rounded-md hover:bg-emerald-400 transition-colors cursor-pointer"
                            >
                              บันทึกรับเงิน
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right Column: Room allocation visual list */}
              <div className="bg-[#121216]/90 rounded-2xl border border-white/10 p-6 shadow-[0_4px_30px_rgba(0,0,0,0.4)] backdrop-blur-md">
                <h3 className="text-lg font-bold text-white mb-1 tracking-tight">ผังอาคารห้องพัก</h3>
                <p className="text-xs text-slate-400 mb-6">คลิกสลับสถานะหรือตรวจสอบรายละเอียดของแต่ละห้องพัก</p>

                <div className="grid grid-cols-3 gap-4">
                  {rooms.map(room => (
                    <button
                      key={room.id}
                      id={`btn-view-floor-room-${room.number}`}
                      onClick={() => { setActiveTab('rooms'); handleStartEditRoom(room); }}
                      className={`p-4 rounded-xl text-left border transition-all duration-300 ${
                        room.status === 'Occupied' 
                          ? 'bg-[#181820]/90 border-indigo-500/30 hover:border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.05)]'
                          : room.status === 'Maintenance'
                          ? 'bg-[#181820]/90 border-amber-500/30 hover:border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.05)]'
                          : 'bg-[#181820]/90 border-white/5 hover:border-brand-500/40 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-mono tracking-wider">FL.{room.floor}</span>
                        <div className={`w-2.5 h-2.5 rounded-full ${
                          room.status === 'Occupied' ? 'bg-indigo-500 animate-pulse' :
                          room.status === 'Maintenance' ? 'bg-amber-500' : 'bg-emerald-500'
                        }`} />
                      </div>
                      <span className="text-lg font-extrabold text-white block mt-2">Room {room.number}</span>
                      <span className="text-xxs text-slate-400 block font-light mt-0.5">{room.type}</span>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </motion.div>
        )}

        {/* TAB 2: ROOM MANAGEMENT */}
        {activeTab === 'rooms' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-extrabold text-white tracking-tight">ผังจัดการยูนิตห้องพัก</h1>
                <p className="text-slate-400 text-sm mt-1">เพิ่มลบข้อมูลยูนิต ปรับปรุงสถานะเช่ารายวัน รายเดือน และตั้งราคา</p>
              </div>
              <button
                id="btn-trigger-add-room"
                onClick={() => setShowAddRoom(!showAddRoom)}
                className="bg-brand-500 hover:bg-brand-600 text-white font-medium px-5 py-3 rounded-xl text-sm transition-all flex items-center gap-2 shadow-md shrink-0 w-fit"
              >
                <Plus className="w-4 h-4" />
                เพิ่มยูนิตห้องพักใหม่
              </button>
            </div>

            {/* Add Room Expandable Form */}
            <AnimatePresence>
              {showAddRoom && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-slate-950 border border-slate-800 rounded-2xl p-6 overflow-hidden"
                >
                  <form onSubmit={handleAddRoomSubmit} className="space-y-4">
                    <h3 className="text-base font-bold text-white">📌 ข้อมูลอาคารและยูนิต</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <span className="text-xs text-slate-400 block mb-1">หมายเลขห้อง</span>
                        <input
                          id="new-room-number"
                          type="text"
                          required
                          placeholder="เช่น 103, 305"
                          value={newRoomNumber}
                          onChange={(e) => setNewRoomNumber(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500"
                        />
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 block mb-1">ประเภทห้องพัก</span>
                        <select
                          id="new-room-type"
                          value={newRoomType}
                          onChange={(e) => setNewRoomType(e.target.value as any)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500"
                        >
                          <option value="Standard">Standard</option>
                          <option value="Deluxe">Deluxe</option>
                          <option value="Suite">Suite</option>
                          <option value="Family">Family</option>
                        </select>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 block mb-1">ชั้นที่ตั้ง</span>
                        <input
                          id="new-room-floor"
                          type="number"
                          required
                          min={1}
                          max={10}
                          value={newRoomFloor}
                          onChange={(e) => setNewRoomFloor(Number(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                        />
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 block mb-1">ราคารายวัน / คืน</span>
                        <input
                          id="new-room-daily"
                          type="number"
                          required
                          value={newRoomDaily}
                          onChange={(e) => setNewRoomDaily(Number(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-xs text-slate-400 block mb-1">ค่าเช่ารายเดือน (บาท)</span>
                        <input
                          id="new-room-monthly"
                          type="number"
                          required
                          value={newRoomMonthly}
                          onChange={(e) => setNewRoomMonthly(Number(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none text-white"
                        />
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 block mb-1">คำอธิบายห้องพัก</span>
                        <input
                          id="new-room-desc"
                          type="text"
                          placeholder="คำบรรยายสั้นๆ เกี่ยวกับมุมระเบียงหรือจุดเด่น"
                          value={newRoomDesc}
                          onChange={(e) => setNewRoomDesc(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none text-white"
                        />
                      </div>
                    </div>

                    {/* Image Selection Section */}
                    <div className="border-t border-white/5 pt-5 mt-3">
                      <span className="text-xs font-semibold text-brand-400 uppercase tracking-widest block mb-3">📸 รูปภาพประจำห้องพัก</span>
                      
                      <div className="flex flex-col md:flex-row gap-5">
                        {/* Source Controls */}
                        <div className="md:w-1/2 space-y-4">
                          <div className="flex bg-[#121216] p-1 rounded-xl border border-white/5">
                            <button
                              type="button"
                              onClick={() => {
                                setImageUploadType('preset');
                                setNewRoomImage('');
                              }}
                              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                imageUploadType === 'preset'
                                  ? 'bg-brand-600 text-white shadow-md'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              ภาพแนะนำ
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setImageUploadType('upload');
                                setNewRoomImage('');
                              }}
                              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                imageUploadType === 'upload'
                                  ? 'bg-brand-600 text-white shadow-md'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              อัปโหลดรูปภาพ
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setImageUploadType('url');
                                setNewRoomImage('');
                              }}
                              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                imageUploadType === 'url'
                                  ? 'bg-brand-600 text-white shadow-md'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              ลิงก์ภายนอก URL
                            </button>
                          </div>

                          {imageUploadType === 'preset' && (
                            <div className="space-y-2">
                              <span className="text-[11px] text-slate-400 block font-light">เลือกรูปจากคอลเลกชันภาพถ่ายแนะนำของเรา:</span>
                              <div className="grid grid-cols-2 gap-2">
                                {ROOM_IMAGE_PRESETS.map((preset) => {
                                  const isSelected = newRoomImage === preset.url;
                                  return (
                                    <button
                                      key={preset.name}
                                      type="button"
                                      onClick={() => setNewRoomImage(preset.url)}
                                      className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all ${
                                        isSelected 
                                          ? 'border-brand-500 scale-[0.98] shadow-lg shadow-brand-500/10' 
                                          : 'border-transparent hover:border-white/20'
                                      }`}
                                    >
                                      <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-2">
                                        <span className="text-[10px] text-white font-medium truncate w-full block text-left">{preset.name}</span>
                                      </div>
                                      {isSelected && (
                                        <div className="absolute top-2 right-2 bg-brand-500 rounded-full p-0.5 shadow-md">
                                          <Check className="w-3 h-3 text-white stroke-[3]" />
                                        </div>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {imageUploadType === 'upload' && (
                            <div className="space-y-2">
                              <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => document.getElementById('image-upload-file')?.click()}
                                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 ${
                                  isDragging 
                                    ? 'border-brand-500 bg-brand-500/10 shadow-[0_0_15px_rgba(37,99,235,0.2)]' 
                                    : 'border-white/10 hover:border-white/20 bg-[#121216]/50'
                                }`}
                              >
                                <Upload className={`w-8 h-8 mx-auto mb-2 transition-transform duration-300 ${isDragging ? 'scale-110 text-brand-400' : 'text-slate-400'}`} />
                                <span className="text-xs text-slate-300 block font-medium">ลากไฟล์รูปภาพมาวางที่นี่</span>
                                <span className="text-[10px] text-slate-500 block mt-1">หรือคลิกเพื่อเลือกไฟล์จากอุปกรณ์ของคุณ</span>
                                <span className="text-[9px] text-slate-500 block">รองรับไฟล์ JPG, PNG, WebP (แปลงรูปเป็น base64 อัตโนมัติ)</span>
                                <input
                                  id="image-upload-file"
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={handleImageFileChange}
                                />
                              </div>
                            </div>
                          )}

                          {imageUploadType === 'url' && (
                            <div className="space-y-1.5">
                              <span className="text-[11px] text-slate-400 block">ระบุลิงก์รูปภาพ (Image URL) จากภายนอก</span>
                              <input
                                type="url"
                                placeholder="เช่น https://images.unsplash.com/photo-..."
                                value={newRoomImage}
                                onChange={(e) => setNewRoomImage(e.target.value)}
                                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500 text-white font-mono"
                              />
                            </div>
                          )}
                        </div>

                        {/* Interactive Preview Panel */}
                        <div className="flex-1 bg-[#121216]/50 border border-white/5 rounded-2xl p-4 flex flex-col justify-between min-h-[160px]">
                          <div>
                            <span className="text-xs text-slate-400 block mb-2 font-medium">✨ ตัวอย่างการแสดงผลภาพห้องพัก</span>
                            {newRoomImage ? (
                              <div className="relative aspect-video rounded-xl overflow-hidden bg-[#0a0a0c] border border-white/5 shadow-inner">
                                <img src={newRoomImage} alt="Room preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                <button
                                  type="button"
                                  onClick={() => setNewRoomImage('')}
                                  className="absolute top-2.5 right-2.5 bg-black/80 hover:bg-black text-slate-300 hover:text-white p-1.5 rounded-full transition-colors border border-white/10 shadow-lg"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="aspect-video rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center text-slate-500 bg-[#0a0a0c]/80">
                                <ImageIcon className="w-10 h-10 mb-2 stroke-[1.5] text-slate-600 animate-pulse" />
                                <span className="text-xs font-light text-slate-400">ยังไม่มีการเลือกหรืออัปโหลดรูปภาพ</span>
                                <span className="text-[10px] text-slate-500 mt-1">ระบบจะแสดงภาพเริ่มต้นของ {newRoomType} ให้โดยอัตโนมัติ</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        id="btn-cancel-add-room"
                        onClick={() => setShowAddRoom(false)}
                        className="px-4 py-2 border border-slate-800 text-slate-400 rounded-lg text-sm hover:bg-slate-900"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="submit"
                        id="btn-submit-add-room"
                        className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-semibold"
                      >
                        บันทึกเพิ่มห้องพัก
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Room list Grid */}
            <div className="space-y-4">
              {rooms.map(room => {
                const isEditing = editingRoomId === room.id;
                
                return (
                  <div key={room.id} className="bg-slate-950 rounded-2xl border border-slate-800 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    {/* Left: Metadata */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4.5">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-800 shrink-0">
                        <img src={room.image} alt="Room" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-bold text-white">ห้อง {room.number}</h3>
                          <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md font-mono">{room.type}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 max-w-md line-clamp-1">{room.description}</p>
                        <div className="flex gap-4 text-xxs text-slate-500 mt-2 font-mono">
                          <span>ชั้น: {room.floor}</span>
                          <span>⚡ มิเตอร์ไฟล่าสุด: {room.electricityMeter} kWh</span>
                          <span>💧 มิเตอร์น้ำล่าสุด: {room.waterMeter} m³</span>
                        </div>
                      </div>
                    </div>

                    {/* Middle / Right: Edit State vs View State */}
                    {isEditing ? (
                      <div className="flex flex-wrap items-center gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
                        <div>
                          <span className="text-xxs text-slate-400 block mb-1">รายวัน (฿)</span>
                          <input
                            id={`edit-price-daily-${room.number}`}
                            type="number"
                            value={editDailyPrice}
                            onChange={(e) => setEditDailyPrice(Number(e.target.value))}
                            className="w-20 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white"
                          />
                        </div>
                        <div>
                          <span className="text-xxs text-slate-400 block mb-1">รายเดือน (฿)</span>
                          <input
                            id={`edit-price-monthly-${room.number}`}
                            type="number"
                            value={editMonthlyPrice}
                            onChange={(e) => setEditMonthlyPrice(Number(e.target.value))}
                            className="w-24 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white"
                          />
                        </div>
                        <div>
                          <span className="text-xxs text-slate-400 block mb-1">สถานะยูนิต</span>
                          <select
                            id={`edit-status-${room.number}`}
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value as any)}
                            className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white"
                          >
                            <option value="Available">พร้อมให้เช่า</option>
                            <option value="Occupied">มีผู้เข้าพัก</option>
                            <option value="Maintenance">ปิดปรับปรุง</option>
                          </select>
                        </div>
                        <div className="flex items-end gap-1 pt-3">
                          <button
                            id={`btn-save-edit-${room.number}`}
                            onClick={() => handleSaveRoomEdit(room.id)}
                            className="bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold px-3 py-1.5 rounded text-xs cursor-pointer"
                          >
                            บันทึก
                          </button>
                          <button
                            id={`btn-cancel-edit-${room.number}`}
                            onClick={() => setEditingRoomId(null)}
                            className="border border-slate-700 text-slate-400 px-3 py-1.5 rounded text-xs hover:bg-slate-950 cursor-pointer"
                          >
                            ยกเลิก
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-6 justify-between md:justify-end">
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-right text-sm">
                          <div>
                            <span className="text-xxs text-slate-400 block">รายวัน/คืน</span>
                            <span className="font-bold text-white">฿{room.dailyPrice}</span>
                          </div>
                          <div>
                            <span className="text-xxs text-slate-400 block">รายเดือน</span>
                            <span className="font-bold text-white">฿{room.monthlyPrice}</span>
                          </div>
                          <div className="col-span-2 mt-1">
                            <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                              room.status === 'Available' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                              room.status === 'Occupied' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                              'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>
                              {room.status === 'Available' ? 'พร้อมให้เช่า' :
                               room.status === 'Occupied' ? 'มีผู้เข้าพัก' : 'ปิดปรับปรุง'}
                            </span>
                          </div>
                        </div>

                        {deleteConfirmRoomId === room.id ? (
                          <div className="flex items-center gap-1.5 animate-pulse bg-rose-500/5 border border-rose-500/20 p-1 rounded-xl">
                            <span className="text-[10px] text-rose-400 font-medium px-1.5">แน่ใจ?</span>
                            <button
                              id={`btn-confirm-delete-room-${room.number}`}
                              onClick={() => {
                                onUpdateRooms(rooms.filter(r => r.id !== room.id));
                                setDeleteConfirmRoomId(null);
                              }}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[10px] font-bold transition-all shadow-md shadow-rose-600/25 cursor-pointer"
                            >
                              ลบเลย
                            </button>
                            <button
                              id={`btn-cancel-delete-room-${room.number}`}
                              onClick={() => setDeleteConfirmRoomId(null)}
                              className="p-1 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-md transition-colors cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button
                              id={`btn-view-utilities-room-${room.number}`}
                              onClick={() => {
                                setActiveTab('utilities');
                                setFilterHistoryRoomId(room.id);
                              }}
                              className="p-2 bg-slate-900 border border-slate-800 rounded-lg hover:bg-indigo-500/10 text-slate-400 hover:text-indigo-400 transition-colors cursor-pointer"
                              title="ดูประวัติบิลค่าน้ำค่าไฟ"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            <button
                              id={`btn-trigger-edit-room-${room.number}`}
                              onClick={() => handleStartEditRoom(room)}
                              className="p-2 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                              title="แก้ไขห้องพัก"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              id={`btn-trigger-delete-room-${room.number}`}
                              onClick={() => setDeleteConfirmRoomId(room.id)}
                              className="p-2 bg-slate-900 border border-slate-800 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                              title="ลบห้องพัก"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* TAB 3: BOOKINGS */}
        {activeTab === 'bookings' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-extrabold text-white tracking-tight">รายการจองเข้าพักทั้งหมด</h1>
                <p className="text-slate-400 text-sm mt-1">บริหารจัดการสถานะ คุมคีย์การ์ด และเช็คอิน เช็คเอาท์ผู้เช่า</p>
              </div>

              {/* View Selector Sub-tabs */}
              <div className="flex gap-2 bg-slate-900/60 p-1 rounded-xl border border-slate-800 self-start md:self-auto">
                <button
                  type="button"
                  id="tab-booking-list"
                  onClick={() => setBookingViewMode('list')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    bookingViewMode === 'list'
                      ? 'bg-brand-500 text-slate-950 shadow-md shadow-brand-500/20 font-extrabold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  📋 ตารางรายการจอง
                </button>
                <button
                  type="button"
                  id="tab-booking-calendar"
                  onClick={() => {
                    setBookingViewMode('calendar');
                    if (!selectedCalendarDay) {
                      setSelectedCalendarDay('2026-06-27');
                    }
                  }}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    bookingViewMode === 'calendar'
                      ? 'bg-brand-500 text-slate-950 shadow-md shadow-brand-500/20 font-extrabold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  📅 ปฏิทินวันเข้าพัก (Calendar)
                </button>
              </div>
            </div>

            {bookingViewMode === 'list' ? (
              <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 text-xs font-semibold tracking-wider uppercase">
                        <th className="p-4">ผู้เข้าพัก</th>
                        <th className="p-4">ห้องพัก</th>
                        <th className="p-4">รูปแบบ</th>
                        <th className="p-4">ช่วงเวลาเข้าอยู่</th>
                        <th className="p-4">ยอดเงิน</th>
                        <th className="p-4">สถานะ</th>
                        <th className="p-4 text-right">ดำเนินการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 text-sm">
                      {bookings.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-500">ยังไม่มีรายการจองห้องในระบบ</td>
                        </tr>
                      ) : (
                        bookings.map((book) => (
                          <tr key={book.id} className="hover:bg-slate-900/30 transition-colors">
                            <td className="p-4">
                              <div className="font-bold text-white">{book.guestName}</div>
                              <div className="text-xxs text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                                <span>📞 {book.guestPhone}</span>
                                <span>✉️ {book.guestEmail}</span>
                                {book.paymentMethod && (
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold inline-flex items-center gap-0.5 ${
                                    book.paymentMethod === 'PromptPay' 
                                      ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' 
                                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  }`}>
                                    {book.paymentMethod === 'PromptPay' ? '📱 พร้อมเพย์' : '💵 เงินสด'}
                                  </span>
                                )}
                                {book.slipImage && (
                                  <a
                                    href={book.slipImage}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[9px] text-brand-400 hover:text-brand-300 font-semibold underline flex items-center gap-0.5 cursor-pointer ml-1"
                                  >
                                    📄 สลิปโอนเงิน
                                  </a>
                                )}
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="font-bold text-white">ห้อง {book.roomNumber}</span>
                            </td>
                            <td className="p-4">
                              <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                book.bookingType === 'daily' 
                                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                                  : 'bg-pink-500/10 text-pink-400 border border-pink-500/20'
                              }`}>
                                {book.bookingType === 'daily' ? 'รายวัน' : 'รายเดือน'}
                              </span>
                            </td>
                            <td className="p-4 text-xs">
                              <div className="text-slate-300">เข้า: {book.checkInDate}</div>
                              <div className="text-slate-500 mt-0.5">ออก: {book.checkOutDate}</div>
                            </td>
                            <td className="p-4">
                              <span className="font-bold text-slate-200">฿{book.totalPrice.toLocaleString()}</span>
                              {book.depositPaid > 0 && (
                                <div className="text-xxs text-emerald-400 mt-0.5">ประกันตัว: ฿{book.depositPaid}</div>
                              )}
                            </td>
                            <td className="p-4">
                              <span className={`inline-block text-xxs px-2 py-0.5 rounded-full font-semibold ${
                                book.status === 'Active' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' :
                                book.status === 'CheckedOut' ? 'bg-slate-800 text-slate-400 border border-slate-700' :
                                book.status === 'Pending' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25' :
                                'bg-rose-500/15 text-rose-400 border border-rose-500/25'
                              }`}>
                                {book.status === 'Active' ? 'เช็คอินอยู่' :
                                 book.status === 'CheckedOut' ? 'เช็คเอาท์แล้ว' :
                                 book.status === 'Pending' ? 'รอเช็คอิน' : 'ยกเลิก'}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {book.status === 'Pending' && (
                                  <>
                                    <button
                                      id={`btn-checkin-${book.id}`}
                                      onClick={() => handleBookingStatusChange(book.id, 'Active')}
                                      className="bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-semibold px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer shrink-0"
                                    >
                                      เช็คอิน (Active)
                                    </button>
                                    <button
                                      id={`btn-cancel-book-${book.id}`}
                                      onClick={() => handleBookingStatusChange(book.id, 'Cancelled')}
                                      className="border border-slate-800 text-rose-400 hover:bg-rose-500/10 px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer shrink-0"
                                    >
                                      ยกเลิกจอง
                                    </button>
                                  </>
                                )}
                                {book.status === 'Active' && (
                                  <button
                                    id={`btn-checkout-${book.id}`}
                                    onClick={() => handleBookingStatusChange(book.id, 'CheckedOut')}
                                    className="bg-slate-800 hover:bg-slate-700 text-white font-semibold px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer shrink-0"
                                  >
                                    เช็คเอาท์ (Check Out)
                                  </button>
                                )}

                                {deleteConfirmBookingId === book.id ? (
                                  <div className="flex items-center gap-1.5 animate-pulse bg-rose-500/5 border border-rose-500/20 p-1 rounded-xl shrink-0">
                                    <span className="text-[10px] text-rose-400 font-medium px-1.5">ลบ?</span>
                                    <button
                                      id={`btn-confirm-delete-book-${book.id}`}
                                      onClick={() => {
                                        onUpdateBookings(bookings.filter(b => b.id !== book.id));
                                        setDeleteConfirmBookingId(null);
                                      }}
                                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[10px] font-bold transition-all shadow-md shadow-rose-600/25 cursor-pointer"
                                    >
                                      ยืนยัน
                                    </button>
                                    <button
                                      id={`btn-cancel-delete-book-${book.id}`}
                                      onClick={() => setDeleteConfirmBookingId(null)}
                                      className="p-1 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-md transition-colors cursor-pointer"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    id={`btn-trigger-delete-book-${book.id}`}
                                    onClick={() => setDeleteConfirmBookingId(book.id)}
                                    className="p-2 bg-slate-900 border border-slate-800 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-colors shrink-0 cursor-pointer"
                                    title="ลบประวัติการจอง"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Calendar View Filters */}
                <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 font-semibold">🔍 ตัวกรองตามประเภท:</span>
                    <div className="flex gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setCalendarFilterType('all')}
                        className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                          calendarFilterType === 'all'
                            ? 'bg-slate-800 text-white shadow-sm font-extrabold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        👥 ทั้งหมด
                      </button>
                      <button
                        type="button"
                        onClick={() => setCalendarFilterType('daily')}
                        className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                          calendarFilterType === 'daily'
                            ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-extrabold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        🛎️ รายวัน (Daily)
                      </button>
                      <button
                        type="button"
                        onClick={() => setCalendarFilterType('monthly')}
                        className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                          calendarFilterType === 'monthly'
                            ? 'bg-pink-500/10 border border-pink-500/20 text-pink-400 font-extrabold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        🚪 รายเดือน (Monthly)
                      </button>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 flex items-center gap-3">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-indigo-500 inline-block"></span> รายวัน</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-pink-500 inline-block"></span> รายเดือน</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Calendar Grid Left Side */}
                  <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-800/60 pb-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (calendarMonth === 0) {
                              setCalendarMonth(11);
                              setCalendarYear(prev => prev - 1);
                            } else {
                              setCalendarMonth(prev => prev - 1);
                            }
                          }}
                          className="p-2 hover:bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-all cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-base font-extrabold text-white min-w-[140px] text-center tracking-tight">
                          {THAI_MONTHS_FULL[calendarMonth]} {calendarYear + 543}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (calendarMonth === 11) {
                              setCalendarMonth(0);
                              setCalendarYear(prev => prev + 1);
                            } else {
                              setCalendarMonth(prev => prev + 1);
                            }
                          }}
                          className="p-2 hover:bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-all cursor-pointer"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setCalendarMonth(5); // June
                          setCalendarYear(2026);
                          setSelectedCalendarDay('2026-06-27');
                        }}
                        className="text-xs bg-slate-900 border border-slate-800 text-slate-300 hover:text-white font-bold px-3 py-2 rounded-xl transition-all cursor-pointer"
                      >
                        กลับไปยังเดือนนี้
                      </button>
                    </div>

                    {/* Day Names */}
                    <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-400 py-1">
                      <div className="text-rose-400">อาทิตย์</div>
                      <div>จันทร์</div>
                      <div>อังคาร</div>
                      <div>พุธ</div>
                      <div>พฤหัสฯ</div>
                      <div>ศุกร์</div>
                      <div className="text-sky-400">เสาร์</div>
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-2">
                      {calendarGrid.map((cell, idx) => {
                        const cellBookings = getBookingsForDate(cell.dateString);
                        const isSelected = selectedCalendarDay === cell.dateString;
                        const isToday = cell.dateString === '2026-06-27'; // Consistent with current local time June 27, 2026

                        return (
                          <div
                            key={idx}
                            onClick={() => setSelectedCalendarDay(cell.dateString)}
                            className={`min-h-[90px] p-2 border rounded-xl flex flex-col justify-between transition-all cursor-pointer select-none relative overflow-hidden group ${
                              !cell.isCurrentMonth
                                ? 'bg-slate-950/20 border-transparent text-slate-700 pointer-events-none opacity-40'
                                : isSelected
                                ? 'bg-brand-500/10 border-brand-500 text-white shadow-[0_0_15px_rgba(234,179,8,0.1)]'
                                : isToday
                                ? 'bg-emerald-500/5 border-emerald-500/40 text-white'
                                : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-900/80 text-slate-300'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <span className={`text-xs font-extrabold ${
                                !cell.isCurrentMonth ? 'text-slate-700' :
                                isSelected ? 'text-brand-400' :
                                isToday ? 'text-emerald-400 underline underline-offset-4 decoration-2 font-black' :
                                'text-slate-300'
                              }`}>
                                {cell.dayNumber}
                              </span>
                              {cellBookings.length > 0 && cell.isCurrentMonth && (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-black ${
                                  isSelected ? 'bg-brand-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                                }`}>
                                  {cellBookings.length}
                                </span>
                              )}
                            </div>

                            {/* Booked Rooms badges */}
                            <div className="space-y-1 mt-1.5 overflow-hidden max-h-[54px] flex-1 flex flex-col justify-end">
                              {cell.isCurrentMonth && cellBookings.slice(0, 2).map((b) => (
                                <div
                                  key={b.id}
                                  className={`text-[9px] px-1.5 py-0.5 rounded truncate font-bold leading-tight border ${
                                    b.bookingType === 'daily'
                                      ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/10'
                                      : 'bg-pink-500/10 text-pink-400 border-pink-500/10'
                                  }`}
                                >
                                  ห้อง {b.roomNumber}
                                </div>
                              ))}
                              {cell.isCurrentMonth && cellBookings.length > 2 && (
                                <div className="text-[8px] text-slate-500 text-center font-extrabold py-0.5 bg-slate-900/40 rounded">
                                  + อีก {cellBookings.length - 2} ห้อง
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Calendar Detailed Booking Info Right Panel */}
                  <div className="lg:col-span-4 bg-slate-950 border border-slate-800 rounded-3xl p-6 flex flex-col space-y-5 shadow-xl">
                    <div className="border-b border-slate-800 pb-4">
                      <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-brand-400" />
                        📱 รายละเอียดผู้เข้าพักวันนี้
                      </h3>
                      <span className="text-xs text-slate-400 font-semibold block mt-1.5 bg-slate-900 py-1.5 px-3 rounded-lg border border-slate-800/60">
                        {selectedCalendarDay ? (
                          (() => {
                            const [y, m, d] = selectedCalendarDay.split('-').map(Number);
                            return `📅 วันที่ ${d} ${THAI_MONTHS_FULL[m]} พ.ศ. ${y + 543}`;
                          })()
                        ) : 'กรุณาเลือกวันในปฏิทิน'}
                      </span>
                    </div>

                    <div className="space-y-4 flex-1 overflow-y-auto max-h-[500px] pr-1.5">
                      {selectedCalendarDay ? (
                        (() => {
                          const dayBookings = getBookingsForDate(selectedCalendarDay);
                          if (dayBookings.length === 0) {
                            return (
                              <div className="text-center py-16 bg-slate-900/20 rounded-2xl border border-dashed border-slate-800/80">
                                <Clock className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                                <p className="text-xs text-slate-400 font-medium leading-relaxed px-4">
                                  ไม่พบรายการจองหรือการเช็คอินที่ตรงกับวันที่เลือกในระบบ
                                </p>
                              </div>
                            );
                          }
                          return dayBookings.map((book) => (
                            <div
                              key={book.id}
                              className={`p-4 rounded-2xl border space-y-3 transition-all relative group overflow-hidden ${
                                book.bookingType === 'daily'
                                  ? 'bg-indigo-500/5 border-indigo-500/15'
                                  : 'bg-pink-500/5 border-pink-500/15'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-extrabold text-white text-sm">ห้อง {book.roomNumber}</span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-lg font-black uppercase ${
                                      book.bookingType === 'daily'
                                        ? 'bg-indigo-500/10 text-indigo-400'
                                        : 'bg-pink-500/10 text-pink-400'
                                    }`}>
                                      {book.bookingType === 'daily' ? 'รายวัน' : 'รายเดือน'}
                                    </span>
                                  </div>
                                  <span className="text-xs font-bold text-white block mt-1.5">{book.guestName}</span>
                                  <span className="text-[11px] text-slate-400 block mt-0.5">📞 {book.guestPhone}</span>
                                </div>

                                <span className={`text-[10px] px-2.5 py-1 rounded-lg font-bold border ${
                                  book.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                  book.status === 'CheckedOut' ? 'bg-slate-800 text-slate-400 border-slate-700' :
                                  book.status === 'Pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                  'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                }`}>
                                  {book.status === 'Active' ? 'เช็คอินอยู่' :
                                   book.status === 'CheckedOut' ? 'เช็คเอาท์แล้ว' :
                                   book.status === 'Pending' ? 'รอเช็คอิน' : 'ยกเลิก'}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-3 text-[10px] bg-slate-900/60 p-3 rounded-xl border border-slate-800/50">
                                <div>
                                  <span className="text-slate-500 block mb-0.5">📅 วันเข้าเช็คอิน</span>
                                  <span className="text-slate-200 font-extrabold">{book.checkInDate}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 block mb-0.5">📅 วันเช็คเอาท์</span>
                                  <span className="text-slate-200 font-extrabold">{book.checkOutDate}</span>
                                </div>
                              </div>

                              {/* Quick Actions inside Calendar Panel */}
                              <div className="flex items-center gap-2 pt-1.5">
                                {book.status === 'Pending' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleBookingStatusChange(book.id, 'Active')}
                                      className="flex-1 bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-black py-2 rounded-xl text-xxs transition-all cursor-pointer text-center"
                                    >
                                      เช็คอินเข้าห้อง
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleBookingStatusChange(book.id, 'Cancelled')}
                                      className="flex-1 bg-slate-900 border border-slate-800 text-rose-400 hover:bg-rose-500/10 font-bold py-2 rounded-xl text-xxs transition-all cursor-pointer text-center"
                                    >
                                      ยกเลิกจอง
                                    </button>
                                  </>
                                )}
                                {book.status === 'Active' && (
                                  <button
                                    type="button"
                                    onClick={() => handleBookingStatusChange(book.id, 'CheckedOut')}
                                    className="w-full bg-slate-900 border border-slate-850 hover:border-slate-700 text-slate-300 hover:text-white font-bold py-2 rounded-xl text-xxs transition-all cursor-pointer text-center"
                                  >
                                    ลงบันทึกเช็คเอาท์ (Check Out)
                                  </button>
                                )}
                              </div>
                            </div>
                          ));
                        })()
                      ) : (
                        <div className="text-center py-16">
                          <p className="text-xs text-slate-500 font-semibold">กรุณาเลือกวันในปฏิทินเพื่อดูข้อมูลเพิ่มเติม</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}


        {/* TAB 4: METER UTILITY BILL CALCULATOR */}
        {activeTab === 'utilities' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">บันทึกจดมิเตอร์ & ออกบิลค่าน้ำค่าไฟ</h1>
              <p className="text-slate-400 text-sm mt-1">
                ระบุหมายเลขห้องที่ต้องการประเมินบิล กรอกเลขมิเตอร์น้ำและไฟฟ้าปัจจุบัน ระบบจะคำนวณผลและจัดทำใบเสร็จให้อย่างโปร่งใส
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column Form: Input meter readings */}
              <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-2xl p-6 h-fit">
                <div className="flex items-center gap-2 mb-6">
                  <span className="bg-brand-500/15 text-brand-400 p-2 rounded-xl">
                    <Zap className="w-5 h-5" />
                  </span>
                  <h3 className="text-lg font-bold text-white">ประเมินบิลน้ำและไฟ</h3>
                </div>

                <form onSubmit={handleCreateInvoice} className="space-y-5">
                  {/* Select Occupied monthly Room */}
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">เลือกห้องพัก (สำหรับเช่ารายเดือน)</label>
                    <select
                      id="utility-select-room"
                      required
                      value={selectedRoomIdForBill}
                      onChange={(e) => {
                        setSelectedRoomIdForBill(e.target.value);
                        setInputCurrElectricity('');
                        setInputCurrWater('');
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500 text-white"
                    >
                      <option value="">-- เลือกห้องพักที่มีผู้เช่า --</option>
                      {rooms
                        .filter(r => r.status === 'Occupied')
                        .map(r => (
                          <option key={r.id} value={r.id}>ห้อง {r.number} ({r.type})</option>
                        ))}
                    </select>
                  </div>

                  {/* Select month of billing */}
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">รอบบิลเดือนที่คิดเงิน</label>
                    <select
                      id="utility-billing-month"
                      value={selectedBillingMonth}
                      onChange={(e) => setSelectedBillingMonth(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500 text-white"
                    >
                      {['มิถุนายน 2569', 'กรกฎาคม 2569', 'สิงหาคม 2569', 'กันยายน 2569'].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  {selectedRoomForBill && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4 pt-2">
                      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-2">
                        <span className="font-bold text-slate-300 block">💾 เลขจดครั้งก่อน (Previous Meters):</span>
                        <div className="flex justify-between">
                          <span>🔌 มิเตอร์ไฟฟ้าครั้งก่อน:</span>
                          <span className="font-bold text-white">{selectedRoomForBill.electricityMeter} kWh</span>
                        </div>
                        <div className="flex justify-between">
                          <span>💧 มิเตอร์น้ำประปาครั้งก่อน:</span>
                          <span className="font-bold text-white">{selectedRoomForBill.waterMeter} m³</span>
                        </div>
                      </div>

                      {/* Current inputs */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xxs text-slate-400 block mb-1">🔌 เลขไฟปัจจุบัน (kWh)</label>
                          <input
                            id="utility-curr-electricity"
                            type="number"
                            required
                            placeholder={`>= ${selectedRoomForBill.electricityMeter}`}
                            value={inputCurrElectricity}
                            onChange={(e) => setInputCurrElectricity(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500 text-white"
                          />
                        </div>
                        <div>
                          <label className="text-xxs text-slate-400 block mb-1">💧 เลขน้ำปัจจุบัน (m³)</label>
                          <input
                            id="utility-curr-water"
                            type="number"
                            required
                            placeholder={`>= ${selectedRoomForBill.waterMeter}`}
                            value={inputCurrWater}
                            onChange={(e) => setInputCurrWater(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500 text-white"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <button
                    id="btn-create-bill"
                    type="submit"
                    disabled={!utilityBillPreview || !utilityBillPreview.isValid}
                    className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                      utilityBillPreview && utilityBillPreview.isValid
                        ? 'bg-brand-500 text-slate-950 hover:bg-brand-600 shadow-md'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    ยืนยันออกบิลประจำงวด
                  </button>
                </form>
              </div>

              {/* Right Column: Live bill computation preview */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* Real-time Receipt Mockup */}
                <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-brand-500/5 rounded-full blur-2xl" />
                  
                  <div className="flex justify-between items-baseline mb-6 pb-4 border-b border-slate-800/60">
                    <div>
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider">PREVIEW INVOICE</h4>
                      <span className="text-xxs text-brand-400 font-mono">{(settings.propertyName || 'DORMYHUB').toUpperCase()} RESIDENCES BILLING</span>
                    </div>
                    <span className="text-xxs text-slate-500 font-mono">บิลรอประมวลผล</span>
                  </div>

                  {utilityBillPreview ? (
                    <div className="space-y-4">
                      {/* Meter summary */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800/60">
                          <span className="text-xxs text-slate-400 flex items-center gap-1.5">
                            <Zap className="w-3 h-3 text-amber-400" /> การใช้กระแสไฟฟ้า
                          </span>
                          <div className="mt-2 text-xl font-bold text-white">
                            {utilityBillPreview.elecUnits} <span className="text-xs font-normal text-slate-400">หน่วย</span>
                          </div>
                          <span className="text-xxs text-slate-500 block mt-1">
                            {selectedRoomForBill?.electricityMeter} ถึง {inputCurrElectricity} kWh
                          </span>
                        </div>
                        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800/60">
                          <span className="text-xxs text-slate-400 flex items-center gap-1.5">
                            <Droplet className="w-3 h-3 text-blue-400" /> การใช้น้ำประปา
                          </span>
                          <div className="mt-2 text-xl font-bold text-white">
                            {utilityBillPreview.watUnits} <span className="text-xs font-normal text-slate-400">หน่วย</span>
                          </div>
                          <span className="text-xxs text-slate-500 block mt-1">
                            {selectedRoomForBill?.waterMeter} ถึง {inputCurrWater} m³
                          </span>
                        </div>
                      </div>

                      {/* Cost detail breakdown */}
                      <div className="space-y-2.5 pt-2">
                        <div className="flex justify-between items-center text-xs text-slate-300">
                          <span>ค่าไฟฟ้า ({utilityBillPreview.elecUnits} ยูนิต * {settings.electricityUnitRate} บาท)</span>
                          <span className="font-bold">฿{utilityBillPreview.elecCost.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-slate-300">
                          <span>ค่าน้ำประปา ({utilityBillPreview.watUnits} ยูนิต * {settings.waterUnitRate} บาท)</span>
                          <span className="font-bold">฿{utilityBillPreview.watCost.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-slate-300">
                          <span>ค่าดูแลรักษาความสะอาด & ส่วนกลาง</span>
                          <span className="font-bold">฿{utilityBillPreview.common.toLocaleString()}</span>
                        </div>
                        
                        {!utilityBillPreview.isValid && (
                          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl text-xs flex items-center gap-2 mt-4">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            <span>ข้อผิดพลาด: เลขมิเตอร์ปัจจุบันต้องไม่น้อยกว่าเลขจดครั้งก่อนหน้า</span>
                          </div>
                        )}

                        <div className="h-px bg-slate-800 my-2" />
                        <div className="flex justify-between items-center font-bold text-lg text-white">
                          <span>รวมยอดบิลค่าน้ำค่าไฟงวดนี้:</span>
                          <span className="text-2xl text-brand-400">฿{utilityBillPreview.totalCost.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-16 text-slate-500 text-sm">
                      <HelpCircle className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                      กรุณาเลือกห้องและกรอกเลขจดมิเตอร์เพื่อแสดงพรีวิวใบแจ้งหนี้แบบสด
                    </div>
                  )}
                </div>

                {/* Generated list history */}
                <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6">
                  <h4 className="text-base font-bold text-white mb-4">📝 ประวัติใบแจ้งหนี้ทั้งหมด</h4>
                  <div className="space-y-3.5">
                    {invoices.map((inv) => (
                      <div key={inv.id} className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 flex justify-between items-center">
                        <div className="text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white">ห้อง {inv.roomNumber}</span>
                            <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-400">{inv.billingMonth}</span>
                          </div>
                          <div className="text-slate-400 mt-2 space-y-0.5">
                            <p>🔌 ไฟฟ้า: ฿{inv.electricityCost} ({inv.currElectricity - inv.prevElectricity} หน่วย)</p>
                            <p>💧 น้ำประปา: ฿{inv.waterCost} ({inv.currWater - inv.prevWater} หน่วย)</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="text-base font-bold text-white block">฿{inv.totalCost.toLocaleString()}</span>
                            <span className={`inline-block text-xxs px-2 py-0.5 mt-1 rounded-full font-semibold ${
                              inv.status === 'Paid' 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}>
                              {inv.status === 'Paid' ? 'ชำระแล้ว' : 'ค้างชำระ'}
                            </span>
                          </div>

                          <div className="shrink-0 flex items-center justify-end">
                            {deleteConfirmInvoiceId === inv.id ? (
                              <div className="flex items-center gap-1.5 bg-rose-500/5 border border-rose-500/25 p-1 rounded-xl animate-pulse">
                                <span className="text-[10px] text-rose-400 font-medium px-1">ลบ?</span>
                                <button
                                  id={`btn-confirm-delete-inv-${inv.id}`}
                                  onClick={() => {
                                    onUpdateInvoices(invoices.filter((item) => item.id !== inv.id));
                                    setDeleteConfirmInvoiceId(null);
                                  }}
                                  className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[10px] font-bold transition-all shadow-md shadow-rose-600/25 cursor-pointer"
                                >
                                  ยืนยัน
                                </button>
                                <button
                                  id={`btn-cancel-delete-inv-${inv.id}`}
                                  onClick={() => setDeleteConfirmInvoiceId(null)}
                                  className="p-1 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-md transition-colors cursor-pointer"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                id={`btn-trigger-delete-inv-${inv.id}`}
                                onClick={() => setDeleteConfirmInvoiceId(inv.id)}
                                className="p-2 bg-slate-900 border border-slate-800/80 rounded-xl hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                                title="ลบใบแจ้งหนี้"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          </motion.div>
        )}

        {/* TAB 5: CENTRAL SETTINGS */}
        {activeTab === 'settings' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 max-w-2xl">
            <div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">ตั้งค่าระบบกลาง</h1>
              <p className="text-slate-400 text-sm mt-1">กำหนดชื่อสถานที่ ข้อมูลการชำระเงิน และราคาอัตราค่าบริการ</p>
            </div>

            {/* General Info & PromptPay */}
            <div className="bg-slate-950 rounded-2xl border border-slate-800 p-6 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                🏨 ข้อมูลสถานที่ & การรับเงินโอน
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-2">ชื่อสถานที่ / โรงแรม</label>
                  <input
                    id="settings-property-name"
                    type="text"
                    value={settings.propertyName || ''}
                    onChange={(e) => onUpdateSettings({ ...settings, propertyName: e.target.value })}
                    placeholder="DORMYHUB"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-2">เบอร์พร้อมเพย์ (PromptPay)</label>
                  <input
                    id="settings-promptpay-number"
                    type="text"
                    value={settings.promptPayNumber || ''}
                    onChange={(e) => onUpdateSettings({ ...settings, promptPayNumber: e.target.value })}
                    placeholder="089-123-4567"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            </div>

            {/* LINE Notification Settings */}
            <div className="bg-slate-950 rounded-2xl border border-slate-800 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Bell className="w-4 h-4 text-emerald-400" />
                  📱 ระบบแจ้งเตือนผ่าน LINE
                </h3>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.lineNotificationEnabled || false}
                    onChange={(e) => onUpdateSettings({ ...settings, lineNotificationEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:bg-white"></div>
                  <span className="ml-2 text-xs font-semibold text-slate-400">
                    {settings.lineNotificationEnabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                  </span>
                </label>
              </div>

              {settings.lineNotificationEnabled && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-4 pt-2 border-t border-slate-800/80 animate-fade-in"
                >
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-2">ประเภทบริการแจ้งเตือน LINE</label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => onUpdateSettings({ ...settings, lineTokenType: 'Notify' })}
                        className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          (settings.lineTokenType || 'Notify') === 'Notify'
                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold shadow-[0_0_10px_rgba(16,185,129,0.15)]'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300'
                        }`}
                      >
                        💬 LINE Notify
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateSettings({ ...settings, lineTokenType: 'MessagingApi' })}
                        className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          settings.lineTokenType === 'MessagingApi'
                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold shadow-[0_0_10px_rgba(16,185,129,0.15)]'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300'
                        }`}
                      >
                        🤖 LINE Messaging API (Bot)
                      </button>
                    </div>
                  </div>

                  {(settings.lineTokenType || 'Notify') === 'Notify' ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-400 block mb-2">LINE Notify Token</label>
                        <input
                          id="settings-line-notify-token"
                          type="password"
                          value={settings.lineNotifyToken || ''}
                          onChange={(e) => onUpdateSettings({ ...settings, lineNotifyToken: e.target.value })}
                          placeholder="กรอก LINE Notify Token ของคุณ"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500 font-mono"
                        />
                      </div>
                      <div className="bg-slate-900 border border-slate-800/80 p-3.5 rounded-xl space-y-1">
                        <span className="text-xxs font-bold text-emerald-400 uppercase tracking-wider block">💡 วิธีรับ LINE Notify Token:</span>
                        <ol className="text-xxs text-slate-400 space-y-1 list-decimal list-inside leading-relaxed font-light">
                          <li>เข้าสู่เว็บไซต์ <a href="https://notify-bot.line.me" target="_blank" rel="noreferrer" className="text-brand-400 underline hover:text-brand-300">LINE Notify</a> แล้วล็อกอินด้วยบัญชี LINE</li>
                          <li>ไปที่ <strong className="text-slate-200">My Page (หน้าของฉัน)</strong> แล้วคลิก <strong className="text-slate-200">Generate Token (ออก Token)</strong></li>
                          <li>เลือกแชทส่วนตัว หรือกลุ่มที่ต้องการให้แจ้งเตือน แล้วคัดลอก Token มาใส่ในช่องด้านบน</li>
                          <li><strong className="text-emerald-400">สำคัญ:</strong> หากเป็นแชทกลุ่ม ต้องเชิญบัญชีชื่อ "LINE Notify" เข้ากลุ่มด้วย</li>
                        </ol>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-400 block mb-1 font-semibold text-white">LINE Channel Access Token (long-lived)</label>
                        <span className="text-[10px] text-slate-500 block mb-2 leading-tight">คัดลอกจาก LINE Developers Console (ตรงกับรูปที่ส่งมา)</span>
                        <textarea
                          id="settings-line-channel-token"
                          rows={3}
                          value={settings.lineChannelAccessToken || ''}
                          onChange={(e) => onUpdateSettings({ ...settings, lineChannelAccessToken: e.target.value })}
                          placeholder="คัดลอก Channel access token ยาวๆ มาใส่ที่นี่"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-brand-500 font-mono leading-relaxed"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-400 block mb-1">LINE User ID ของผู้รับ (Target User ID) - ไม่บังคับ</label>
                        <span className="text-[10px] text-slate-500 block mb-2 leading-tight">ระบุเพื่อส่งแบบ Push Message ส่วนตัว (หากไม่ใส่ ระบบจะใช้วิธี Broadcast ส่งให้เพื่อนทุกคนที่ติดตามบอท)</span>
                        <input
                          id="settings-line-user-id"
                          type="text"
                          value={settings.lineUserId || ''}
                          onChange={(e) => onUpdateSettings({ ...settings, lineUserId: e.target.value })}
                          placeholder="เช่น U123456789abcdef0123456789abcdef"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500 font-mono"
                        />
                      </div>

                      <div className="bg-slate-900 border border-slate-800/80 p-3.5 rounded-xl space-y-1">
                        <span className="text-xxs font-bold text-emerald-400 uppercase tracking-wider block">💡 วิธีรับ Channel Access Token & User ID:</span>
                        <ol className="text-xxs text-slate-400 space-y-1 list-decimal list-inside leading-relaxed font-light">
                          <li>เข้าสู่ระบบ <a href="https://developers.line.biz" target="_blank" rel="noreferrer" className="text-brand-400 underline hover:text-brand-300">LINE Developers Console</a></li>
                          <li>เลือก Provider และ Channel ประเภท Messaging API ของคุณ</li>
                          <li>เลื่อนไปที่แท็บ <strong className="text-slate-200">Messaging API</strong> เพื่อออกรหัส <strong className="text-slate-200">Channel access token (long-lived)</strong></li>
                          <li>ค้นหา <strong className="text-slate-200">Your user ID</strong> ของคุณที่แท็บแรกสุด (Basic settings) ด้านล่างสุด เพื่อรับรหัสผู้รับ</li>
                        </ol>
                      </div>
                    </div>
                  )}

                  {/* Test Connection Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={lineTestLoading}
                      onClick={handleTestLineNotification}
                      className="w-full bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:bg-emerald-500/5 text-white py-2.5 px-4 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {lineTestLoading ? (
                        <>
                          <div className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                          กำลังส่งข้อความทดสอบ...
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5 text-emerald-400" />
                          ทดสอบส่งข้อความแจ้งเตือน (Test LINE Notify / API)
                        </>
                      )}
                    </button>

                    {lineTestResult && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`mt-3 p-3 rounded-xl text-xxs flex items-start gap-2 border ${
                          lineTestResult.success
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                        }`}
                      >
                        {lineTestResult.success ? (
                          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                        )}
                        <span>{lineTestResult.message}</span>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}
            </div>

            <div className="bg-slate-950 rounded-2xl border border-slate-800 p-6 space-y-6">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
                ⚡ อัตราค่าสาธารณูปโภค & เงินมัดจำ
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-2">อัตราค่าไฟฟ้าต่อหน่วย (บาท / kWh)</label>
                  <input
                    id="settings-electricity-rate"
                    type="number"
                    value={settings.electricityUnitRate}
                    onChange={(e) => onUpdateSettings({ ...settings, electricityUnitRate: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-2">อัตราค่าน้ำต่อหน่วย (บาท / m³)</label>
                  <input
                    id="settings-water-rate"
                    type="number"
                    value={settings.waterUnitRate}
                    onChange={(e) => onUpdateSettings({ ...settings, waterUnitRate: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-2">ค่าบริการส่วนกลางรายยูนิต (บาท / เดือน)</label>
                  <input
                    id="settings-common-fee"
                    type="number"
                    value={settings.commonFee}
                    onChange={(e) => onUpdateSettings({ ...settings, commonFee: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-2">ตัวคูณค่ามัดจำขั้นต้น (เดือนของสัญญา)</label>
                  <select
                    id="settings-deposit-multiplier"
                    value={settings.securityDepositMultiplier}
                    onChange={(e) => onUpdateSettings({ ...settings, securityDepositMultiplier: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none text-white"
                  >
                    <option value={1}>1 เดือน (มัดจำเท่ากับค่าห้อง 1 เดือน)</option>
                    <option value={2}>2 เดือน (มัดจำล่วงหน้า 2 เดือน)</option>
                  </select>
                </div>
              </div>

              <div className="bg-brand-500/10 border border-brand-500/20 text-brand-400 p-4 rounded-xl text-xs flex items-start gap-2.5">
                <HelpCircle className="w-5 h-5 shrink-0 text-brand-300" />
                <div className="space-y-1">
                  <span className="font-bold text-white block">ℹ️ ข้อมูลการตั้งค่าความโปร่งใส</span>
                  <p className="leading-relaxed">
                    เมื่อปรับปรุงการตั้งค่า อัตราส่วนนี้จะถูกใช้ประเมินทันทีสำหรับรายการบิลค่าน้ำค่าไฟ และการจองห้องพักใหม่ที่เกิดขึ้นหลังจากนี้เป็นต้นไป
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

      </main>

    </div>
  );
}

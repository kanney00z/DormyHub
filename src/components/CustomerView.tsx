import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wifi, Tv, Snowflake, Shield, Compass, Sparkles, 
  Search, Filter, CheckCircle2, ChevronRight, User, 
  Phone, Mail, Calendar, HelpCircle, RefreshCw, X,
  Zap, Droplet, FileText, Check, Wrench, Printer, Camera, AlertCircle, Clock
} from 'lucide-react';
import { Room, Booking, SystemSettings, UtilityInvoice, MaintenanceTicket } from '../types';
import { sendLineNotification } from '../utils/line';

interface CustomerViewProps {
  rooms: Room[];
  settings: SystemSettings;
  onAddBooking: (booking: Omit<Booking, 'id' | 'createdAt'>) => void;
  invoices: UtilityInvoice[];
  onUpdateInvoices?: (invoices: UtilityInvoice[]) => void;
  tickets?: MaintenanceTicket[];
  onUpdateTickets?: (tickets: MaintenanceTicket[]) => void;
}

export default function CustomerView({ 
  rooms, 
  settings, 
  onAddBooking, 
  invoices,
  onUpdateInvoices,
  tickets = [],
  onUpdateTickets
}: CustomerViewProps) {
  const [selectedType, setSelectedType] = useState<string>('All');
  const [bookingMode, setBookingMode] = useState<'daily' | 'monthly'>('daily');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  
  // Utility Check Form State
  const [utilityRoomId, setUtilityRoomId] = useState<string>('');
  const [showUtilityCheckModal, setShowUtilityCheckModal] = useState(false);
  
  // Booking Form State
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestLine, setGuestLine] = useState('');
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [monthlyMonths, setMonthlyMonths] = useState(1); // Lease duration in months
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'PromptPay'>('Cash');
  const [slipImage, setSlipImage] = useState<string>('');
  const [formError, setFormError] = useState<string>('');
  
  // UI States
  const [bookingSuccess, setBookingSuccess] = useState<Booking | null>(null);

  // Maintenance Ticket States
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [ticketRoomId, setTicketRoomId] = useState('');
  const [ticketCategory, setTicketCategory] = useState<'aircon' | 'plumbing' | 'electricity' | 'furniture' | 'other'>('aircon');
  const [ticketUrgency, setTicketUrgency] = useState<'low' | 'medium' | 'high'>('medium');
  const [ticketDescription, setTicketDescription] = useState('');
  const [ticketPhoto, setTicketPhoto] = useState('');
  const [ticketSuccess, setTicketSuccess] = useState(false);
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [ticketError, setTicketError] = useState('');

  // Slip Scanner Simulation States
  const [activeSlipInvoice, setActiveSlipInvoice] = useState<UtilityInvoice | null>(null);
  const [scanningSlip, setScanningSlip] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanLogs, setScanLogs] = useState<string[]>([]);
  const [uploadedSlipFile, setUploadedSlipFile] = useState<string>('');

  // Printable Receipt Modal
  const [activePrintInvoice, setActivePrintInvoice] = useState<UtilityInvoice | null>(null);


  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter(room => {
      // Show only available or occupied rooms (exclude maintenance from booking)
      if (room.status === 'Maintenance') return false;
      
      const matchesType = selectedType === 'All' || room.type === selectedType;
      const matchesSearch = room.number.includes(searchQuery) || 
        room.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.amenities.some(a => a.toLowerCase().includes(searchQuery.toLowerCase()));
      
      return matchesType && matchesSearch;
    });
  }, [rooms, selectedType, searchQuery]);

  // Amenity icon helper
  const getAmenityIcon = (amenityName: string) => {
    const name = amenityName.toLowerCase();
    if (name.includes('wi-fi') || name.includes('เน็ต') || name.includes('อินเทอร์เน็ต')) {
      return <Wifi className="w-4 h-4 text-brand-600" />;
    }
    if (name.includes('ทีวี') || name.includes('tv')) {
      return <Tv className="w-4 h-4 text-brand-600" />;
    }
    if (name.includes('แอร์') || name.includes('ปรับอากาศ')) {
      return <Snowflake className="w-4 h-4 text-blue-500" />;
    }
    if (name.includes('ดิจิทัล') || name.includes('ล็อก') || name.includes('ระบบ')) {
      return <Shield className="w-4 h-4 text-emerald-600" />;
    }
    return <CheckCircle2 className="w-4 h-4 text-brand-500" />;
  };

  // Cost calculator
  const calculation = useMemo(() => {
    if (!selectedRoom) return { subtotal: 0, deposit: 0, common: 0, grandTotal: 0, daysCount: 0 };

    if (bookingMode === 'daily') {
      if (!checkInDate || !checkOutDate) return { subtotal: 0, deposit: 0, common: 0, grandTotal: 0, daysCount: 0 };
      const start = new Date(checkInDate);
      const end = new Date(checkOutDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const daysCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
      const subtotal = daysCount * selectedRoom.dailyPrice;
      return {
        subtotal,
        deposit: 0,
        common: 0,
        grandTotal: subtotal,
        daysCount
      };
    } else {
      // Monthly
      const baseRent = selectedRoom.monthlyPrice * monthlyMonths;
      const deposit = selectedRoom.monthlyPrice * settings.securityDepositMultiplier;
      const common = settings.commonFee * monthlyMonths;
      const grandTotal = baseRent + deposit + common;
      return {
        subtotal: baseRent,
        deposit,
        common,
        grandTotal,
        daysCount: monthlyMonths * 30
      };
    }
  }, [selectedRoom, bookingMode, checkInDate, checkOutDate, monthlyMonths, settings]);

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketRoomId) {
      setTicketError('กรุณาเลือกห้องพักของท่าน');
      return;
    }
    if (!guestName.trim()) {
      setTicketError('กรุณาระบุชื่อผู้แจ้ง');
      return;
    }
    if (!guestPhone.trim()) {
      setTicketError('กรุณาระบุเบอร์โทรศัพท์ติดต่อ');
      return;
    }
    if (!ticketDescription.trim()) {
      setTicketError('กรุณากรอกรายละเอียดปัญหา');
      return;
    }

    setTicketSubmitting(true);
    setTicketError('');

    const room = rooms.find(r => r.id === ticketRoomId);
    const roomNum = room ? room.number : '';

    const newTicket: MaintenanceTicket = {
      id: 'TC-' + Math.floor(1000 + Math.random() * 9000),
      roomId: ticketRoomId,
      roomNumber: roomNum,
      guestName: guestName,
      guestPhone: guestPhone,
      category: ticketCategory,
      urgency: ticketUrgency,
      description: ticketDescription,
      status: 'Pending',
      createdAt: new Date().toISOString(),
      photo: ticketPhoto || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80',
    };

    if (onUpdateTickets) {
      onUpdateTickets([...tickets, newTicket]);
    }

    // LINE Notification
    const catThai = {
      aircon: 'เครื่องปรับอากาศ (Aircon)',
      plumbing: 'ระบบประปา/สุขภัณฑ์ (Plumbing)',
      electricity: 'ระบบไฟฟ้า (Electricity)',
      furniture: 'เฟอร์นิเจอร์/อุปกรณ์ (Furniture)',
      other: 'อื่นๆ (Other)'
    }[ticketCategory];

    const urgencyThai = {
      low: '🟢 ต่ำ (Low)',
      medium: '🟡 ปานกลาง (Medium)',
      high: '🔴 สูงด่วน (High)'
    }[ticketUrgency];

    const msg = `🚨 มีรายการแจ้งซ่อมใหม่เข้ามา! 🚨
──────────────────────────
🏢 สถานที่: ห้อง ${roomNum}
👤 ผู้แจ้ง: คุณ ${guestName}
📞 เบอร์ติดต่อ: ${guestPhone}
🛠️ หมวดหมู่: ${catThai}
⚠️ ความเร่งด่วน: ${urgencyThai}
📝 รายละเอียด: ${ticketDescription}
📅 วันที่แจ้ง: ${new Date().toLocaleDateString('th-TH')} เวลา ${new Date().toLocaleTimeString('th-TH')}
──────────────────────────
กรุณาเข้าสู่ระบบหลังบ้านเพื่อประสานงานช่างและดำเนินการแก้ไขโดยเร็วที่สุด`;

    sendLineNotification(settings, msg).catch(err => console.error('Failed to send maintenance line notification', err));

    setTimeout(() => {
      setTicketSubmitting(false);
      setTicketSuccess(true);
      setTicketDescription('');
      setTicketPhoto('');
    }, 1200);
  };

  const handleStartSlipScan = (inv: UtilityInvoice) => {
    setActiveSlipInvoice(inv);
    setScanningSlip(true);
    setScanProgress(0);
    setScanLogs(['⚙️ กำลังประมวลผลรูปภาพบิลสลิปเงินโอน...', '⚙️ กำลังเชื่อมต่อระบบ AI Slip Reader Hub...']);
    
    let progress = 0;
    const interval = setInterval(() => {
      progress += 20;
      setScanProgress(progress);
      
      if (progress === 20) {
        setScanLogs(prev => [...prev, '🔍 ตรวจจับสัญลักษณ์บัญชีโอนเงิน (PromptPay ID Verified)...']);
      } else if (progress === 40) {
        setScanLogs(prev => [...prev, '🔍 ค้นหาเลขที่อ้างอิงธุรกรรม (Transaction QR Reference Found)...']);
      } else if (progress === 60) {
        setScanLogs(prev => [...prev, `🔍 ตรวจพบชื่อบัญชีผู้รับโอนเงินปลายทาง ตรงกับ: ${settings.propertyName || 'DormyHub'}`]);
      } else if (progress === 80) {
        setScanLogs(prev => [...prev, `🔍 ตรวจสอบยอดเงินโอน: ยอดเงินตรงกันสมบูรณ์ ฿${inv.totalCost.toLocaleString()} บาท`]);
      } else if (progress === 100) {
        clearInterval(interval);
        setScanLogs(prev => [...prev, '✅ การสแกนและตรวจสอบสลิปสำเร็จ 100%! บันทึกสถานะชำระเงินเรียบร้อย']);
        
        if (onUpdateInvoices) {
          const updated = invoices.map(i => {
            if (i.id === inv.id) {
              return {
                ...i,
                status: 'Paid' as const,
                paidDate: new Date().toISOString().split('T')[0]
              };
            }
            return i;
          });
          onUpdateInvoices(updated);
        }

        const msg = `🧾 ได้รับชำระเงินสำเร็จ (E-Receipt Issued) 🧾
──────────────────────────
🏢 โครงการ: ${settings.propertyName || 'DORMYHUB'}
🚪 ห้องพัก: ห้อง ${inv.roomNumber}
📅 รอบบิล: ${inv.billingMonth}
💰 ยอดชำระ: ฿${inv.totalCost.toLocaleString()} บาท
💳 รูปแบบชำระ: สแกนพร้อมเพย์ผ่านระบบออโต้ AI
✅ สถานะบิล: ชำระเรียบร้อยแล้ว (Paid)
📅 วันเวลาที่บันทึก: ${new Date().toLocaleDateString('th-TH')} ${new Date().toLocaleTimeString('th-TH')}
──────────────────────────
ขอบพระคุณที่ใช้บริการ ท่านสามารถเข้าดูและพิมพ์ใบเสร็จทางการได้จากหน้าเช็คค่าน้ำค่าไฟของโครงการค่ะ`;

        sendLineNotification(settings, msg).catch(err => console.error('Failed to send invoice payment line notification', err));

        setTimeout(() => {
          setScanningSlip(false);
          setActiveSlipInvoice(null);
          setUploadedSlipFile('');
        }, 1800);
      }
    }, 700);
  };


  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return;

    setFormError('');
    if (paymentMethod === 'PromptPay' && !slipImage) {
      setFormError('กรุณาอัปโหลดสลิปหลักฐานการโอนเงินเพื่อดำเนินการจองห้องพัก');
      return;
    }

    let calculatedCheckOut = checkOutDate;
    if (bookingMode === 'monthly') {
      const start = checkInDate ? new Date(checkInDate) : new Date();
      const end = new Date(start);
      end.setMonth(start.getMonth() + monthlyMonths);
      calculatedCheckOut = end.toISOString().split('T')[0];
    }

    const newBookingData = {
      roomId: selectedRoom.id,
      roomNumber: selectedRoom.number,
      guestName,
      guestPhone,
      guestEmail,
      guestLine,
      checkInDate: checkInDate || new Date().toISOString().split('T')[0],
      checkOutDate: calculatedCheckOut,
      bookingType: bookingMode,
      status: 'Pending' as const,
      totalPrice: calculation.grandTotal,
      depositPaid: calculation.deposit,
      paymentMethod,
      slipImage: paymentMethod === 'PromptPay' ? slipImage : undefined,
    };

    onAddBooking(newBookingData);

    // Mock response
    setBookingSuccess({
      id: 'BK-' + Math.floor(100000 + Math.random() * 900000),
      ...newBookingData,
      createdAt: new Date().toISOString()
    });

    // Reset Form
    setSelectedRoom(null);
    setGuestName('');
    setGuestPhone('');
    setGuestEmail('');
    setGuestLine('');
    setCheckInDate('');
    setCheckOutDate('');
    setMonthlyMonths(1);
    setPaymentMethod('Cash');
    setSlipImage('');
    setFormError('');
  };

  return (
    <div className="w-full bg-[#0a0a0c] min-h-screen text-slate-100">
      {/* Premium Hero Banner */}
      <section className="relative min-h-[520px] bg-slate-900 overflow-hidden flex flex-col items-center justify-center pt-28 pb-16">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1920&q=80" 
            alt="Luxury Lobby" 
            className="w-full h-full object-cover opacity-35 filter brightness-75 scale-105"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent" />
        </div>
        
        <div className="relative z-10 text-center max-w-4xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="inline-flex items-center gap-2 bg-brand-400/20 text-brand-300 border border-brand-400/30 px-4 py-1.5 rounded-full mb-6 backdrop-blur-sm"
          >
            <Sparkles className="w-4 h-4 text-brand-300" />
            <span className="text-xs md:text-sm font-medium tracking-wide">Boutique & Premium Residences</span>
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-4xl md:text-6xl font-bold text-white tracking-tight leading-tight"
          >
            สัมผัสประสบการณ์การพักผ่อน <br className="hidden md:inline" />
            <span className="bg-gradient-to-r from-brand-300 via-brand-200 to-amber-100 bg-clip-text text-transparent inline-block">
              ที่เหนือระดับกับ {settings.propertyName || 'DormyHub'}
            </span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-6 text-lg text-slate-300 max-w-2xl mx-auto font-light leading-relaxed"
          >
            บริการห้องพักรายวันสุดหรู และรายเดือนดีไซน์พรีเมียม พร้อมระบบบริหารจัดการค่าน้ำค่าไฟหลังบ้านที่โปร่งใส ตรวจสอบได้ทุกยูนิต
          </motion.p>
        </div>
      </section>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 -mt-20 relative z-20 pb-24">
        
        {/* Filters & Booking Mode Selector */}
        <div className="bg-[#121216]/90 backdrop-blur-md rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] p-6 md:p-8 border border-white/10">
          <div className="flex flex-col xl:flex-row xl:flex-wrap xl:items-center justify-between gap-6 pb-6 border-b border-white/10">
            {/* Left: Mode Toggle & Utilities Check */}
            <div className="flex flex-col lg:flex-row lg:items-center gap-4 w-full xl:w-auto shrink-0">
              <div className="flex items-center gap-2 p-1.5 bg-[#0a0a0c]/85 border border-white/10 rounded-2xl w-fit shrink-0">
                <button
                  id="btn-mode-daily"
                  onClick={() => setBookingMode('daily')}
                  className={`px-6 py-3 rounded-xl font-medium text-sm transition-all duration-300 flex items-center gap-2 ${
                    bookingMode === 'daily'
                      ? 'bg-brand-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-brand-500/30 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  จองพักรายวัน (Daily)
                </button>
                <button
                  id="btn-mode-monthly"
                  onClick={() => setBookingMode('monthly')}
                  className={`px-6 py-3 rounded-xl font-medium text-sm transition-all duration-300 flex items-center gap-2 ${
                    bookingMode === 'monthly'
                      ? 'bg-brand-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-brand-500/30 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Compass className="w-4 h-4" />
                  เช่ารายเดือน (Monthly)
                </button>
              </div>

              <button
                id="btn-trigger-utility-check"
                onClick={() => {
                  setShowUtilityCheckModal(true);
                  // Default to first occupied room or first room
                  const firstOccupied = rooms.find(r => r.status === 'Occupied');
                  if (firstOccupied && !utilityRoomId) {
                    setUtilityRoomId(firstOccupied.id);
                  } else if (rooms.length > 0 && !utilityRoomId) {
                    setUtilityRoomId(rooms[0].id);
                  }
                }}
                className="px-5 py-3.5 rounded-2xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 hover:border-indigo-400/40 font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 w-full lg:w-auto shadow-lg hover:shadow-indigo-500/5 cursor-pointer shrink-0"
              >
                <Zap className="w-4 h-4 text-amber-400 stroke-[2.5]" />
                <Droplet className="w-4 h-4 text-blue-400 -ml-1 stroke-[2.5]" />
                <span>เช็คค่าน้ำค่าไฟห้องพัก</span>
              </button>

              <button
                id="btn-trigger-maintenance-check"
                onClick={() => {
                  setShowMaintenanceModal(true);
                  if (rooms.length > 0 && !ticketRoomId) {
                    setTicketRoomId(rooms[0].id);
                  }
                }}
                className="px-5 py-3.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 hover:border-amber-400/40 font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 w-full lg:w-auto shadow-lg hover:shadow-amber-500/5 cursor-pointer shrink-0"
              >
                <Wrench className="w-4.5 h-4.5 text-amber-400 stroke-[2.2]" />
                <span>แจ้งซ่อม / แจ้งปัญหา</span>
              </button>
            </div>

            {/* Right: Search & Room Type Filters */}
            <div className="flex flex-col md:flex-row md:items-center gap-4 w-full xl:w-auto justify-start md:justify-end shrink-0">
              {/* Search input with stable, non-squeezing width */}
              <div className="relative w-full md:w-80 shrink-0">
                <Search className="absolute left-4 top-3.5 h-4.5 w-4.5 text-brand-400" />
                <input
                  id="search-input"
                  type="text"
                  placeholder="ค้นหาห้องว่าง, สิ่งอำนวยความสะดวก..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-[#0a0a0c]/80 border border-white/10 text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                />
              </div>

              {/* Type selector with horizontal scrolling if needed on small viewports */}
              <div className="flex items-center gap-1.5 bg-[#0a0a0c]/80 p-1 rounded-xl border border-white/10 w-full md:w-auto overflow-x-auto shrink-0">
                {['All', 'Standard', 'Deluxe', 'Suite'].map((type) => (
                  <button
                    key={type}
                    id={`filter-type-${type.toLowerCase()}`}
                    onClick={() => setSelectedType(type)}
                    className={`px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap ${
                      selectedType === type
                        ? 'bg-brand-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.4)] border border-brand-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {type === 'All' ? 'ทั้งหมด' : type}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Pricing Info bar */}
          <div className="flex items-center gap-3 mt-4 text-xs text-slate-300 bg-brand-950/20 p-4 rounded-xl border border-brand-500/20 backdrop-blur-sm">
            <HelpCircle className="w-4 h-4 text-brand-400 shrink-0" />
            <span>
              {bookingMode === 'daily' 
                ? '⭐ ราคารายวันรวมเครื่องปรับอากาศ ไฟฟ้า และน้ำประปาแล้ว ไม่มีค่าใช้จ่ายเพิ่มเติม แต่อาจมีค่าประกันกุญแจ ณ วันเช็คอิน'
                : `⚡ เช่ารายเดือนคิดค่าน้ำตามจริงยูนิตละ ${settings.waterUnitRate} บาท, ค่าไฟยูนิตละ ${settings.electricityUnitRate} บาท, และค่าส่วนกลางคงที่ ${settings.commonFee} บาทต่อเดือน`}
            </span>
          </div>
        </div>

        {/* Room Grid */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-6">
            <span className="w-1.5 h-6 bg-brand-600 rounded-full shadow-[0_0_8px_rgba(37,99,235,0.6)]" />
            ประเภทห้องพักที่ว่างให้บริการ ({filteredRooms.length} รายการ)
          </h2>

          <AnimatePresence mode="popLayout">
            {filteredRooms.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#121216]/80 rounded-3xl p-12 text-center border border-white/10 max-w-lg mx-auto shadow-xl"
              >
                <div className="bg-white/5 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                  <Filter className="w-8 h-8 text-brand-400" />
                </div>
                <h3 className="text-lg font-medium text-white">ไม่พบห้องพักที่ตรงตามเงื่อนไข</h3>
                <p className="text-sm text-slate-400 mt-2">ลองค้นหาด้วยคำอื่น หรือเลือกหมวดหมู่ห้องพักใหม่อีกครั้ง</p>
                <button
                  onClick={() => { setSelectedType('All'); setSearchQuery(''); }}
                  className="mt-6 px-5 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 transition-all shadow-[0_0_12px_rgba(37,99,235,0.4)]"
                >
                  ล้างตัวกรองทั้งหมด
                </button>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredRooms.map((room) => {
                  const isAvailable = room.status === 'Available';
                  
                  return (
                    <motion.div
                      layout
                      key={room.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.4 }}
                      className="bg-[#121216]/75 backdrop-blur-md rounded-3xl overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_40px_rgba(37,99,235,0.25)] hover:border-brand-500/30 border border-white/5 transition-all duration-300 group flex flex-col h-full"
                    >
                      {/* Image container */}
                      <div className="relative h-64 overflow-hidden bg-slate-100 shrink-0">
                        <img 
                          src={room.image} 
                          alt={`Room ${room.number}`} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-4 left-4 flex gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md text-white shadow-sm ${
                            room.type === 'Suite' ? 'bg-amber-500/90' :
                            room.type === 'Deluxe' ? 'bg-brand-500/90' : 'bg-slate-700/90'
                          }`}>
                            {room.type}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md text-white shadow-sm ${
                            isAvailable ? 'bg-emerald-500/90' : 'bg-rose-500/90'
                          }`}>
                            {isAvailable ? 'พร้อมจอง' : 'มีผู้เข้าพักแล้ว'}
                          </span>
                        </div>
                        <div className="absolute bottom-4 left-4 bg-slate-950/70 text-white backdrop-blur-sm px-3 py-1 rounded-lg text-xs font-medium">
                          ชั้น {room.floor} • ห้อง {room.number}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-6 flex flex-col flex-1">
                        <div className="flex items-baseline justify-between mb-2">
                          <h3 className="text-xl font-bold text-white">
                            ห้องพัก {room.number} ({room.type})
                          </h3>
                        </div>

                        <p className="text-slate-400 text-sm line-clamp-2 leading-relaxed mb-4 min-h-[40px]">
                          {room.description}
                        </p>

                        {/* Amenities */}
                        <div className="flex flex-wrap gap-2.5 mb-6">
                          {room.amenities.slice(0, 4).map((amenity, idx) => (
                            <span 
                              key={idx} 
                              className="inline-flex items-center gap-1.5 bg-white/5 text-slate-300 text-xs px-2.5 py-1.5 rounded-lg border border-white/5"
                            >
                              {getAmenityIcon(amenity)}
                              {amenity}
                            </span>
                          ))}
                          {room.amenities.length > 4 && (
                            <span className="bg-white/5 text-slate-400 text-xs px-2.5 py-1.5 rounded-lg border border-white/5">
                              +{room.amenities.length - 4} เพิ่มเติม
                            </span>
                          )}
                        </div>

                        {/* Space Fill */}
                        <div className="mt-auto pt-4 border-t border-white/10 flex items-center justify-between">
                          <div>
                            <span className="text-xs text-slate-500 block">
                              {bookingMode === 'daily' ? 'รายวันเริ่มต้น' : 'สัญญาเช่ารายเดือน'}
                            </span>
                            <span className="text-2xl font-extrabold text-brand-400">
                              ฿{bookingMode === 'daily' 
                                ? room.dailyPrice.toLocaleString() 
                                : room.monthlyPrice.toLocaleString()
                              }
                            </span>
                            <span className="text-slate-400 text-xs">
                              {bookingMode === 'daily' ? ' / คืน' : ' / เดือน'}
                            </span>
                          </div>

                          <button
                            id={`btn-book-room-${room.number}`}
                            disabled={!isAvailable}
                            onClick={() => setSelectedRoom(room)}
                            className={`px-5 py-3 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center gap-1.5 ${
                              isAvailable
                                ? 'bg-brand-600 text-white hover:bg-brand-700 shadow-[0_0_12px_rgba(37,99,235,0.4)]'
                                : 'bg-white/5 text-slate-500 cursor-not-allowed border border-white/5'
                            }`}
                          >
                            จองห้องนี้
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Booking Form Modal */}
      <AnimatePresence>
        {selectedRoom && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#121216] text-white rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row border border-white/10"
            >
              {/* Left Column: Room Summary Preview */}
              <div className="md:w-5/12 bg-slate-900 text-white p-8 flex flex-col justify-between relative">
                <div className="absolute inset-0 z-0 opacity-20">
                  <img 
                    src={selectedRoom.image} 
                    alt="Room detail" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                
                <div className="relative z-10">
                  <div className="inline-block bg-brand-500 text-white text-xs px-3 py-1 rounded-full font-semibold mb-4">
                    สรุปย่อห้องพัก ({selectedRoom.type})
                  </div>
                  <h3 className="text-3xl font-bold tracking-tight text-white mb-2">
                    ห้อง {selectedRoom.number}
                  </h3>
                  <p className="text-slate-300 text-sm leading-relaxed mb-6 font-light">
                    {selectedRoom.description}
                  </p>

                  <div className="space-y-3.5">
                    <div className="flex justify-between items-center text-sm border-b border-white/10 pb-2">
                      <span className="text-slate-400">อัตราค่าบริการ</span>
                      <span className="font-semibold text-brand-300">
                        {bookingMode === 'daily' 
                          ? `฿${selectedRoom.dailyPrice.toLocaleString()} / วัน` 
                          : `฿${selectedRoom.monthlyPrice.toLocaleString()} / เดือน`
                        }
                      </span>
                    </div>
                    {bookingMode === 'monthly' && (
                      <>
                        <div className="flex justify-between items-center text-sm border-b border-white/10 pb-2">
                          <span className="text-slate-400">ค่ามัดจำสัญญาเช่า (คืนเงินเมื่อออก)</span>
                          <span className="font-semibold text-slate-200">
                            ฿{(selectedRoom.monthlyPrice * settings.securityDepositMultiplier).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm border-b border-white/10 pb-2">
                          <span className="text-slate-400">ค่าบำรุงส่วนกลาง</span>
                          <span className="font-semibold text-slate-200">
                            ฿{settings.commonFee.toLocaleString()} / เดือน
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="relative z-10 mt-8 pt-6 border-t border-white/10 text-xs text-slate-400 space-y-1">
                  <p>📍 {settings.propertyName || 'DormyHub'} Residences Co., Ltd.</p>
                  <p>📞 ฝ่ายต้อนรับ: 02-123-4567</p>
                </div>
              </div>

              {/* Right Column: Interactive Booking Form */}
              <div className="md:w-7/12 p-8 overflow-y-auto max-h-[80vh] md:max-h-full bg-[#18181f]/60">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-white">
                    {bookingMode === 'daily' ? '📝 กรอกรายละเอียดจองรายวัน' : '📝 รายละเอียดสัญญาเช่ารายเดือน'}
                  </h3>
                  <button 
                    id="btn-close-booking-modal"
                    onClick={() => setSelectedRoom(null)} 
                    className="p-1.5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleBookingSubmit} className="space-y-5">
                  {/* Personal details */}
                  <div className="space-y-4">
                    <label className="block text-xs font-semibold text-brand-400 uppercase tracking-wider">
                      ข้อมูลผู้จองเข้าพัก
                    </label>
                    <div>
                      <input
                        id="form-guest-name"
                        type="text"
                        required
                        placeholder="ชื่อ - นามสกุลจริง (ไทย / อังกฤษ)"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        className="w-full px-4 py-3 bg-[#0a0a0c] border border-white/10 rounded-xl text-sm text-white focus:ring-2 focus:ring-brand-500 focus:outline-none transition-all"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <input
                          id="form-guest-phone"
                          type="tel"
                          required
                          placeholder="เบอร์โทรศัพท์ติดต่อ"
                          value={guestPhone}
                          onChange={(e) => setGuestPhone(e.target.value)}
                          className="w-full px-4 py-3 bg-[#0a0a0c] border border-white/10 rounded-xl text-sm text-white focus:ring-2 focus:ring-brand-500 focus:outline-none transition-all"
                        />
                      </div>
                      <div>
                        <input
                          id="form-guest-email"
                          type="email"
                          required
                          placeholder="อีเมลแอดเดรส"
                          value={guestEmail}
                          onChange={(e) => setGuestEmail(e.target.value)}
                          className="w-full px-4 py-3 bg-[#0a0a0c] border border-white/10 rounded-xl text-sm text-white focus:ring-2 focus:ring-brand-500 focus:outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <input
                        id="form-guest-line"
                        type="text"
                        placeholder="LINE ID (สำหรับรับบิลค่าน้ำ-ค่าไฟ และแจ้งเตือน)"
                        value={guestLine}
                        onChange={(e) => setGuestLine(e.target.value)}
                        className="w-full px-4 py-3 bg-[#0a0a0c] border border-white/10 rounded-xl text-sm text-white focus:ring-2 focus:ring-brand-500 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Booking Dates / Duration */}
                  <div className="space-y-4 pt-2">
                    <label className="block text-xs font-semibold text-brand-400 uppercase tracking-wider">
                      วันและเวลาเข้าพัก
                    </label>
                    
                    {bookingMode === 'daily' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <span className="text-xs text-slate-400 block mb-1">วันที่เช็คอิน (Check-In)</span>
                          <div className="relative">
                            <Calendar className="absolute left-3.5 top-3.5 h-4 w-4 text-brand-400" />
                            <input
                              id="form-checkin-daily"
                              type="date"
                              required
                              value={checkInDate}
                              onChange={(e) => setCheckInDate(e.target.value)}
                              className="w-full pl-10 pr-4 py-3 bg-[#0a0a0c] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                            />
                          </div>
                        </div>
                        <div>
                          <span className="text-xs text-slate-400 block mb-1">วันที่เช็คเอาท์ (Check-Out)</span>
                          <div className="relative">
                            <Calendar className="absolute left-3.5 top-3.5 h-4 w-4 text-brand-400" />
                            <input
                              id="form-checkout-daily"
                              type="date"
                              required
                              value={checkOutDate}
                              onChange={(e) => setCheckOutDate(e.target.value)}
                              className="w-full pl-10 pr-4 py-3 bg-[#0a0a0c] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <span className="text-xs text-slate-400 block mb-1">วันเริ่มเริ่มเข้าอยู่ (Lease Start)</span>
                          <div className="relative">
                            <Calendar className="absolute left-3.5 top-3.5 h-4 w-4 text-brand-400" />
                            <input
                              id="form-checkin-monthly"
                              type="date"
                              required
                              value={checkInDate}
                              onChange={(e) => setCheckInDate(e.target.value)}
                              className="w-full pl-10 pr-4 py-3 bg-[#0a0a0c] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                            />
                          </div>
                        </div>
                        <div>
                          <span className="text-xs text-slate-400 block mb-1">จำนวนสัญญาเช่า (เดือน)</span>
                          <select
                            id="form-duration-monthly"
                            value={monthlyMonths}
                            onChange={(e) => setMonthlyMonths(Number(e.target.value))}
                            className="w-full px-4 py-3 bg-[#0a0a0c] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500 [&>option]:bg-[#121216] [&>option]:text-white"
                          >
                            {[1, 3, 6, 12, 24].map(m => (
                              <option key={m} value={m}>{m} เดือน</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Payment Method Selection */}
                  <div className="space-y-4 pt-2">
                    <label className="block text-xs font-semibold text-brand-400 uppercase tracking-wider">
                      💳 ช่องทางการชำระเงิน
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        id="payment-method-cash"
                        onClick={() => {
                          setPaymentMethod('Cash');
                          setFormError('');
                        }}
                        className={`py-3 px-4 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          paymentMethod === 'Cash'
                            ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.15)]'
                            : 'bg-[#0a0a0c] border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-300'
                        }`}
                      >
                        💵 ชำระด้วยเงินสด
                      </button>
                      <button
                        type="button"
                        id="payment-method-promptpay"
                        onClick={() => {
                          setPaymentMethod('PromptPay');
                          setFormError('');
                        }}
                        className={`py-3 px-4 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          paymentMethod === 'PromptPay'
                            ? 'bg-sky-500/10 border-sky-500/40 text-sky-300 shadow-[0_0_10px_rgba(14,165,233,0.15)]'
                            : 'bg-[#0a0a0c] border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-300'
                        }`}
                      >
                        📱 โอนด้วยพร้อมเพย์
                      </button>
                    </div>

                    {paymentMethod === 'PromptPay' && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-[#0e1622] border border-sky-500/20 rounded-2xl p-4 space-y-4 overflow-hidden"
                      >
                        <div className="flex justify-between items-center bg-slate-900/60 p-3 rounded-xl border border-white/5">
                          <div>
                            <span className="text-[10px] text-sky-400 font-semibold block uppercase">พร้อมเพย์รับชำระเงิน</span>
                            <span className="text-base font-extrabold text-white tracking-wider">
                              {settings.promptPayNumber || '089-123-4567'}
                            </span>
                          </div>
                          <span className="text-[10px] bg-sky-500/20 text-sky-300 px-2.5 py-1 rounded-lg font-bold">
                            {settings.propertyName || 'DORMYHUB'}
                          </span>
                        </div>

                        {/* PromptPay Dynamic QR Code */}
                        <div className="flex flex-col items-center justify-center bg-white p-4 rounded-2xl border border-sky-500/20 shadow-xl max-w-[200px] mx-auto space-y-2">
                          <div className="w-full flex justify-between items-center px-1 border-b border-slate-100 pb-1.5">
                            <span className="text-[10px] font-extrabold text-blue-900 tracking-wider">Prompt Pay</span>
                            <span className="text-[8px] bg-blue-100 text-blue-800 px-1 py-0.5 rounded font-bold">โอนเงินทันใจ</span>
                          </div>
                          
                          <div className="relative p-1 bg-white border border-slate-100 rounded-lg">
                            <img
                              src={`https://promptpay.io/${(settings.promptPayNumber || '0891234567').replace(/[^0-9]/g, '')}/${calculation.grandTotal}.png`}
                              alt="PromptPay QR Code"
                              className="w-36 h-36 object-contain"
                              referrerPolicy="no-referrer"
                            />
                          </div>

                          <div className="text-center">
                            <span className="text-[8px] text-slate-400 block font-semibold uppercase tracking-wider">สแกนเพื่อโอนเงินเข้าระบบ</span>
                            <span className="text-xs font-extrabold text-blue-900 block">
                              ฿{calculation.grandTotal.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs font-semibold text-slate-300">
                            แนบหลักฐานสลิปโอนเงิน (แนบสลิป)
                          </label>
                          <div className="flex items-center gap-3">
                            <label className="flex-1 flex flex-col items-center justify-center border border-dashed border-sky-500/30 hover:border-sky-500/60 rounded-xl py-4 px-3 bg-[#0a0a0c]/60 cursor-pointer transition-colors text-center">
                              <span className="text-xs text-sky-400 font-semibold">📁 เลือกรูปภาพสลิป</span>
                              <span className="text-[10px] text-slate-500 mt-1">ไฟล์รูปภาพสลิปจริง</span>
                              <input
                                id="slip-file-upload"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      setSlipImage(reader.result as string);
                                      setFormError('');
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                            </label>
                            
                            <button
                              type="button"
                              id="btn-mock-slip"
                              onClick={() => {
                                setSlipImage('https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&w=800&q=80');
                                setFormError('');
                              }}
                              className="px-3 py-4 bg-slate-900 hover:bg-slate-800 border border-white/10 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer text-center"
                            >
                              💡 ใช้สลิปจำลอง
                            </button>
                          </div>

                          {slipImage && (
                            <div className="relative mt-3 p-2 bg-[#0a0a0c]/85 rounded-xl border border-sky-500/20 flex items-center gap-3">
                              <img
                                src={slipImage}
                                alt="Payment Slip"
                                className="w-10 h-10 object-cover rounded-lg border border-white/10"
                              />
                              <div className="flex-1 min-w-0">
                                <span className="text-xs text-emerald-400 font-bold block">✓ แนบสลิปเรียบร้อย</span>
                                <span className="text-[10px] text-slate-500 truncate block">
                                  {slipImage.startsWith('data:') ? 'อัปโหลดสลิปจากเครื่องแล้ว' : 'ใช้สลิปสำหรับทดลองระบบ'}
                                </span>
                              </div>
                              <button
                                type="button"
                                id="btn-remove-slip"
                                onClick={() => setSlipImage('')}
                                className="p-1 hover:bg-white/10 text-rose-400 rounded-full cursor-pointer transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {formError && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/25 rounded-xl text-xs text-rose-400 font-medium">
                      ⚠️ {formError}
                    </div>
                  )}

                  {/* Live Cost Invoice Summary */}
                  <div className="bg-[#0a0a0c]/85 rounded-2xl p-5 border border-white/5 space-y-3 mt-4">
                    <span className="text-xs font-semibold text-brand-400 block">สรุปยอดชำระเบื้องต้น</span>
                    
                    {bookingMode === 'daily' ? (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-300">ค่าพักรายวัน ({calculation.daysCount} คืน)</span>
                        <span className="font-bold text-white">฿{calculation.subtotal.toLocaleString()}</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-center text-sm text-slate-300">
                          <span>ค่าเช่าห้องพักรายเดือน ({monthlyMonths} เดือน)</span>
                          <span className="font-bold text-white">฿{calculation.subtotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm text-slate-400">
                          <span>ค่ามัดจำล่วงหน้า (คืนเงินวันเช็คเอาท์)</span>
                          <span className="font-bold text-slate-200">฿{calculation.deposit.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm text-slate-400">
                          <span>ค่าบริการส่วนกลาง ({monthlyMonths} เดือน)</span>
                          <span className="font-bold text-slate-200">฿{calculation.common.toLocaleString()}</span>
                        </div>
                      </>
                    )}
                    
                    <div className="h-px bg-white/10 my-2" />
                    <div className="flex justify-between items-center text-base font-bold">
                      <span className="text-slate-300">ยอดที่ต้องชำระในวันย้ายเข้า</span>
                      <span className="text-xl text-brand-400 font-extrabold">฿{calculation.grandTotal.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      id="btn-modal-cancel"
                      type="button"
                      onClick={() => setSelectedRoom(null)}
                      className="flex-1 py-3 border border-white/10 rounded-xl text-sm font-semibold text-slate-400 hover:bg-white/5 transition-all"
                    >
                      ยกเลิก
                    </button>
                    <button
                      id="btn-modal-submit"
                      type="submit"
                      className="flex-1 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all"
                    >
                      ยืนยันจองห้องพัก
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Booking Success Modal */}
      <AnimatePresence>
        {bookingSuccess && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#121216] rounded-3xl p-8 max-w-md w-full shadow-[0_0_50px_rgba(37,99,235,0.2)] text-center border border-white/10 text-white"
            >
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              
              <h3 className="text-2xl font-bold text-white mb-2">จองห้องพักเสร็จสมบูรณ์!</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                ระบบได้บันทึกประวัติการจองและส่งสัญญาย้ายเข้าให้แอดมินพิจารณาแล้ว ท่านสามารถตรวจสอบสถานะได้ที่เคาน์เตอร์บริการ
              </p>

              {/* Receipt mockup */}
              <div className="bg-[#0a0a0c]/80 rounded-2xl p-5 border border-white/5 text-left space-y-3 mb-6 text-xs md:text-sm">
                <div className="flex justify-between text-slate-400">
                  <span>รหัสการจอง:</span>
                  <span className="font-mono text-brand-400 font-bold">{bookingSuccess.id}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>ห้องพัก:</span>
                  <span className="text-slate-200 font-medium">ห้อง {bookingSuccess.roomNumber}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>ผู้จอง:</span>
                  <span className="text-slate-200 font-medium">{bookingSuccess.guestName}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>รูปแบบ:</span>
                  <span className="text-slate-200 font-medium">
                    {bookingSuccess.bookingType === 'daily' ? 'รายวัน' : 'รายเดือน'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>เช็คอิน:</span>
                  <span className="text-slate-200 font-medium">{bookingSuccess.checkInDate}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>เช็คเอาท์:</span>
                  <span className="text-slate-200 font-medium">{bookingSuccess.checkOutDate}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>วิธีชำระเงิน:</span>
                  <span className="text-slate-200 font-medium">
                    {bookingSuccess.paymentMethod === 'PromptPay' ? '📱 พร้อมเพย์ (โอนสำเร็จ)' : '💵 เงินสด (หน้าเคาน์เตอร์)'}
                  </span>
                </div>
                {bookingSuccess.slipImage && (
                  <div className="flex justify-between text-slate-400">
                    <span>หลักฐานสลิป:</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      ✓ แนบรูปภาพแล้ว
                    </span>
                  </div>
                )}
                <div className="h-px bg-white/10 my-2" />
                <div className="flex justify-between font-bold text-base text-white">
                  <span>ยอดสุทธิ:</span>
                  <span className="text-brand-400">฿{bookingSuccess.totalPrice.toLocaleString()}</span>
                </div>
              </div>

              <button
                id="btn-close-success-modal"
                onClick={() => setBookingSuccess(null)}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-[0_0_12px_rgba(37,99,235,0.4)]"
              >
                เสร็จสิ้น
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Utility Check Modal */}
      <AnimatePresence>
        {showUtilityCheckModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#121216] rounded-3xl p-6 md:p-8 max-w-2xl w-full border border-white/10 text-white shadow-2xl relative max-h-[90vh] overflow-y-auto flex flex-col"
            >
              {/* Close Button */}
              <button
                id="btn-close-utility-modal"
                onClick={() => setShowUtilityCheckModal(false)}
                className="absolute top-6 right-6 bg-slate-900 border border-slate-800 p-2 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">🔍 ตรวจสอบค่าน้ำค่าไฟของห้องพัก</h3>
                  <p className="text-slate-400 text-xs mt-1 font-light">สามารถดูเลขมิเตอร์ล่าสุด และประวัติบิลย้อนหลังทั้งหมดของห้องพัก</p>
                </div>
              </div>

              {/* Room Selector */}
              <div className="bg-[#0a0a0c] p-4 rounded-2xl border border-white/5 mb-6">
                <label className="text-xs font-semibold text-slate-400 block mb-2">เลือกหมายเลขห้องพักของคุณ</label>
                <select
                  id="guest-utility-select-room"
                  value={utilityRoomId}
                  onChange={(e) => setUtilityRoomId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 text-white font-medium"
                >
                  <option value="" disabled>-- กรุณาเลือกห้องพัก --</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      ห้อง {r.number} - {r.type} {r.status === 'Occupied' ? '(มีผู้เช่า)' : '(ว่าง)'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Room Utility Details */}
              {utilityRoomId && (() => {
                const room = rooms.find(r => r.id === utilityRoomId);
                const roomInvoices = invoices.filter(inv => inv.roomId === utilityRoomId);
                if (!room) return null;

                return (
                  <div className="space-y-6 flex-1 overflow-y-auto pr-1">
                    {/* Live/Current Meter State Cards */}
                    <div>
                      <h4 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-3.5 bg-indigo-500 rounded-full" />
                        📊 ข้อมูลมิเตอร์ปัจจุบันของห้อง {room.number}
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
                          <div>
                            <span className="text-slate-400 text-xxs block">🔌 มิเตอร์ไฟฟ้าล่าสุด</span>
                            <span className="text-xl font-extrabold text-white mt-1 block">
                              {room.electricityMeter.toLocaleString()} <span className="text-xs font-normal text-slate-400">kWh</span>
                            </span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <Zap className="w-5 h-5 fill-amber-500/10" />
                          </div>
                        </div>

                        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
                          <div>
                            <span className="text-slate-400 text-xxs block">💧 มิเตอร์น้ำล่าสุด</span>
                            <span className="text-xl font-extrabold text-white mt-1 block">
                              {room.waterMeter.toLocaleString()} <span className="text-xs font-normal text-slate-400">m³</span>
                            </span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            <Droplet className="w-5 h-5 fill-blue-500/10" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Past and New Invoices list */}
                    <div>
                      <h4 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-3.5 bg-indigo-500 rounded-full" />
                        📝 ประวัติใบแจ้งหนี้ทั้งหมด ({roomInvoices.length} รายการ)
                      </h4>

                      {roomInvoices.length === 0 ? (
                        <div className="text-center py-10 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed text-slate-500 text-xs">
                          <HelpCircle className="w-8 h-8 mx-auto text-slate-600 mb-2 stroke-[1.5]" />
                          ยังไม่มีข้อมูลประวัติการออกบิลค่าน้ำค่าไฟของห้องนี้ในระบบ
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {roomInvoices.map((inv) => (
                            <div key={inv.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all">
                              <div className="flex justify-between items-start pb-3 border-b border-white/5 mb-3">
                                <div>
                                  <span className="font-bold text-white text-sm">รอบบิล {inv.billingMonth}</span>
                                  <span className="text-xxs text-slate-500 block mt-0.5">ออกเมื่อ: {inv.issueDate}</span>
                                </div>
                                <span className={`text-xxs px-2.5 py-1 rounded-full font-bold border ${
                                  inv.status === 'Paid'
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                }`}>
                                  {inv.status === 'Paid' ? 'ชำระเงินแล้ว' : 'ค้างชำระ'}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-4 text-xs text-slate-400">
                                {/* Electricity Breakdown */}
                                <div className="space-y-1 bg-slate-950/40 p-3 rounded-xl border border-white/5">
                                  <div className="flex items-center gap-1.5 text-amber-400 font-semibold mb-1">
                                    <Zap className="w-3.5 h-3.5 animate-pulse" />
                                    <span>ค่าน้ำไฟฟ้า</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>เลขจดครั้งก่อน:</span>
                                    <span className="text-slate-200">{inv.prevElectricity} kWh</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>เลขจดปัจจุบัน:</span>
                                    <span className="text-slate-200">{inv.currElectricity} kWh</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>จำนวนที่ใช้:</span>
                                    <span className="text-slate-200">{inv.currElectricity - inv.prevElectricity} หน่วย</span>
                                  </div>
                                  <div className="h-px bg-white/5 my-1" />
                                  <div className="flex justify-between font-bold text-slate-300">
                                    <span>ค่าไฟสุทธิ:</span>
                                    <span className="text-white">฿{inv.electricityCost.toLocaleString()}</span>
                                  </div>
                                </div>

                                {/* Water Breakdown */}
                                <div className="space-y-1 bg-slate-950/40 p-3 rounded-xl border border-white/5">
                                  <div className="flex items-center gap-1.5 text-blue-400 font-semibold mb-1">
                                    <Droplet className="w-3.5 h-3.5 animate-pulse" />
                                    <span>ค่าน้ำประปา</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>เลขจดครั้งก่อน:</span>
                                    <span className="text-slate-200">{inv.prevWater} m³</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>เลขจดปัจจุบัน:</span>
                                    <span className="text-slate-200">{inv.currWater} m³</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>จำนวนที่ใช้:</span>
                                    <span className="text-slate-200">{inv.currWater - inv.prevWater} หน่วย</span>
                                  </div>
                                  <div className="h-px bg-white/5 my-1" />
                                  <div className="flex justify-between font-bold text-slate-300">
                                    <span>ค่าน้ำสุทธิ:</span>
                                    <span className="text-white">฿{inv.waterCost.toLocaleString()}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="mt-3.5 flex justify-between items-center pt-3 border-t border-white/5">
                                <div className="flex gap-2">
                                  <span className="text-xxs text-slate-400 self-center">ค่าบำรุงส่วนกลาง: ฿{inv.commonFee}</span>
                                  <button
                                    onClick={() => setActivePrintInvoice(inv)}
                                    className="flex items-center gap-1 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded-md border border-slate-700 transition-colors cursor-pointer"
                                  >
                                    <Printer className="w-3 h-3 text-indigo-400" />
                                    <span>ดู/พิมพ์ใบเสร็จทางการ</span>
                                  </button>
                                </div>
                                <div className="text-right">
                                  <span className="text-xxs text-slate-400 block leading-none">ยอดรวมทั้งสิ้น</span>
                                  <span className="text-lg font-extrabold text-brand-400">฿{inv.totalCost.toLocaleString()}</span>
                                </div>
                              </div>

                              {inv.status !== 'Paid' && (
                                <div className="mt-4 pt-4 border-t border-dashed border-white/5 grid grid-cols-1 md:grid-cols-2 gap-4 items-center animate-fade-in bg-slate-950/20 p-4 rounded-xl border border-white/5">
                                  <div className="flex flex-col items-center justify-center bg-white p-3.5 rounded-2xl border border-sky-500/10 max-w-[150px] mx-auto space-y-1.5 shadow-xl select-none">
                                    <div className="w-full flex justify-between items-center px-0.5 border-b border-slate-100 pb-1">
                                      <span className="text-[8px] font-extrabold text-blue-900 tracking-wider">Prompt Pay</span>
                                      <span className="text-[7px] bg-blue-100 text-blue-800 px-1 py-0.5 rounded font-bold">โอนเงินทันใจ</span>
                                    </div>
                                    <img
                                      src={`https://promptpay.io/${(settings.promptPayNumber || '0891234567').replace(/[^0-9]/g, '')}/${inv.totalCost}.png`}
                                      alt="PromptPay Utility QR Code"
                                      className="w-28 h-28 object-contain"
                                      referrerPolicy="no-referrer"
                                    />
                                    <span className="text-[10px] text-blue-900 font-extrabold text-center block">
                                      ฿{inv.totalCost.toLocaleString()}
                                    </span>
                                  </div>

                                  <div className="space-y-3">
                                    <div className="space-y-1 text-left">
                                      <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                                        <Sparkles className="w-3.5 h-3.5 text-brand-400 animate-pulse" />
                                        <span>AI Slip Reader Verification</span>
                                      </h5>
                                      <p className="text-[11px] text-slate-400 leading-relaxed">
                                        สแกนคิวอาร์โค้ดชำระเงิน แล้วจำลองอัปโหลดสลิปเพื่อสแกนและเปลี่ยนสถานะบิลเป็น <strong>ชำระแล้ว (Paid)</strong> อัตโนมัติด้วยระบบ AI ทันที
                                      </p>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                      <label className="border border-dashed border-white/10 hover:border-brand-500/40 rounded-xl p-2.5 flex flex-col items-center justify-center cursor-pointer hover:bg-white/[0.02] transition-all group">
                                        <div className="flex items-center gap-2">
                                          <Camera className="w-4 h-4 text-slate-400 group-hover:text-brand-400 transition-colors" />
                                          <span className="text-xxs text-slate-400 group-hover:text-slate-200 transition-colors">
                                            เลือกภาพสลิป (.JPG / .PNG)
                                          </span>
                                        </div>
                                        <input
                                          type="file"
                                          accept="image/*"
                                          className="hidden"
                                          onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                              handleStartSlipScan(inv);
                                            }
                                          }}
                                        />
                                      </label>

                                      <button
                                        onClick={() => handleStartSlipScan(inv)}
                                        className="w-full py-2 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-xxs rounded-xl transition-all shadow-[0_4px_12px_rgba(37,99,235,0.25)] flex items-center justify-center gap-1 cursor-pointer"
                                      >
                                        <Sparkles className="w-3.5 h-3.5 text-brand-200" />
                                        <span>จำลองแสกนสลิปโอนเงินออโต้</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              <button
                id="btn-close-utility-modal-bottom"
                onClick={() => setShowUtilityCheckModal(false)}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)] mt-6 cursor-pointer"
              >
                ปิดหน้าต่างนี้
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Maintenance & Complaint Support Tickets Modal */}
      <AnimatePresence>
        {showMaintenanceModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#121216] rounded-3xl p-6 md:p-8 max-w-2xl w-full border border-white/10 text-white shadow-2xl relative max-h-[90vh] overflow-y-auto flex flex-col"
            >
              {/* Close Button */}
              <button
                id="btn-close-maintenance-modal"
                onClick={() => {
                  setShowMaintenanceModal(false);
                  setTicketSuccess(false);
                  setTicketError('');
                }}
                className="absolute top-6 right-6 bg-slate-900 border border-slate-800 p-2 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Wrench className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">🔧 ระบบแจ้งซ่อม & รายงานปัญหา</h3>
                  <p className="text-slate-400 text-xs mt-1 font-light">แจ้งเรื่องร้องเรียนหรือปัญหาอุปกรณ์ชำรุดภายในห้องพักไปยังส่วนกลาง</p>
                </div>
              </div>

              {ticketSuccess ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 text-center space-y-4 my-4"
                >
                  <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-lg">
                    <Check className="w-8 h-8 stroke-[3]" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white">ส่งรายงานแจ้งซ่อมสำเร็จเรียบร้อย!</h4>
                    <p className="text-xs text-slate-300 mt-2 max-w-md mx-auto leading-relaxed">
                      ระบบได้บันทึกใบคำขอแจ้งซ่อมของท่านเรียบร้อยแล้ว และได้ส่งการแจ้งเตือนด่วนไปยังห้องควบคุมระบบผู้ดูแลอาคาร (Admin) ผ่านทาง LINE API สำเร็จแล้วค่ะ
                    </p>
                  </div>
                  <button
                    onClick={() => setTicketSuccess(false)}
                    className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    แจ้งเรื่องอื่นเพิ่มเติม
                  </button>
                </motion.div>
              ) : (
                <form onSubmit={handleCreateTicket} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1.5">หมายเลขห้องพักของคุณ</label>
                      <select
                        value={ticketRoomId}
                        onChange={(e) => setTicketRoomId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-amber-500 text-white font-medium"
                      >
                        <option value="" disabled>-- กรุณาเลือกห้องพัก --</option>
                        {rooms.map((r) => (
                          <option key={r.id} value={r.id}>ห้อง {r.number} - {r.type}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1.5">หมวดหมู่ปัญหาชำรุด</label>
                      <select
                        value={ticketCategory}
                        onChange={(e) => setTicketCategory(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-amber-500 text-white font-medium"
                      >
                        <option value="aircon">เครื่องปรับอากาศ (Aircon)</option>
                        <option value="plumbing">ระบบประปา/สุขภัณฑ์ (Plumbing)</option>
                        <option value="electricity">ระบบไฟฟ้า (Electricity)</option>
                        <option value="furniture">เฟอร์นิเจอร์/อุปกรณ์ห้องพัก (Furniture)</option>
                        <option value="other">อื่นๆ (Other)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1.5">ชื่อผู้แจ้งเรื่อง</label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                        <input
                          type="text"
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          placeholder="ชื่อ-นามสกุล ของท่าน"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-amber-500 text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1.5">เบอร์โทรศัพท์ติดต่อกลับ</label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                        <input
                          type="tel"
                          value={guestPhone}
                          onChange={(e) => setGuestPhone(e.target.value)}
                          placeholder="เบอร์โทรศัพท์ 10 หลัก"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-amber-500 text-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1.5">ระดับความเร่งด่วน</label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: 'low', label: '🟢 ต่ำ', desc: 'ซ่อมแซมทั่วไป' },
                        { id: 'medium', label: '🟡 ปานกลาง', desc: 'รบกวนการใช้งาน' },
                        { id: 'high', label: '🔴 ด่วนมาก', desc: 'ใช้งานไม่ได้/ฉุกเฉิน' },
                      ].map((urg) => (
                        <button
                          key={urg.id}
                          type="button"
                          onClick={() => setTicketUrgency(urg.id as any)}
                          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                            ticketUrgency === urg.id
                              ? 'bg-amber-500/10 border-amber-500 text-amber-300 font-bold'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                          }`}
                        >
                          <span className="text-xs block">{urg.label}</span>
                          <span className="text-[9px] font-light text-slate-500 block mt-0.5">{urg.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1.5">อธิบายรายละเอียดปัญหา</label>
                    <textarea
                      value={ticketDescription}
                      onChange={(e) => setTicketDescription(e.target.value)}
                      placeholder="กรุณาระบุรายละเอียด เช่น ก๊อกซึม อุปกรณ์แตกหัก หรือรายละเอียดการชำรุดต่างๆ เพื่อการนำอุปกรณ์ซ่อมแซมที่ถูกต้องค่ะ"
                      rows={4}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-amber-500 text-white placeholder-slate-500 resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1.5">ลิงก์รูปถ่ายชำรุด (ไม่บังคับ)</label>
                    <div className="relative">
                      <Camera className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                      <input
                        type="url"
                        value={ticketPhoto}
                        onChange={(e) => setTicketPhoto(e.target.value)}
                        placeholder="https://example.com/photo.jpg"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-amber-500 text-white placeholder-slate-600"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">แนะนำอัปโหลดฝากไฟล์รูปภาพ หรือใส่ URL ตัวอย่างเพื่อประมวลผลความชำรุด</span>
                  </div>

                  {ticketError && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{ticketError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={ticketSubmitting}
                    className="w-full py-3.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-extrabold text-sm rounded-xl transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] cursor-pointer flex items-center justify-center gap-2"
                  >
                    {ticketSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                        <span>กำลังบันทึกและแจ้งบอท LINE...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>ยืนยันรายงานแจ้งซ่อม</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Your Recent Tickets */}
              <div className="mt-8 pt-6 border-t border-white/5">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span>ประวัติการแจ้งซ่อมย้อนหลังในระบบ</span>
                </h4>

                {tickets.length === 0 ? (
                  <div className="text-center py-6 bg-slate-950/40 rounded-2xl border border-white/5 border-dashed text-slate-500 text-xs font-light">
                    ยังไม่มีข้อมูลการส่งประวัติแจ้งปัญหาใดๆ ในระบบ
                  </div>
                ) : (
                  <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                    {tickets.slice().reverse().map((tc) => (
                      <div key={tc.id} className="bg-slate-950/50 p-3 rounded-xl border border-white/5 flex items-center justify-between hover:border-white/10 transition-colors">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs">ห้อง {tc.roomNumber}</span>
                            <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">{tc.id}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 max-w-sm truncate">{tc.description}</p>
                          <span className="text-[9px] text-slate-500 block">แจ้งเมื่อ: {new Date(tc.createdAt).toLocaleDateString('th-TH')}</span>
                        </div>

                        <div className="text-right flex flex-col items-end gap-1.5">
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${
                            tc.status === 'Resolved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            tc.status === 'In Progress' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                            'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                            {tc.status === 'Resolved' ? 'เสร็จสิ้น' :
                             tc.status === 'In Progress' ? 'กำลังดำเนินการ' :
                             'รอดำเนินการ'}
                          </span>
                          {tc.adminNotes && (
                            <span className="text-[8px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-white/5 font-light block max-w-[120px] truncate" title={tc.adminNotes}>
                              💬 {tc.adminNotes}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Slip Scanner Simulated Loader overlay */}
      <AnimatePresence>
        {scanningSlip && activeSlipInvoice && (
          <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0f0f13] border border-brand-500/30 rounded-3xl p-8 max-w-lg w-full text-center space-y-6 shadow-[0_0_50px_rgba(37,99,235,0.2)] relative overflow-hidden"
            >
              {/* Laser sweeping light animation */}
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_rgba(34,211,238,0.8)] animate-[bounce_2s_infinite] top-0 left-0" />

              <div className="relative w-40 h-40 bg-slate-900/60 border border-brand-500/20 rounded-2xl mx-auto flex items-center justify-center overflow-hidden">
                <Camera className="w-12 h-12 text-brand-400 animate-pulse stroke-[1.5]" />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-500/10 to-transparent" />
                {/* Horizontal Scan Bar */}
                <div className="absolute inset-x-0 h-0.5 bg-brand-500/80 animate-[bounce_1.5s_infinite] shadow-[0_0_10px_#2563eb]" />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white tracking-wide">🤖 กำลังตรวจสอบสลิปด้วย AI Slip Reader</h3>
                <p className="text-xs text-slate-400">ระบบออโต้กำลังตรวจสอบยอดโอน วันที่ บัญชีผู้รับ และลายน้ำความปลอดภัย</p>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                  <motion.div
                    className="h-full bg-gradient-to-r from-brand-500 to-cyan-400 rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ width: `${scanProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>PROCESSING SLIP METADATA</span>
                  <span className="text-brand-400 font-bold">{scanProgress}%</span>
                </div>
              </div>

              {/* Logs area */}
              <div className="bg-black/60 p-4 rounded-xl border border-white/5 font-mono text-left text-[10px] space-y-1.5 h-36 overflow-y-auto select-none scrollbar-thin">
                {scanLogs.map((log, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={log.startsWith('✅') ? 'text-emerald-400 font-bold' : 'text-slate-300'}
                  >
                    {log}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Official Electronic Invoice / Receipt Printable Modal */}
      <AnimatePresence>
        {activePrintInvoice && (
          <div className="fixed inset-0 z-[80] overflow-y-auto flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white text-slate-800 rounded-2xl max-w-xl w-full relative shadow-2xl overflow-hidden"
            >
              {/* Controls bar (non-printable) */}
              <div className="bg-slate-100 border-b border-slate-200 px-6 py-4 flex justify-between items-center select-none">
                <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span>พรีวิวใบเสนอราคา / ใบเสร็จรับเงินทางการ</span>
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      window.print();
                    }}
                    className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-xxs px-3 py-1.5 rounded-md flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>สั่งพิมพ์</span>
                  </button>
                  <button
                    onClick={() => setActivePrintInvoice(null)}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xxs px-3 py-1.5 rounded-md transition-all cursor-pointer"
                  >
                    ปิด
                  </button>
                </div>
              </div>

              {/* Document Paper Container */}
              <div className="p-8 md:p-10 space-y-6 relative" id="printable-receipt-area">
                {/* Visual watermark/stamp for Paid/Unpaid status */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none opacity-[0.08]">
                  <span className="text-8xl font-black uppercase tracking-widest block text-slate-900 border-8 border-slate-900 p-4 rotate-12 rounded-3xl">
                    {activePrintInvoice.status === 'Paid' ? 'PAID' : 'UNPAID'}
                  </span>
                </div>

                {/* Header Information */}
                <div className="flex justify-between gap-6 pb-6 border-b border-slate-200">
                  <div className="space-y-1 text-left">
                    <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                      {settings.propertyName || 'DORMYHUB RESIDENCE'}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-light max-w-xs leading-relaxed">
                      เลขที่ตั้งโครงการ 123 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110 <br />
                      โทร: {settings.promptPayNumber || '089-123-4567'}
                    </p>
                  </div>
                  <div className="text-right space-y-1 shrink-0">
                    <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">
                      {activePrintInvoice.status === 'Paid' ? 'Receipt (ใบเสร็จรับเงิน)' : 'Invoice (ใบแจ้งหนี้)'}
                    </span>
                    <span className="text-sm font-extrabold text-slate-800 block font-mono">
                      #{activePrintInvoice.id}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      ประจำรอบบิล: {activePrintInvoice.billingMonth}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      วันที่ออกเอกสาร: {activePrintInvoice.issueDate}
                    </span>
                  </div>
                </div>

                {/* Billing Address / Details */}
                <div className="grid grid-cols-2 gap-4 pb-4">
                  <div className="space-y-1 text-left">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">ผู้เช่าพักอาศัย</span>
                    <span className="text-xs font-bold text-slate-800 block">ห้องพักหมายเลข {activePrintInvoice.roomNumber}</span>
                    <span className="text-[10px] text-slate-500 block font-light">โครงการอาคารชุด {settings.propertyName || 'DormyHub'}</span>
                  </div>
                  <div className="space-y-1 text-right">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">สถานะการชำระ</span>
                    <span className={`inline-block text-[9px] px-2 py-0.5 rounded font-bold ${
                      activePrintInvoice.status === 'Paid' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'
                    }`}>
                      {activePrintInvoice.status === 'Paid' ? 'ชำระเงินเรียบร้อยแล้ว' : 'ค้างชำระ'}
                    </span>
                    {activePrintInvoice.paidDate && (
                      <span className="text-[9px] text-slate-500 block font-mono">วันที่ชำระ: {activePrintInvoice.paidDate}</span>
                    )}
                  </div>
                </div>

                {/* Itemized Table */}
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] text-slate-400 font-bold uppercase text-left">
                      <th className="py-2">ลำดับ</th>
                      <th className="py-2">รายการบิลค่ายอดชำระ (Description)</th>
                      <th className="py-2 text-right">จำนวนหน่วย (Qty)</th>
                      <th className="py-2 text-right">ราคาต่อหน่วย</th>
                      <th className="py-2 text-right">รวมเงิน (Subtotal)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[10px] text-slate-600 font-light">
                    <tr>
                      <td className="py-3">1</td>
                      <td className="py-3 font-semibold text-slate-800 text-left">ค่าสาธารณูปโภคกระแสไฟฟ้า (Electricity)</td>
                      <td className="py-3 text-right font-mono">{activePrintInvoice.currElectricity - activePrintInvoice.prevElectricity}</td>
                      <td className="py-3 text-right font-mono">฿{activePrintInvoice.electricityUnitRate || 8}</td>
                      <td className="py-3 text-right font-mono font-semibold text-slate-800">฿{activePrintInvoice.electricityCost.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="py-3">2</td>
                      <td className="py-3 font-semibold text-slate-800 text-left">ค่าบริการน้ำประปาโครงการ (Water)</td>
                      <td className="py-3 text-right font-mono">{activePrintInvoice.currWater - activePrintInvoice.prevWater}</td>
                      <td className="py-3 text-right font-mono">฿{activePrintInvoice.waterUnitRate || 18}</td>
                      <td className="py-3 text-right font-mono font-semibold text-slate-800">฿{activePrintInvoice.waterCost.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="py-3">3</td>
                      <td className="py-3 font-semibold text-slate-800 text-left">ค่าบำรุงรักษาส่วนกลางของอาคาร (Common Area Fee)</td>
                      <td className="py-3 text-right font-mono">1</td>
                      <td className="py-3 text-right font-mono">฿{activePrintInvoice.commonFee}</td>
                      <td className="py-3 text-right font-mono font-semibold text-slate-800">฿{activePrintInvoice.commonFee.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Subtotals & Grand Total Section */}
                <div className="pt-4 border-t border-slate-200 flex justify-end">
                  <div className="w-56 space-y-2 text-xs text-slate-700">
                    <div className="flex justify-between font-light">
                      <span>ยอดสุทธิไม่มีภาษี:</span>
                      <span className="font-mono">฿{activePrintInvoice.totalCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-light">
                      <span>ภาษีมูลค่าเพิ่ม (VAT 0%):</span>
                      <span className="font-mono">฿0.00</span>
                    </div>
                    <div className="flex justify-between font-extrabold text-slate-950 border-t border-slate-200 pt-2 text-sm">
                      <span>ยอดสุทธิรวมทั้งสิ้น:</span>
                      <span className="font-mono text-brand-600">฿{activePrintInvoice.totalCost.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Signatures Footer */}
                <div className="pt-10 grid grid-cols-2 gap-10 text-center text-[10px] text-slate-500 font-light select-none relative">
                  <div className="space-y-6">
                    <div className="h-10 border-b border-slate-300 w-36 mx-auto" />
                    <span>ผู้รับเงิน (Recipient Sign)</span>
                  </div>

                  <div className="space-y-6 relative">
                    {/* Simulated Authorized Stamp badge */}
                    <div className="absolute top-[-10px] right-10 w-16 h-16 border-4 border-rose-600/30 text-rose-600/40 rounded-full flex items-center justify-center font-bold text-[8px] uppercase tracking-widest rotate-12 pointer-events-none select-none">
                      APPROVED
                    </div>
                    <div className="h-10 border-b border-slate-300 w-36 mx-auto flex items-end justify-center">
                      <span className="text-[9px] font-bold text-slate-400 italic block mb-0.5">{(settings.propertyName || 'DormyHub')} Central</span>
                    </div>
                    <span>ผู้มีอำนาจลงนาม (Authorized Stamp)</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

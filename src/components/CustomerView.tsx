import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wifi, Tv, Snowflake, Shield, Compass, Sparkles, 
  Search, Filter, CheckCircle2, ChevronRight, User, 
  Phone, Mail, Calendar, HelpCircle, RefreshCw, X,
  Zap, Droplet, FileText, Check
} from 'lucide-react';
import { Room, Booking, SystemSettings, UtilityInvoice } from '../types';

interface CustomerViewProps {
  rooms: Room[];
  settings: SystemSettings;
  onAddBooking: (booking: Omit<Booking, 'id' | 'createdAt'>) => void;
  invoices: UtilityInvoice[];
}

export default function CustomerView({ rooms, settings, onAddBooking, invoices }: CustomerViewProps) {
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
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [monthlyMonths, setMonthlyMonths] = useState(1); // Lease duration in months
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'PromptPay'>('Cash');
  const [slipImage, setSlipImage] = useState<string>('');
  const [formError, setFormError] = useState<string>('');
  
  // UI States
  const [bookingSuccess, setBookingSuccess] = useState<Booking | null>(null);

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
            <span className="text-gradient bg-gradient-to-r from-brand-300 via-brand-200 to-amber-100 bg-clip-text text-transparent">
              ที่เหนือระดับกับ DormyHub
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
                  <p>📍 DormyHub Residences Co., Ltd.</p>
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
                                <span className="text-xxs text-slate-400">ค่าบำรุงส่วนกลาง: ฿{inv.commonFee}</span>
                                <div className="text-right">
                                  <span className="text-xxs text-slate-400 block leading-none">ยอดรวมทั้งสิ้น</span>
                                  <span className="text-lg font-extrabold text-brand-400">฿{inv.totalCost.toLocaleString()}</span>
                                </div>
                              </div>

                              {inv.status !== 'Paid' && (
                                <div className="mt-4 pt-4 border-t border-dashed border-white/5 space-y-3 animate-fade-in">
                                  <div className="flex justify-between items-center bg-sky-500/5 border border-sky-500/10 rounded-xl p-3">
                                    <span className="text-xs text-sky-400 font-semibold">📱 สแกน QR Code เพื่อชำระค่าห้อง/ค่าน้ำค่าไฟ</span>
                                    <span className="text-xxs bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded font-bold uppercase">PromptPay</span>
                                  </div>
                                  <div className="flex flex-col items-center justify-center bg-white p-4 rounded-xl border border-sky-500/10 max-w-[170px] mx-auto space-y-1.5 shadow-md">
                                    <div className="w-full flex justify-between items-center px-0.5 border-b border-slate-100 pb-1">
                                      <span className="text-[8px] font-extrabold text-blue-900 tracking-wider">Prompt Pay</span>
                                      <span className="text-[7px] bg-blue-100 text-blue-800 px-1 py-0.5 rounded font-bold">โอนเงินทันใจ</span>
                                    </div>
                                    <img
                                      src={`https://promptpay.io/${(settings.promptPayNumber || '0891234567').replace(/[^0-9]/g, '')}/${inv.totalCost}.png`}
                                      alt="PromptPay Utility QR Code"
                                      className="w-32 h-32 object-contain"
                                      referrerPolicy="no-referrer"
                                    />
                                    <span className="text-[11px] text-blue-900 font-extrabold text-center block">
                                      ฿{inv.totalCost.toLocaleString()}
                                    </span>
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
    </div>
  );
}

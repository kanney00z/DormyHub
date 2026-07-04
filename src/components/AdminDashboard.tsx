import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, Droplet, Users, Key, Settings, Plus, 
  Trash2, FileText, Check, Clock, TrendingUp, AlertTriangle, 
  Home, ClipboardList, CreditCard, ChevronRight, CheckCircle2, DollarSign, Edit3, X, HelpCircle,
  Upload, Image as ImageIcon, Bell, Send, AlertCircle, Calendar, ChevronLeft, Wrench, Sparkles,
  Search, Filter, Download, Maximize2, RotateCw, Copy, ExternalLink, Activity
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { Room, Booking, UtilityInvoice, SystemSettings, MaintenanceTicket } from '../types';
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
  tickets: MaintenanceTicket[];
  onUpdateRooms: (rooms: Room[]) => void;
  onUpdateBookings: (bookings: Booking[]) => void;
  onUpdateInvoices: (invoices: UtilityInvoice[]) => void;
  onUpdateSettings: (settings: SystemSettings) => void;
  onUpdateTickets: (tickets: MaintenanceTicket[]) => void;
}

export default function AdminDashboard({
  rooms,
  bookings,
  invoices,
  settings,
  tickets,
  onUpdateRooms,
  onUpdateBookings,
  onUpdateInvoices,
  onUpdateSettings,
  onUpdateTickets,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'rooms' | 'bookings' | 'utilities' | 'settings' | 'maintenance'>('overview');
  
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
  const [isElectricityMeterReset, setIsElectricityMeterReset] = useState(false);
  const [isWaterMeterReset, setIsWaterMeterReset] = useState(false);
  const [selectedBillingMonth, setSelectedBillingMonth] = useState('มิถุนายน 2569');
  
  // Quick Edit Room status
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editDailyPrice, setEditDailyPrice] = useState(0);
  const [editMonthlyPrice, setEditMonthlyPrice] = useState(0);
  const [editStatus, setEditStatus] = useState<Room['status']>('Available');
  const [editElectricityMeter, setEditElectricityMeter] = useState(0);
  const [editWaterMeter, setEditWaterMeter] = useState(0);
  const [deleteConfirmRoomId, setDeleteConfirmRoomId] = useState<string | null>(null);
  const [deleteConfirmBookingId, setDeleteConfirmBookingId] = useState<string | null>(null);
  const [deleteConfirmInvoiceId, setDeleteConfirmInvoiceId] = useState<string | null>(null);
  const [deleteConfirmTicketId, setDeleteConfirmTicketId] = useState<string | null>(null);
  const [filterHistoryRoomId, setFilterHistoryRoomId] = useState<string>('All');

  // UPGRADE 2 & 3: Filter, Search, and Viewer states
  const [floorFilter, setFloorFilter] = useState<number | 'All'>('All');
  const [bookingSearchText, setBookingSearchText] = useState('');
  const [bookingStatusFilter, setBookingStatusFilter] = useState<'All' | 'Active' | 'Pending' | 'CheckedOut' | 'Cancelled'>('All');
  const [invoiceSearchText, setInvoiceSearchText] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<'All' | 'Paid' | 'Unpaid'>('All');
  
  // UPGRADE 4: Slip Zoom & Viewer state
  const [selectedSlipInvoice, setSelectedSlipInvoice] = useState<UtilityInvoice | null>(null);
  const [selectedSlipBooking, setSelectedSlipBooking] = useState<Booking | null>(null);
  const [slipZoom, setSlipZoom] = useState(1);
  const [slipRotation, setSlipRotation] = useState(0);

  // Maintenance Ticket close state
  const [closingTicketId, setClosingTicketId] = useState<string | null>(null);
  const [ticketCloseNotes, setTicketCloseNotes] = useState('');

  // Calendar State
  const [bookingViewMode, setBookingViewMode] = useState<'list' | 'calendar'>('list');
  const [calendarYear, setCalendarYear] = useState<number>(2026);
  const [calendarMonth, setCalendarMonth] = useState<number>(5); // 0-indexed: 5 is June
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<string | null>(null);
  const [calendarFilterType, setCalendarFilterType] = useState<'all' | 'daily' | 'monthly'>('all');

  // LINE Notification Testing state
  const [lineTestLoading, setLineTestLoading] = useState(false);
  const [lineTestResult, setLineTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [simActiveTab, setSimActiveTab] = useState<'booking' | 'invoice' | 'payment' | 'status'>('booking');

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

  // UPGRADE 2 & 3: Memoized filter logic for rooms, bookings, and invoices
  const filteredRooms = useMemo(() => {
    return rooms.filter(room => floorFilter === 'All' || room.floor === floorFilter);
  }, [rooms, floorFilter]);

  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const matchSearch = 
        b.guestName.toLowerCase().includes(bookingSearchText.toLowerCase()) ||
        b.roomNumber.includes(bookingSearchText) ||
        b.id.toLowerCase().includes(bookingSearchText.toLowerCase()) ||
        (b.guestPhone && b.guestPhone.includes(bookingSearchText)) ||
        (b.guestLine && b.guestLine.toLowerCase().includes(bookingSearchText.toLowerCase()));
      
      const matchStatus = bookingStatusFilter === 'All' || b.status === bookingStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [bookings, bookingSearchText, bookingStatusFilter]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchSearch = 
        inv.roomNumber.includes(invoiceSearchText) ||
        inv.id.toLowerCase().includes(invoiceSearchText.toLowerCase()) ||
        inv.billingMonth.toLowerCase().includes(invoiceSearchText.toLowerCase());
      
      const matchStatus = invoiceStatusFilter === 'All' || inv.status === invoiceStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [invoices, invoiceSearchText, invoiceStatusFilter]);

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
    if (!selectedRoomForBill) {
      return null;
    }
    const prevElec = selectedRoomForBill.electricityMeter;
    const currElec = inputCurrElectricity !== '' ? Number(inputCurrElectricity) : prevElec;
    const prevWat = selectedRoomForBill.waterMeter;
    const currWat = inputCurrWater !== '' ? Number(inputCurrWater) : prevWat;

    // If meter reset, units = currMeter (starts from 0)
    const elecUnits = isElectricityMeterReset ? currElec : Math.max(0, currElec - prevElec);
    const watUnits = isWaterMeterReset ? currWat : Math.max(0, currWat - prevWat);

    const elecCost = elecUnits * settings.electricityUnitRate;
    const watCost = watUnits * settings.waterUnitRate;
    const common = settings.commonFee;
    const totalCost = elecCost + watCost + common;

    // If reset, current doesn't need to be >= previous. Just >= 0 is fine.
    const isElecValid = isElectricityMeterReset ? currElec >= 0 : currElec >= prevElec;
    const isWatValid = isWaterMeterReset ? currWat >= 0 : currWat >= prevWat;

    return {
      elecUnits,
      watUnits,
      elecCost,
      watCost,
      common,
      totalCost,
      isValid: isElecValid && isWatValid
    };
  }, [selectedRoomForBill, inputCurrElectricity, inputCurrWater, isElectricityMeterReset, isWaterMeterReset, settings]);

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
    setEditElectricityMeter(room.electricityMeter);
    setEditWaterMeter(room.waterMeter);
  };

  const handleSaveRoomEdit = (id: string) => {
    const updated = rooms.map(room => {
      if (room.id === id) {
        return {
          ...room,
          dailyPrice: editDailyPrice,
          monthlyPrice: editMonthlyPrice,
          status: editStatus,
          electricityMeter: editElectricityMeter,
          waterMeter: editWaterMeter
        };
      }
      return room;
    });
    onUpdateRooms(updated);
    setEditingRoomId(null);
  };

  // Handle Update Maintenance Ticket Status
  const handleUpdateTicketStatus = (ticketId: string, newStatus: 'Pending' | 'In Progress' | 'Resolved', adminNotes: string) => {
    const updatedTickets = tickets.map(t => {
      if (t.id === ticketId) {
        return {
          ...t,
          status: newStatus,
          adminNotes: adminNotes,
          updatedAt: new Date().toISOString()
        };
      }
      return t;
    });
    onUpdateTickets(updatedTickets);

    // Send LINE Notification
    const ticket = tickets.find(t => t.id === ticketId);
    if (ticket && settings.lineNotificationEnabled) {
      const categoryLabel = 
        ticket.category === 'aircon' ? 'เครื่องปรับอากาศ (Aircon)' :
        ticket.category === 'plumbing' ? 'ระบบประปา/สุขภัณฑ์ (Plumbing)' :
        ticket.category === 'electricity' ? 'ระบบไฟฟ้า (Electricity)' :
        ticket.category === 'furniture' ? 'เฟอร์นิเจอร์ (Furniture)' : 'อื่นๆ (Other)';
        
      const statusLabel = 
        newStatus === 'Resolved' ? '🛠️ ซ่อมเสร็จสิ้นเรียบร้อย (Resolved)' :
        newStatus === 'In Progress' ? '⚙️ กำลังเข้าซ่อมบำรุง (In Progress)' : '⏳ รอดำเนินการ (Pending)';

      const msg = `🔧 [${settings.propertyName || 'DORMYHUB'} - อัปเดตงานแจ้งซ่อม]\n` +
                  `──────────────────\n` +
                  `รหัสงาน: ${ticket.id}\n` +
                  `ห้องพัก: ห้อง ${ticket.roomNumber}\n` +
                  `หมวดหมู่: ${categoryLabel}\n` +
                  `รายละเอียด: ${ticket.description}\n` +
                  `──────────────────\n` +
                  `สถานะใหม่: ${statusLabel}\n` +
                  `บันทึกรายงานช่าง: ${adminNotes}\n` +
                  `──────────────────\n` +
                  `ผู้แจ้ง: ${ticket.guestName} (${ticket.guestPhone})\n` +
                  `อัปเดตเมื่อ: ${new Date().toLocaleDateString('th-TH')} ${new Date().toLocaleTimeString('th-TH')}`;

      sendLineNotification(settings, msg)
        .catch(err => console.error('Error sending LINE notification:', err));
    }
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
        const msg = `⚙️ [${settings.propertyName || 'DORMYHUB'} - อัปเดตสถานะผู้เข้าพัก]
──────────────────────────
ห้องพัก: Room ${booking.roomNumber}
ผู้เข้าพัก: คุณ ${booking.guestName}
เบอร์โทร: ${booking.guestPhone}
💬 LINE ID: ${booking.guestLine || 'ไม่ได้ระบุ'}
──────────────────────────
🛎️ สถานะใหม่: ${statusText}
📅 ดำเนินการเมื่อ: ${new Date().toLocaleDateString('th-TH')} ${new Date().toLocaleTimeString('th-TH')}
──────────────────────────
ยินดีให้บริการเสมอ หากมีข้อสงสัยหรือต้องการความช่วยเหลือ สามารถติดต่อผู้ดูแลได้ทันทีครับ 😊`;
        sendLineNotification(settings, msg).catch(err => console.error('Failed to send status change notification', err));
      }
    }
  };

  // Create utility invoice
  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomForBill || !utilityBillPreview || !utilityBillPreview.isValid) return;

    const currElecValue = inputCurrElectricity !== '' ? Number(inputCurrElectricity) : selectedRoomForBill.electricityMeter;
    const currWatValue = inputCurrWater !== '' ? Number(inputCurrWater) : selectedRoomForBill.waterMeter;

    const newInvoice: UtilityInvoice = {
      id: `inv-${selectedRoomForBill.number}-${Date.now().toString().slice(-4)}`,
      roomId: selectedRoomForBill.id,
      roomNumber: selectedRoomForBill.number,
      billingMonth: selectedBillingMonth,
      prevElectricity: isElectricityMeterReset ? 0 : selectedRoomForBill.electricityMeter,
      currElectricity: currElecValue,
      prevWater: isWaterMeterReset ? 0 : selectedRoomForBill.waterMeter,
      currWater: currWatValue,
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
          electricityMeter: currElecValue,
          waterMeter: currWatValue
        };
      }
      return r;
    });

    onUpdateRooms(updatedRooms);
    onUpdateInvoices([newInvoice, ...invoices]);

    // LINE Notification on Invoice Created
    if (settings.lineNotificationEnabled) {
      const elecUnits = newInvoice.currElectricity - newInvoice.prevElectricity;
      const watUnits = newInvoice.currWater - newInvoice.prevWater;
      const msg = `📝 [${settings.propertyName || 'DORMYHUB'} - ใบแจ้งค่าบริการรายเดือน]
──────────────────────────
ห้องพัก: Room ${newInvoice.roomNumber}
ประจำงวด: ${newInvoice.billingMonth}
──────────────────────────
🔌 ค่าไฟฟ้า (Electricity)
   • เลขมิเตอร์: ${newInvoice.prevElectricity} → ${newInvoice.currElectricity} kWh
   • การใช้งาน: ${elecUnits} หน่วย (* ${newInvoice.electricityUnitRate} บาท)
   • รวมเป็นเงิน: ฿${newInvoice.electricityCost.toLocaleString()} บาท
──────────────────────────
💧 ค่าน้ำประปา (Water)
   • เลขมิเตอร์: ${newInvoice.prevWater} → ${newInvoice.currWater} m³
   • การใช้งาน: ${watUnits} หน่วย (* ${newInvoice.waterUnitRate} บาท)
   • รวมเป็นเงิน: ฿${newInvoice.waterCost.toLocaleString()} บาท
──────────────────────────
🏢 ค่าบริการส่วนกลาง: ฿${newInvoice.commonFee.toLocaleString()} บาท
──────────────────────────
💰 ยอดรวมสุทธิ: ฿${newInvoice.totalCost.toLocaleString()} บาท
⏳ สถานะบิล: รอการชำระเงิน ⏳
──────────────────────────
💡 กรุณาชำระเงินและส่งหลักฐานผ่านหน้าระบบหอพัก
ขอบคุณที่เลือกใช้บริการหอพักของเราครับ 🙏`;
      sendLineNotification(settings, msg).catch(err => console.error('Failed to send invoice notification', err));
    }

    // Reset fields
    setSelectedRoomIdForBill('');
    setInputCurrElectricity('');
    setInputCurrWater('');
    setIsElectricityMeterReset(false);
    setIsWaterMeterReset(false);
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
      const msg = `✅ [${settings.propertyName || 'DORMYHUB'} - ยืนยันการชำระเงิน]
──────────────────────────
ห้องพัก: Room ${invoice.roomNumber}
ประจำงวด: ${invoice.billingMonth}
──────────────────────────
💰 ยอดเงินรับชำระ: ฿${invoice.totalCost.toLocaleString()} บาท
📅 วันที่บันทึกชำระ: ${new Date().toLocaleDateString('th-TH')} ${new Date().toLocaleTimeString('th-TH')}
📋 สถานะการชำระเงิน: ชำระสำเร็จเรียบร้อยแล้ว
──────────────────────────
ทางหอพักได้รับยอดชำระแล้ว ขอบคุณสำหรับความร่วมมือและขอให้มีความสุขกับการพักอาศัยครับ 🙏✨`;
      sendLineNotification(settings, msg).catch(err => console.error('Failed to send payment notification', err));
    }
  };

  // UPGRADE 3: Real CSV export for Bookings & Invoices
  const handleExportBookingsToCSV = () => {
    const headers = ['Booking ID', 'Room Number', 'Guest Name', 'Phone', 'Email', 'Check-In', 'Check-Out', 'Type', 'Total Price', 'Deposit Paid', 'Status', 'Created At'];
    const rows = bookings.map(b => [
      b.id,
      b.roomNumber,
      b.guestName,
      b.guestPhone,
      b.guestEmail,
      b.checkInDate,
      b.checkOutDate,
      b.bookingType,
      b.totalPrice,
      b.depositPaid,
      b.status,
      b.createdAt
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `dormy_bookings_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportInvoicesToCSV = () => {
    const headers = ['Invoice ID', 'Room Number', 'Billing Month', 'Prev Elec', 'Curr Elec', 'Elec Cost', 'Prev Water', 'Curr Water', 'Water Cost', 'Common Fee', 'Total Cost', 'Status', 'Issue Date', 'Paid Date'];
    const rows = invoices.map(inv => [
      inv.id,
      inv.roomNumber,
      inv.billingMonth,
      inv.prevElectricity,
      inv.currElectricity,
      inv.electricityCost,
      inv.prevWater,
      inv.currWater,
      inv.waterCost,
      inv.commonFee,
      inv.totalCost,
      inv.status,
      inv.issueDate,
      inv.paidDate || 'N/A'
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `dormy_invoices_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Generate beautiful text message for each simulation tab
  const getSimulatedMessageText = (tab: 'booking' | 'invoice' | 'payment' | 'status') => {
    const property = settings.propertyName || 'DORMYHUB';
    const month = selectedBillingMonth || 'มิถุนายน 2569';
    const elecPrice = 150 * settings.electricityUnitRate;
    const watPrice = 15 * settings.waterUnitRate;
    const totalInvoice = elecPrice + watPrice + settings.commonFee;

    switch (tab) {
      case 'booking':
        return `✨ [${property} - แจ้งเตือนจองห้องพักใหม่]
──────────────────────────
รหัสการจอง: BK-729481
ห้องพัก: Room 101 (Deluxe)
ประเภทการจอง: รายเดือน (Monthly)
──────────────────────────
👤 ผู้จอง: คุณ สมชาย รักดี
📞 เบอร์โทร: 081-234-5678
📅 เช็คอิน: 01/10/2026
📅 เช็คเอาท์: 01/11/2026
──────────────────────────
💰 ยอดเงินมัดจำ: ฿${(5500 * (settings.securityDepositMultiplier || 1)).toLocaleString()} บาท
⏳ สถานะ: รอการเช็คอินเข้าพัก ⏳
──────────────────────────
ระบบบันทึกเมื่อ: ${new Date().toLocaleDateString('th-TH')} ${new Date().toLocaleTimeString('th-TH')}`;

      case 'invoice':
        return `📝 [${property} - ใบแจ้งค่าบริการรายเดือน]
──────────────────────────
ห้องพัก: Room 101
ประจำงวด: ${month}
──────────────────────────
🔌 ค่าไฟฟ้า (Electricity)
   • เลขมิเตอร์: 1200 → 1350 kWh
   • การใช้งาน: 150 หน่วย (* ${settings.electricityUnitRate} บาท)
   • รวมเป็นเงิน: ฿${elecPrice.toLocaleString()} บาท
──────────────────────────
💧 ค่าน้ำประปา (Water)
   • เลขมิเตอร์: 450 → 465 m³
   • การใช้งาน: 15 หน่วย (* ${settings.waterUnitRate} บาท)
   • รวมเป็นเงิน: ฿${watPrice.toLocaleString()} บาท
──────────────────────────
🏢 ค่าบริการส่วนกลาง: ฿${settings.commonFee.toLocaleString()} บาท
──────────────────────────
💰 ยอดรวมสุทธิ: ฿${totalInvoice.toLocaleString()} บาท
⏳ สถานะบิล: รอการชำระเงิน ⏳
──────────────────────────
💡 กรุณาชำระเงินและส่งหลักฐานผ่านหน้าระบบหอพัก
ขอบคุณที่เลือกใช้บริการหอพักของเราครับ 🙏`;

      case 'payment':
        return `✅ [${property} - ยืนยันการชำระเงิน]
──────────────────────────
ห้องพัก: Room 101
ประจำงวด: ${month}
──────────────────────────
💰 ยอดเงินรับชำระ: ฿${totalInvoice.toLocaleString()} บาท
📅 วันที่บันทึกชำระ: ${new Date().toLocaleDateString('th-TH')} ${new Date().toLocaleTimeString('th-TH')}
📋 สถานะการชำระเงิน: ชำระสำเร็จเรียบร้อยแล้ว
──────────────────────────
ทางหอพักได้รับยอดชำระแล้ว ขอบคุณสำหรับความร่วมมือและขอให้มีความสุขกับการพักอาศัยครับ 🙏✨`;

      case 'status':
        return `⚙️ [${property} - อัปเดตสถานะผู้เข้าพัก]
──────────────────────────
ห้องพัก: Room 101
ผู้เข้าพัก: คุณ สมชาย รักดี
เบอร์โทร: 081-234-5678
──────────────────────────
🛎️ สถานะใหม่: เช็คอินเข้าพัก (Check-in) 🛎️
📅 ดำเนินการเมื่อ: ${new Date().toLocaleDateString('th-TH')} ${new Date().toLocaleTimeString('th-TH')}
──────────────────────────
ยินดีต้อนรับเข้าพักหอพักของเราอย่างเป็นทางการ หากมีข้อสงสัยหรือพบปัญหาในห้องพัก สามารถติดต่อแอดมินได้ตลอดเวลาครับ 😊`;
    }
  };

  // Test LINE notification
  const handleTestLineNotification = async (customMsg?: string) => {
    setLineTestLoading(true);
    setLineTestResult(null);
    const tokenType = settings.lineTokenType || 'MessagingApi';
    
    let isConfigured = false;
    if (tokenType === 'Notify' && settings.lineNotifyToken) {
      isConfigured = true;
    } else if (tokenType === 'MessagingApi' && settings.lineChannelAccessToken) {
      isConfigured = true;
    }

    if (!isConfigured) {
      setLineTestResult({
        success: false,
        message: 'กรุณากรอกข้อมูลการเชื่อมต่อและเปิดใช้งาน LINE ด้านบนก่อนทดสอบส่งสลิปจริง',
      });
      setLineTestLoading(false);
      return;
    }

    const testMsg = customMsg || `🔔 ทดสอบระบบแจ้งเตือนไลน์หอพัก\nสถานที่: ${settings.propertyName || 'DORMYHUB'}\nสถานะเชื่อมต่อ: สำเร็จแล้ว! 🎉\nเวลา: ${new Date().toLocaleTimeString('th-TH')}`;
    
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
        message: 'ส่งข้อความสำเร็จ! สลิปการแจ้งเตือนรูปแบบมืออาชีพถูกส่งไปยังห้องแชท LINE ของคุณแล้ว',
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
              <h2 className="text-lg font-extrabold tracking-tight text-white leading-none bg-gradient-to-r from-brand-400 via-blue-400 to-indigo-300 bg-clip-text text-transparent">{settings.propertyName || 'DormyHub'}</h2>
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
              { id: 'maintenance', label: 'แจ้งซ่อม/ปัญหาอาคาร', icon: Wrench },
              { id: 'settings', label: 'ตั้งค่าระบบกลาง', icon: Settings },
            ].map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const pendingTicketsCount = tickets.filter(t => t.status === 'Pending').length;
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
                  {item.id === 'maintenance' && pendingTicketsCount > 0 && (
                    <span className="ml-auto bg-amber-500 text-slate-950 font-bold text-xxs px-2 py-0.5 rounded-full">
                      {pendingTicketsCount}
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

            {/* UPGRADE 1: Interactive Dashboard Analytics & Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Revenue Trend Chart */}
              <div className="lg:col-span-2 bg-[#121216]/90 p-6 rounded-3xl border border-white/10 shadow-[0_4px_25px_rgba(0,0,0,0.3)]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-emerald-400" /> สรุปแนวโน้มรายรับประจำโครงการ
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">กราฟแสดงเปรียบเทียบยอดชำระแล้ว (สีเขียว) และยอดค้างชำระ (สีแดง)</p>
                  </div>
                  <span className="text-xxs px-2.5 py-1 bg-slate-800 border border-slate-700/60 rounded-lg text-slate-300 font-mono uppercase font-bold tracking-wider">6 MONTHS</span>
                </div>
                
                <div className="h-[220px] w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={(() => {
                        const billingMonthsList = ['มกราคม 2569', 'กุมภาพันธ์ 2569', 'มีนาคม 2569', 'เมษายน 2569', 'พฤษภาคม 2569', 'มิถุนายน 2569'];
                        return billingMonthsList.map(m => {
                          const monthlyInvoices = invoices.filter(inv => inv.billingMonth === m);
                          const paidSum = monthlyInvoices.filter(inv => inv.status === 'Paid').reduce((sum, inv) => sum + inv.totalCost, 0);
                          const unpaidSum = monthlyInvoices.filter(inv => inv.status === 'Unpaid').reduce((sum, inv) => sum + inv.totalCost, 0);
                          
                          // Inject beautiful realistic fallback/initial data for previous months
                          let seedRents = 0;
                          if (m === 'มกราคม 2569') seedRents = 8400;
                          if (m === 'กุมภาพันธ์ 2569') seedRents = 12500;
                          if (m === 'มีนาคม 2569') seedRents = 11200;
                          if (m === 'เมษายน 2569') seedRents = 15800;
                          
                          return {
                            name: m.split(' ')[0], // Only use month name for cleaner axis
                            'ชำระแล้ว (Paid)': paidSum + (seedRents > 0 ? seedRents : 0),
                            'ค้างชำระ (Unpaid)': unpaidSum,
                            'รายรับรวม': paidSum + unpaidSum + seedRents
                          };
                        });
                      })()}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorPaid" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorUnpaid" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#09090b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                        labelStyle={{ color: '#ffffff', fontWeight: 'bold', fontSize: '11px' }}
                        itemStyle={{ fontSize: '11px' }}
                      />
                      <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                      <Area type="monotone" dataKey="ชำระแล้ว (Paid)" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorPaid)" />
                      <Area type="monotone" dataKey="ค้างชำระ (Unpaid)" stroke="#f43f5e" strokeWidth={1.5} fillOpacity={1} fill="url(#colorUnpaid)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Occupancy Pie Chart */}
              <div className="bg-[#121216]/90 p-6 rounded-3xl border border-white/10 shadow-[0_4px_25px_rgba(0,0,0,0.3)] flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-brand-400" /> สัดส่วนสถานะห้องพัก
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">การจัดสรรและอัตราการเช่าของยูนิตทั้งหมด</p>
                </div>

                <div className="h-[140px] w-full flex items-center justify-center relative mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'ว่าง (Available)', value: stats.availableCount, color: '#10b981' },
                          { name: 'มีผู้เช่า (Occupied)', value: stats.occupiedCount, color: '#6366f1' },
                          { name: 'ปรับปรุง (Maintenance)', value: stats.maintenanceCount, color: '#f59e0b' }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={36}
                        outerRadius={54}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        <Cell key="cell-available" fill="#10b981" />
                        <Cell key="cell-occupied" fill="#6366f1" />
                        <Cell key="cell-maintenance" fill="#f59e0b" />
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#09090b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                        itemStyle={{ fontSize: '10px', color: '#fff' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  {/* Inside Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xs text-slate-400 font-light leading-none">ห้องพักรวม</span>
                    <span className="text-lg font-black text-white mt-1 leading-none">{rooms.length}</span>
                  </div>
                </div>

                {/* Legends */}
                <div className="grid grid-cols-3 gap-2 text-center text-[10px] mt-2 pt-3 border-t border-white/5">
                  <div className="space-y-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block mr-1" />
                    <span className="text-slate-400 block font-light">ว่าง</span>
                    <strong className="text-emerald-400 font-bold block">{stats.availableCount} ยูนิต</strong>
                  </div>
                  <div className="space-y-0.5 border-x border-white/5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block mr-1" />
                    <span className="text-slate-400 block font-light">มีผู้เช่า</span>
                    <strong className="text-indigo-400 font-bold block">{stats.occupiedCount} ยูนิต</strong>
                  </div>
                  <div className="space-y-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block mr-1" />
                    <span className="text-slate-400 block font-light">ปรับปรุง</span>
                    <strong className="text-amber-400 font-bold block">{stats.maintenanceCount} ยูนิต</strong>
                  </div>
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

            {/* UPGRADE 2: Floor Filter Tabs */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 mr-2 font-medium">🏢 ค้นหาตามชั้นอาคาร:</span>
                <div className="flex bg-slate-900/80 p-0.5 rounded-xl border border-slate-800">
                  {['All', 1, 2, 3].map((floor) => (
                    <button
                      key={floor}
                      onClick={() => setFloorFilter(floor as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        floorFilter === floor
                          ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/10'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {floor === 'All' ? 'ทั้งหมด (All)' : `ชั้น ${floor}`}
                    </button>
                  ))}
                </div>
              </div>
              <span className="text-xs text-slate-500">พบ {filteredRooms.length} ยูนิตห้องพัก</span>
            </div>

            {/* Room list Grid */}
            <div className="space-y-4">
              {filteredRooms.map(room => {
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
                            className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white h-[26px]"
                          >
                            <option value="Available">พร้อมให้เช่า</option>
                            <option value="Occupied">มีผู้เข้าพัก</option>
                            <option value="Maintenance">ปิดปรับปรุง</option>
                          </select>
                        </div>
                        <div>
                          <span className="text-xxs text-slate-400 block mb-1">⚡ มิเตอร์ไฟ (kWh)</span>
                          <input
                            id={`edit-meter-elec-${room.number}`}
                            type="number"
                            value={editElectricityMeter}
                            onChange={(e) => setEditElectricityMeter(Number(e.target.value))}
                            className="w-24 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-xxs text-slate-400 block mb-1">💧 มิเตอร์น้ำ (m³)</span>
                          <input
                            id={`edit-meter-water-${room.number}`}
                            type="number"
                            value={editWaterMeter}
                            onChange={(e) => setEditWaterMeter(Number(e.target.value))}
                            className="w-24 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white font-mono"
                          />
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
              <div className="space-y-4">
                {/* UPGRADE 3: Advanced Search & Filter Toolbar + Export CSV */}
                <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex flex-1 flex-col sm:flex-row gap-3 w-full">
                    {/* Search Text Input */}
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="ค้นหาชื่อผู้จอง, เลขห้อง, รหัสการจอง หรือ LINE ID..."
                        value={bookingSearchText}
                        onChange={(e) => setBookingSearchText(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-brand-500 text-white placeholder-slate-500"
                      />
                      {bookingSearchText && (
                        <button onClick={() => setBookingSearchText('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs">✕</button>
                      )}
                    </div>
                    
                    {/* Status Filter Dropdown */}
                    <div className="flex items-center gap-2">
                      <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <select
                        value={bookingStatusFilter}
                        onChange={(e: any) => setBookingStatusFilter(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-brand-500 text-slate-300 min-w-[150px]"
                      >
                        <option value="All">ทุกสถานะ (All Status)</option>
                        <option value="Pending">รอเช็คอิน (Pending)</option>
                        <option value="Active">เข้าพักอยู่ (Active)</option>
                        <option value="CheckedOut">เช็คเอาท์แล้ว (CheckedOut)</option>
                        <option value="Cancelled">ยกเลิกแล้ว (Cancelled)</option>
                      </select>
                    </div>
                  </div>

                  {/* CSV Export Button */}
                  <button
                    onClick={handleExportBookingsToCSV}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700/60 rounded-xl transition-all cursor-pointer font-bold whitespace-nowrap self-end md:self-auto"
                    title="ดาวน์โหลดข้อมูลเป็นไฟล์ Excel/CSV"
                  >
                    <Download className="w-3.5 h-3.5" />
                    ส่งออก CSV
                  </button>
                </div>

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
                        {filteredBookings.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-slate-500">
                              {bookings.length === 0 ? 'ยังไม่มีรายการจองห้องในระบบ' : 'ไม่พบรายการจองที่ตรงตามเงื่อนไขค้นหา'}
                            </td>
                          </tr>
                        ) : (
                          filteredBookings.map((book) => (
                          <tr key={book.id} className="hover:bg-slate-900/30 transition-colors">
                            <td className="p-4">
                              <div className="font-bold text-white">{book.guestName}</div>
                              <div className="text-xxs text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                                <span>📞 {book.guestPhone}</span>
                                <span>✉️ {book.guestEmail}</span>
                                {book.guestLine && (
                                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1 py-0.5 rounded text-[10px] font-mono inline-block">
                                    💬 LINE: {book.guestLine}
                                  </span>
                                )}
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
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedSlipBooking(book);
                                      setSlipZoom(1);
                                      setSlipRotation(0);
                                    }}
                                    className="text-[9px] text-brand-400 hover:text-brand-300 font-semibold underline flex items-center gap-0.5 cursor-pointer ml-1 bg-transparent border-0"
                                  >
                                    📄 ตรวจสอบสลิปโอนเงิน
                                  </button>
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

                      {/* Active Tenant Information & LINE ID */}
                      {(() => {
                        const activeBooking = bookings.find(b => b.roomId === selectedRoomForBill.id && b.status === 'Active');
                        if (!activeBooking) return null;
                        return (
                          <div className="bg-[#0c1410] p-4 rounded-xl border border-emerald-950 text-xs text-slate-400 space-y-2">
                            <span className="font-bold text-emerald-400 flex items-center gap-1">
                              👤 ผู้เช่าปัจจุบัน (Active Tenant):
                            </span>
                            <div className="flex justify-between text-[11px]">
                              <span>ชื่อผู้เช่า:</span>
                              <span className="font-bold text-slate-200">{activeBooking.guestName}</span>
                            </div>
                            <div className="flex justify-between text-[11px]">
                              <span>เบอร์โทร:</span>
                              <span className="font-bold text-slate-200">{activeBooking.guestPhone}</span>
                            </div>
                            <div className="flex justify-between items-center text-[11px] pt-1 border-t border-emerald-950/40">
                              <span>LINE ID:</span>
                              <span className="font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/20 px-1.5 py-0.5 rounded font-mono">
                                {activeBooking.guestLine || 'ไม่ได้ระบุ'}
                              </span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Current inputs */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xxs text-slate-400 block mb-1">
                            🔌 เลขไฟปัจจุบัน (kWh) <span className="text-brand-400 font-light block mt-0.5">(เว้นว่าง = ยังไม่จด/เป็น 0)</span>
                          </label>
                          <input
                            id="utility-curr-electricity"
                            type="number"
                            placeholder="ปล่อยว่าง = 0 หน่วย"
                            value={inputCurrElectricity}
                            onChange={(e) => setInputCurrElectricity(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-brand-500 text-white"
                          />
                          <label className="flex items-center gap-1.5 mt-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isElectricityMeterReset}
                              onChange={(e) => setIsElectricityMeterReset(e.target.checked)}
                              className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-800 text-brand-500 focus:ring-0 cursor-pointer"
                            />
                            <span className="text-[10px] text-slate-400 hover:text-slate-200 transition-colors">🔌 เปลี่ยนมิเตอร์ / เริ่มนับใหม่ (จาก 0)</span>
                          </label>
                        </div>
                        <div>
                          <label className="text-xxs text-slate-400 block mb-1">
                            💧 เลขน้ำปัจจุบัน (m³) <span className="text-brand-400 font-light block mt-0.5">(เว้นว่าง = ยังไม่จด/เป็น 0)</span>
                          </label>
                          <input
                            id="utility-curr-water"
                            type="number"
                            placeholder="ปล่อยว่าง = 0 หน่วย"
                            value={inputCurrWater}
                            onChange={(e) => setInputCurrWater(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-brand-500 text-white"
                          />
                          <label className="flex items-center gap-1.5 mt-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isWaterMeterReset}
                              onChange={(e) => setIsWaterMeterReset(e.target.checked)}
                              className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-800 text-brand-500 focus:ring-0 cursor-pointer"
                            />
                            <span className="text-[10px] text-slate-400 hover:text-slate-200 transition-colors">💧 เปลี่ยนมิเตอร์ / เริ่มนับใหม่ (จาก 0)</span>
                          </label>
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
                            {isElectricityMeterReset ? (
                              `มิเตอร์นับใหม่: 0 ถึง ${inputCurrElectricity !== '' ? inputCurrElectricity : 0} kWh`
                            ) : (
                              `${selectedRoomForBill?.electricityMeter} ถึง ${inputCurrElectricity !== '' ? `${inputCurrElectricity} kWh` : `${selectedRoomForBill?.electricityMeter} kWh (ยังไม่จด)`}`
                            )}
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
                            {isWaterMeterReset ? (
                              `มิเตอร์นับใหม่: 0 ถึง ${inputCurrWater !== '' ? inputCurrWater : 0} m³`
                            ) : (
                              `${selectedRoomForBill?.waterMeter} ถึง ${inputCurrWater !== '' ? `${inputCurrWater} m³` : `${selectedRoomForBill?.waterMeter} m³ (ยังไม่จด)`}`
                            )}
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
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-800">
                    <h4 className="text-base font-bold text-white">📝 ประวัติใบแจ้งหนี้ทั้งหมด</h4>
                    
                    {/* CSV Export Button */}
                    <button
                      type="button"
                      onClick={handleExportInvoicesToCSV}
                      className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xxs text-slate-200 border border-slate-700/60 rounded-xl transition-all cursor-pointer font-bold"
                      title="ดาวน์โหลดประวัติบิลเป็นไฟล์ Excel/CSV"
                    >
                      <Download className="w-3.5 h-3.5" />
                      ส่งออก CSV
                    </button>
                  </div>

                  {/* Search and filter toolbar */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="ค้นหาเลขห้อง หรือรอบบิล..."
                        value={invoiceSearchText}
                        onChange={(e) => setInvoiceSearchText(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xxs focus:outline-none focus:border-brand-500 text-white placeholder-slate-500"
                      />
                    </div>
                    <div>
                      <select
                        value={invoiceStatusFilter}
                        onChange={(e: any) => setInvoiceStatusFilter(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xxs focus:outline-none focus:border-brand-500 text-slate-300"
                      >
                        <option value="All">ทุกสถานะ (All Invoices)</option>
                        <option value="Unpaid">ค้างชำระ (Unpaid)</option>
                        <option value="Paid">ชำระแล้ว (Paid)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    {filteredInvoices.length === 0 ? (
                      <div className="text-center py-12 text-slate-500 text-xs">
                        {invoices.length === 0 ? 'ยังไม่มีใบแจ้งหนี้ในระบบ' : 'ไม่พบรายการใบแจ้งหนี้ที่ตรงตามเงื่อนไขค้นหา'}
                      </div>
                    ) : (
                      filteredInvoices.map((inv) => {
                      const bookingForInv = bookings.find(b => b.roomNumber === inv.roomNumber && b.status === 'Active');
                      const lineShareText = `📝 [${settings.propertyName || 'DORMYHUB'} - ใบแจ้งหนี้ค่าน้ำค่าไฟ]
ห้องพัก: Room ${inv.roomNumber}
ประจำงวด: ${inv.billingMonth}
──────────────────────────
🔌 ค่าไฟฟ้า: ${inv.currElectricity - inv.prevElectricity} หน่วย (* ${inv.electricityUnitRate} บ.) = ฿${inv.electricityCost.toLocaleString()} บาท
💧 ค่าน้ำประปา: ${inv.currWater - inv.prevWater} หน่วย (* ${inv.waterUnitRate} บ.) = ฿${inv.waterCost.toLocaleString()} บาท
🏢 ส่วนกลาง: ฿${inv.commonFee.toLocaleString()} บาท
💰 ยอดสุทธิ: ฿${inv.totalCost.toLocaleString()} บาท
──────────────────────────
⏳ สถานะ: รอการชำระเงิน
🔗 ตรวจสอบบิล & ส่งสลิปโอนเงินได้ที่: ${window.location.origin}
ขอบคุณครับ 🙏✨`;

                      const handleCopyText = () => {
                        navigator.clipboard.writeText(lineShareText);
                        alert(`คัดลอกรายละเอียดบิลห้อง ${inv.roomNumber} เรียบร้อยแล้ว! สามารถนำไปวางส่ง LINE ให้ผู้เช่าได้เลยครับ`);
                      };

                      return (
                        <div key={inv.id} className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          <div className="text-xs space-y-2 w-full md:w-auto">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-white">ห้อง {inv.roomNumber}</span>
                              <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-400">{inv.billingMonth}</span>
                            </div>
                            <div className="text-slate-400 space-y-0.5">
                              <p>🔌 ไฟฟ้า: ฿{inv.electricityCost} ({inv.currElectricity - inv.prevElectricity} หน่วย)</p>
                              <p>💧 น้ำประปา: ฿{inv.waterCost} ({inv.currWater - inv.prevWater} หน่วย)</p>
                            </div>
                            {bookingForInv && (
                              <div className="pt-1.5 border-t border-slate-800/60 flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] text-slate-500">👤 {bookingForInv.guestName}</span>
                                {bookingForInv.guestLine && (
                                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 font-mono flex items-center gap-1">
                                    💬 LINE: {bookingForInv.guestLine}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto border-t md:border-t-0 border-slate-800/60 pt-3 md:pt-0">
                            <div className="text-left md:text-right">
                              <span className="text-base font-bold text-white block">฿{inv.totalCost.toLocaleString()}</span>
                              <span className={`inline-block text-xxs px-2 py-0.5 mt-1 rounded-full font-semibold ${
                                inv.status === 'Paid' 
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}>
                                {inv.status === 'Paid' ? 'ชำระแล้ว' : 'ค้างชำระ'}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {/* Copy Button */}
                              <button
                                onClick={handleCopyText}
                                title="คัดลอกข้อความบิล"
                                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                              >
                                📋 ก๊อปปี้บิล
                              </button>

                              {/* Send LINE Button */}
                              <a
                                href={`https://line.me/R/msg/text/?${encodeURIComponent(lineShareText)}`}
                                target="_blank"
                                rel="noreferrer"
                                title="ส่งค่าน้ำค่าไฟไป LINE"
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                              >
                                💬 ส่ง LINE
                              </a>

                              <div className="shrink-0 flex items-center justify-end ml-1">
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
                        </div>
                      );
                    }))}
                  </div>
                </div>

              </div>

            </div>
          </motion.div>
        )}

        {activeTab === 'settings' && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.4 }}
            className="space-y-8 max-w-7xl mx-auto"
          >
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
              <div>
                <h1 className="text-3xl font-extrabold text-white tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  แผงควบคุมและตั้งค่ากลาง
                </h1>
                <p className="text-slate-400 text-sm mt-1">
                  กำหนดสิทธิ์ความปลอดภัย กำหนดรูปแบบข้อความอัตโนมัติ และเชื่อมโยงระบบแจ้งเตือน LINE Bot สลิปชำระเงิน
                </p>
              </div>
              <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold shadow-inner">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>LINE Messaging Engine Connected (v2)</span>
              </div>
            </div>

            {/* Split Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column: Form Settings */}
              <div className="lg:col-span-7 space-y-8">
                
                {/* 1. General Property & Payee */}
                <div className="bg-white/[0.02] border border-white/5 backdrop-blur-md rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl hover:border-white/10 transition-all duration-300">
                  <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                    <div className="w-9 h-9 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-400">
                      <Home className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">ข้อมูลสถานที่ & พร้อมเพย์</h3>
                      <p className="text-xs text-slate-500">ข้อมูลพื้นฐานที่แสดงบนใบแจ้งหนี้และหน้าระบบจองผู้เช่า</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-300 block">ชื่อสถานที่ / แบรนด์อาคาร</label>
                      <input
                        id="settings-property-name"
                        type="text"
                        value={settings.propertyName || ''}
                        onChange={(e) => onUpdateSettings({ ...settings, propertyName: e.target.value })}
                        placeholder="DORMYHUB"
                        className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-300 block">หมายเลขพร้อมเพย์รับเงินโอน</label>
                      <input
                        id="settings-promptpay-number"
                        type="text"
                        value={settings.promptPayNumber || ''}
                        onChange={(e) => onUpdateSettings({ ...settings, promptPayNumber: e.target.value })}
                        placeholder="089-123-4567"
                        className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. LINE Notifications Setup */}
                <div className="bg-white/[0.02] border border-white/5 backdrop-blur-md rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl hover:border-white/10 transition-all duration-300">
                  <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                        <Bell className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white">ระบบแจ้งเตือนผ่าน LINE อัตโนมัติ</h3>
                        <p className="text-xs text-slate-500">แจ้งเตือนสลิปเงิน บิล และใบจองส่งหาแชทมือถือทันที</p>
                      </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={settings.lineNotificationEnabled || false}
                        onChange={(e) => onUpdateSettings({ ...settings, lineNotificationEnabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-12 h-6.5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:bg-white shadow-inner"></div>
                    </label>
                  </div>

                  {settings.lineNotificationEnabled ? (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      transition={{ duration: 0.3 }}
                      className="space-y-6"
                    >
                      <div className="space-y-3">
                        <label className="text-xs font-semibold text-slate-300 block">โปรโตคอล API ที่ใช้เชื่อมโยง</label>
                        <div className="grid grid-cols-2 gap-4">
                          <button
                            type="button"
                            onClick={() => onUpdateSettings({ ...settings, lineTokenType: 'Notify' })}
                            className={`py-3 px-4 rounded-xl text-xs font-bold border transition-all duration-300 cursor-pointer flex flex-col items-center gap-1.5 justify-center ${
                              (settings.lineTokenType || 'Notify') === 'Notify'
                                ? 'bg-rose-500/10 border-rose-500/40 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.1)]'
                                : 'bg-[#0a0a0f] border-white/5 text-slate-350 hover:text-slate-400 hover:border-white/10'
                            }`}
                          >
                            <span className="line-through flex items-center gap-1 text-slate-400">💬 LINE Notify</span>
                            <span className="text-[10px] text-rose-500 font-medium font-sans">หยุดให้บริการทั่วโลก ❌</span>
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => onUpdateSettings({ ...settings, lineTokenType: 'MessagingApi' })}
                            className={`py-3 px-4 rounded-xl text-xs font-bold border transition-all duration-300 cursor-pointer flex flex-col items-center gap-1.5 justify-center ${
                              settings.lineTokenType === 'MessagingApi'
                                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                                : 'bg-[#0a0a0f] border-white/5 text-slate-300 hover:text-white hover:border-white/10'
                            }`}
                          >
                            <span className="flex items-center gap-1 text-emerald-400">🤖 Messaging API (Bot)</span>
                            <span className="text-[10px] text-emerald-500 font-medium font-sans">เสถียร / ส่งฟรี 100% ✅</span>
                          </button>
                        </div>
                      </div>

                      {(settings.lineTokenType || 'Notify') === 'Notify' ? (
                        <div className="space-y-3 bg-rose-500/5 p-5 rounded-2xl border border-rose-500/10 shadow-inner">
                          <div className="flex gap-3 items-start">
                            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                            <div className="text-xs text-rose-200/90 leading-relaxed space-y-1.5">
                              <p className="font-extrabold text-rose-400 text-sm">⚠️ บริการ LINE Notify สิ้นสุดการให้บริการอย่างถาวร</p>
                              <p>เนื่องจากทาง LINE ประกาศหยุดการให้บริการ API และการส่งโทเค็น <code className="bg-black/40 px-1 py-0.5 rounded text-rose-350">notify-api.line.me</code> ทั่วโลกแล้ว ส่งผลให้ทุกเว็บไซต์หรือแอปพลิเคชันไม่สามารถใช้วิธีนี้ส่งบิลหอพักได้อีกต่อไป</p>
                              <p className="mt-3 text-emerald-400 font-bold">👉 กรุณาเปิดใช้งานระบบ &quot;LINE Messaging API (Bot)&quot; ด้านขวา ซึ่งรองรับระบบหอพักได้อย่างสมบูรณ์แบบและใช้งานได้จริง</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          
                          <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-xl flex gap-3 items-start shadow-inner">
                            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                            <div className="text-xs text-amber-200/90 leading-relaxed space-y-1">
                              <p className="font-bold">เงื่อนไขสำคัญก่อนเริ่มส่งข้อความ:</p>
                              <p>1. คัดลอกลิงก์คิวอาร์โค้ดของบอทในหน้าแดชบอร์ด LINE และกดแอดเพื่อนกับบอท</p>
                              <p>2. นำ <strong className="text-white">Channel access token</strong> มาวาง และหากต้องการส่งตรงเข้าแชทส่วนตัวของคุณ ให้นำ <strong className="text-white">Your User ID</strong> มากรอก</p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-300 block font-sans">
                              LINE Channel Access Token (long-lived)
                            </label>
                            <span className="text-[11px] text-slate-500 block leading-normal">
                              สิทธิ์การส่งข้อความสูงสุดที่ออกให้จาก LINE Developers Console ของบัญชีของคุณ
                            </span>
                            <textarea
                              id="settings-line-channel-token"
                              rows={3}
                              value={settings.lineChannelAccessToken || ''}
                              onChange={(e) => onUpdateSettings({ ...settings, lineChannelAccessToken: e.target.value })}
                              placeholder="เช่น eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOi..."
                              className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 font-mono leading-relaxed transition-all duration-300"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-300 block font-sans">
                              LINE User ID สำหรับรับการแจ้งเตือนหลัก
                            </label>
                            <span className="text-[11px] text-slate-500 block leading-normal">
                              รหัสระบุตัวตนระบบที่ขึ้นต้นด้วย <strong className="text-slate-300">U</strong> (สามารถตรวจสอบได้ที่หน้าประวัติ Basic Settings ใน LINE Console)
                            </span>
                            <input
                              id="settings-line-user-id"
                              type="text"
                              value={settings.lineUserId || ''}
                              onChange={(e) => onUpdateSettings({ ...settings, lineUserId: e.target.value })}
                              placeholder="เช่น U82813da3a6976ca80d941bfdf82..."
                              className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 font-mono transition-all duration-300"
                            />
                            <p className="text-[10px] text-amber-400 font-sans leading-relaxed pt-0.5">
                              * ห้ามใส่ ID ค้นหาทั่วไป (เช่น @lineid หรือเบอร์โทรศัพท์) ระบบเซิร์ฟเวอร์จะปฏิเสธการร้องขอทำให้ขึ้นข้อผิดพลาด 400 Bad Request
                            </p>
                          </div>

                          {/* Quick Guide */}
                          <div className="bg-[#0e0f14] border border-white/5 p-4 rounded-xl space-y-2.5">
                            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">🛠️ ขั้นตอนเปิดใช้งานใน 3 นาที:</span>
                            <ul className="text-xs text-slate-400 space-y-2 list-decimal list-inside leading-relaxed font-light">
                              <li>สร้างโปรเจกต์ผู้ใช้ที่ <a href="https://developers.line.biz" target="_blank" rel="noreferrer" className="text-blue-400 underline hover:text-blue-300 transition-colors">LINE Developers Console</a></li>
                              <li>สร้างแชลแนลประเภท <strong className="text-slate-200 font-medium">Messaging API</strong></li>
                              <li>กดเปิดใช้งานคุณสมบัติบอท และสแกน QR Code เพื่อเพิ่มเพื่อนน้องบอทเข้าสู่ไลน์ของคุณ</li>
                              <li>คัดลอกรหัส <strong className="text-slate-200 font-medium">Channel Access Token</strong> และ <strong className="text-slate-200 font-medium">Your User ID</strong> นำมาบันทึกลงในฟิลด์ด้านบน</li>
                            </ul>
                          </div>

                          {/* Test Connection Button */}
                          <div className="pt-3">
                            <button
                              type="button"
                              disabled={lineTestLoading}
                              onClick={() => handleTestLineNotification()}
                              className="w-full bg-[#0a0a0f] border border-white/10 hover:border-emerald-500 hover:bg-emerald-500/5 text-white py-3 px-4 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                              {lineTestLoading ? (
                                <>
                                  <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                                  <span>กำลังร้องขอการเชื่อมต่อ LINE...</span>
                                </>
                              ) : (
                                <>
                                  <Send className="w-4 h-4 text-emerald-400" />
                                  <span>ส่งข้อความทดลองการแจ้งเตือนทันที (Test Connection)</span>
                                </>
                              )}
                            </button>

                            {lineTestResult && (
                              <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`mt-4 p-4 rounded-xl text-xs flex items-start gap-3 border ${
                                  lineTestResult.success
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                                }`}
                              >
                                {lineTestResult.success ? (
                                  <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
                                ) : (
                                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
                                )}
                                <div className="flex flex-col gap-1.5 flex-1">
                                  <span className="font-bold text-sm">
                                    {lineTestResult.success ? 'เชื่อมโยงระบบสำเร็จ!' : 'เชื่อมโยงไม่สำเร็จ'}
                                  </span>
                                  <p className="leading-relaxed opacity-90">{lineTestResult.message}</p>
                                  {!lineTestResult.success && (
                                    <div className="text-xs text-slate-400 border-t border-rose-500/10 pt-2.5 mt-1 leading-relaxed">
                                      💡 <strong>วิธีแก้ไข:</strong> หากระบบขึ้น Error โค้ด 404/400 หรือเชื่อมไม่ได้ กรุณากดปุ่ม <strong>รีเฟรชเบราว์เซอร์ของคุณ (F5)</strong> หรือปิดและเปิดแท็บเว็บนี้ใหม่อีกครั้ง เพื่ออัปเดตแคช API ของระบบเชื่อมต่อเซิร์ฟเวอร์หลังบ้านครับ
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </div>

                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <div className="text-center py-6 bg-slate-900/40 border border-dashed border-white/5 rounded-xl text-slate-500 text-xs">
                      กรุณากดสลับสวิตช์มุมขวาบนเพื่อเปิดใช้งานระบบการส่งแจ้งเตือน LINE
                    </div>
                  )}
                </div>

                {/* 3. Utilities Billing multipliers */}
                <div className="bg-white/[0.02] border border-white/5 backdrop-blur-md rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl hover:border-white/10 transition-all duration-300">
                  <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                    <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">ค่าสาธารณูปโภค & สัญญาค้ำประกัน</h3>
                      <p className="text-xs text-slate-500">อัตราค่าบริการบิลและสัญญาเช่ารายยูนิต</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-300 block">อัตราค่าไฟฟ้า (บาท / หน่วย)</label>
                      <input
                        id="settings-electricity-rate"
                        type="number"
                        value={settings.electricityUnitRate}
                        onChange={(e) => onUpdateSettings({ ...settings, electricityUnitRate: Number(e.target.value) })}
                        className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-300 block">อัตราค่าน้ำประปา (บาท / หน่วย)</label>
                      <input
                        id="settings-water-rate"
                        type="number"
                        value={settings.waterUnitRate}
                        onChange={(e) => onUpdateSettings({ ...settings, waterUnitRate: Number(e.target.value) })}
                        className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-300 block">ค่าบำรุงส่วนกลาง (บาท / เดือน)</label>
                      <input
                        id="settings-common-fee"
                        type="number"
                        value={settings.commonFee}
                        onChange={(e) => onUpdateSettings({ ...settings, commonFee: Number(e.target.value) })}
                        className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-300 block">อัตราการเก็บมัดจำจองห้องพัก</label>
                      <select
                        id="settings-deposit-multiplier"
                        value={settings.securityDepositMultiplier}
                        onChange={(e) => onUpdateSettings({ ...settings, securityDepositMultiplier: Number(e.target.value) })}
                        className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 text-white cursor-pointer"
                      >
                        <option value={1}>มัดจำ 1 เดือน (เท่ากับอัตราค่าเช่า)</option>
                        <option value={2}>มัดจำ 2 เดือน (สัญญาความปลอดภัยสูง)</option>
                      </select>
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Column: Premium Interactive Smartphone Live LINE Simulator */}
              <div className="lg:col-span-5 sticky top-24 self-start space-y-6">
                <div className="text-center lg:text-left">
                  <h3 className="text-sm font-bold text-slate-300 block tracking-widest uppercase mb-1 font-mono">
                    📱 LINE LIVE SIMULATOR
                  </h3>
                  <p className="text-xs text-slate-500">
                    จำลองมุมมองสลิปการแจ้งเตือนจริงบนแอปพลิเคชัน LINE บนมือถือของท่าน
                  </p>
                </div>

                {/* Simulated Tabs Selector (Awwwards Style) */}
                <div className="flex bg-[#0a0a0f] border border-white/5 rounded-2xl p-1 gap-1 shadow-inner select-none">
                  {[
                    { id: 'booking', label: 'จองห้องพัก' },
                    { id: 'invoice', label: 'บิลรายงวด' },
                    { id: 'payment', label: 'รับยอดเงิน' },
                    { id: 'status', label: 'ผู้เช่าเช็คอิน' }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSimActiveTab(tab.id as any)}
                      className={`flex-1 text-[10px] sm:text-[11px] font-bold py-2 px-1 rounded-xl transition-all duration-300 cursor-pointer ${
                        simActiveTab === tab.id
                          ? 'bg-gradient-to-tr from-emerald-500/15 to-teal-500/15 text-emerald-400 border border-emerald-500/20'
                          : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="bg-[#121217] border border-white/10 rounded-[40px] p-4.5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] w-full max-w-[340px] mx-auto aspect-[9/18.5] flex flex-col relative overflow-hidden backdrop-blur-xl">
                  {/* Speaker & Dynamic Island notch */}
                  <div className="absolute top-3.5 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-full z-20 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-[#1e1e24] rounded-full absolute left-5" />
                    <div className="w-14 h-1 bg-slate-900 rounded-full" />
                  </div>

                  {/* Top Mobile Status Indicators */}
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono px-4 pt-3.5 pb-2.5 z-10 select-none">
                    <span className="font-medium">09:41</span>
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 fill-slate-400" viewBox="0 0 24 24">
                        <path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 19.4c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l1.9-1.9C9.22 19.58 10.57 20 12 20c4.97 0 9-4.03 9-9s-4.03-9-9-9zm0 15c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z"/>
                      </svg>
                      <span className="font-bold text-[9px]">5G</span>
                      <div className="w-5.5 h-2.8 border border-slate-600 rounded px-0.5 flex items-center">
                        <div className="w-3.5 h-1.6 bg-slate-400 rounded-2xs" />
                      </div>
                    </div>
                  </div>

                  {/* LINE Chat App Header */}
                  <div className="bg-[#1e2029] border-b border-black/20 px-3.5 py-3 flex items-center gap-2.5 select-none rounded-t-2xl">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-xs font-bold text-white shadow-md shadow-emerald-950/30">
                      DB
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-1">
                        <span className="font-extrabold text-xs text-white leading-none">DormyBot (LINE Bot)</span>
                        <span className="bg-emerald-500 text-slate-950 font-bold text-[8px] px-1 py-0.2 rounded-sm uppercase tracking-wider font-mono">บอท</span>
                      </div>
                      <span className="text-[9px] text-emerald-400 block leading-none mt-1">กำลังทำงาน ● Online</span>
                    </div>
                    <div className="flex gap-2 text-slate-400">
                      <svg className="w-4 h-4 hover:text-white transition-colors cursor-pointer" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <svg className="w-4 h-4 hover:text-white transition-colors cursor-pointer" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    </div>
                  </div>

                  {/* Simulated Conversation Message Area */}
                  <div className="flex-1 bg-[#16171d] p-3 overflow-y-auto space-y-4 font-sans text-xs scrollbar-none max-h-[380px]">
                    <div className="text-[9px] text-slate-600 text-center select-none font-mono tracking-wider">TODAY</div>
                    
                    {/* Bot profile bubble */}
                    <div className="flex items-start gap-1.5">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-[9px] font-bold text-white shrink-0 shadow-md">
                        DB
                      </div>
                      <div className="space-y-1 max-w-[88%] flex-1">
                        <span className="text-[9px] text-slate-500 block">DormyBot AI</span>
                        
                        {/* Live Message bubble */}
                        <div className="bg-[#1e202a] border border-white/5 text-slate-200 p-3 rounded-xl rounded-tl-none shadow-md font-mono whitespace-pre-wrap text-[9px] leading-relaxed relative font-light">
                          <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-emerald-500/20 animate-ping m-1.5" />
                          
                          {/* Live preview formatted content */}
                          {simActiveTab === 'booking' && (
                            <div className="text-white">
                              <span className="text-emerald-400 font-bold block mb-1">✨ [{settings.propertyName || 'DORMYHUB'} - จองใหม่]</span>
                              ──────────────────<br/>
                              รหัสการจอง: <span className="text-brand-400 font-bold">BK-729481</span><br/>
                              ห้องพัก: Room 101 (Deluxe)<br/>
                              ประเภท: รายเดือน (Monthly)<br/>
                              ──────────────────<br/>
                              👤 ผู้จอง: คุณ สมชาย รักดี<br/>
                              📞 เบอร์โทร: 081-234-5678<br/>
                              📅 เช็คอิน: 01/10/2026<br/>
                              📅 เช็คเอาท์: 01/11/2026<br/>
                              ──────────────────<br/>
                              💰 มัดจำ: <span className="text-amber-400 font-bold">฿{(5500 * (settings.securityDepositMultiplier || 1)).toLocaleString()} บาท</span><br/>
                              ⏳ สถานะ: <span className="text-yellow-400 font-medium">รอเช็คอินเข้าพัก ⏳</span>
                            </div>
                          )}

                          {simActiveTab === 'invoice' && (
                            <div className="text-white text-[8.5px] leading-tight">
                              <span className="text-emerald-400 font-bold block mb-1">📝 [{settings.propertyName || 'DORMYHUB'} - ใบแจ้งหนี้]</span>
                              ──────────────────<br/>
                              ห้องพัก: Room 101<br/>
                              ประจำงวด: {selectedBillingMonth || 'มิถุนายน 2569'}<br/>
                              ──────────────────<br/>
                              🔌 <span className="text-amber-300 font-medium">ค่าไฟฟ้า (Electricity)</span><br/>
                              &nbsp;&nbsp;• มิเตอร์: 1200 → 1350 kWh<br/>
                              &nbsp;&nbsp;• ยอดใช้: 150 หน่วย (* {settings.electricityUnitRate} บ.)<br/>
                              &nbsp;&nbsp;• รวมเงิน: ฿{(150 * settings.electricityUnitRate).toLocaleString()} บ.<br/>
                              💧 <span className="text-sky-300 font-medium">ค่าน้ำประปา (Water)</span><br/>
                              &nbsp;&nbsp;• มิเตอร์: 450 → 465 m³<br/>
                              &nbsp;&nbsp;• ยอดใช้: 15 หน่วย (* {settings.waterUnitRate} บ.)<br/>
                              &nbsp;&nbsp;• รวมเงิน: ฿{(15 * settings.waterUnitRate).toLocaleString()} บ.<br/>
                              🏢 ส่วนกลาง: ฿{settings.commonFee.toLocaleString()} บ.<br/>
                              ──────────────────<br/>
                              💰 ยอดรวม: <span className="text-emerald-400 font-extrabold text-xs">฿{((150 * settings.electricityUnitRate) + (15 * settings.waterUnitRate) + settings.commonFee).toLocaleString()} บาท</span><br/>
                              ⏳ สถานะ: <span className="text-rose-400 font-medium">รอการชำระเงิน ⏳</span>
                            </div>
                          )}

                          {simActiveTab === 'payment' && (
                            <div className="text-white">
                              <span className="text-emerald-400 font-bold block mb-1">✅ [{settings.propertyName || 'DORMYHUB'} - รับชำระ]</span>
                              ──────────────────<br/>
                              ห้องพัก: Room 101<br/>
                              ประจำงวด: {selectedBillingMonth || 'มิถุนายน 2569'}<br/>
                              ──────────────────<br/>
                              💰 ยอดชำระ: <span className="text-emerald-400 font-bold">฿{((150 * settings.electricityUnitRate) + (15 * settings.waterUnitRate) + settings.commonFee).toLocaleString()} บาท</span><br/>
                              📅 วันที่ชำระ: {new Date().toLocaleDateString('th-TH')}<br/>
                              📋 สถานะ: <span className="text-emerald-400 font-medium">ชำระสำเร็จเรียบร้อย</span><br/>
                              ──────────────────<br/>
                              ทางหอพัก {settings.propertyName || 'DORMYHUB'} ได้รับยอดเงินแล้ว ขอบคุณครับ 🙏✨
                            </div>
                          )}

                          {simActiveTab === 'status' && (
                            <div className="text-white">
                              <span className="text-emerald-400 font-bold block mb-1">⚙️ [{settings.propertyName || 'DORMYHUB'} - สถานะผู้เช่า]</span>
                              ──────────────────<br/>
                              ห้องพัก: Room 101<br/>
                              ผู้เช่า: คุณ สมชาย รักดี<br/>
                              ──────────────────<br/>
                              🛎️ สถานะใหม่: <span className="text-brand-400 font-bold">เช็คอิน (Check-in) 🛎️</span><br/>
                              📅 เมื่อ: {new Date().toLocaleDateString('th-TH')}<br/>
                              ──────────────────<br/>
                              ยินดีต้อนรับสู่หอพักครับ หากต้องการติดต่อสามารถแอดมินได้ตลอดเวลา 😊
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Hint badge inside phone */}
                    <div className="bg-slate-900/60 border border-white/5 rounded-lg p-2 text-[8.5px] text-slate-400 select-none leading-normal">
                      💡 เมื่อเชื่อมต่อ API ระบบจะส่งข้อความสไตล์พรีเมียมแบบนี้เข้าห้องแชท LINE จริงทันที!
                    </div>

                  </div>

                  {/* Keyboard input area mockup */}
                  <div className="bg-[#1e2029] p-2 rounded-b-2xl border-t border-black/10 flex items-center gap-2 select-none">
                    <div className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-[10px] cursor-not-allowed">+</div>
                    <div className="flex-1 bg-[#14151b] rounded-full py-1 px-3 text-[9px] text-slate-500 font-light border border-white/5">
                      ส่งข้อความแชทหาบอท...
                    </div>
                    <svg className="w-4 h-4 text-emerald-500 cursor-not-allowed" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>

                {/* Instant Send Simulated Message over LINE Real API Button */}
                {settings.lineNotificationEnabled && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      const msgText = getSimulatedMessageText(simActiveTab);
                      handleTestLineNotification(msgText);
                    }}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs py-3.5 px-5 rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/10 transition-all duration-300"
                  >
                    <Send className="w-4 h-4" />
                    ส่งสลิป &quot;{simActiveTab === 'booking' ? 'จองใหม่' : simActiveTab === 'invoice' ? 'ใบแจ้งหนี้' : simActiveTab === 'payment' ? 'ชำระเงิน' : 'อัปเดตสถานะ'}&quot; ทดสอบไปยังไลน์จริง ⚡
                  </motion.button>
                )}

                {/* Info Tip badge card */}
                <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 p-5 rounded-2xl text-xs flex gap-3 shadow-md">
                  <HelpCircle className="w-5 h-5 shrink-0 text-blue-300 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-extrabold text-white block">ℹ️ ความปลอดภัยข้อมูล (Credential Security)</span>
                    <p className="leading-relaxed text-slate-400">
                      โทเค็น LINE Messaging API ของท่านจะถูกเก็บบันทึกบนพื้นที่เข้ารหัสเฉพาะสำหรับเบราว์เซอร์ของท่าน (Local Sandboxed Storage) มั่นใจได้ว่าไม่มีการรั่วไหลออกสู่สาธารณะอย่างแน่นอน
                    </p>
                  </div>
                </div>

              </div>

            </div>
          </motion.div>
        )}

        {/* TAB: MAINTENANCE MANAGEMENT */}
        {activeTab === 'maintenance' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-extrabold text-white tracking-tight">🔧 จัดการรายการแจ้งซ่อมและร้องเรียน</h1>
                <p className="text-slate-400 text-sm mt-1">รับเรื่องร้องเรียน ตรวจสอบภาพถ่ายประสานงาน และตอบกลับสถานะผู้เช่าพร้อมส่งอัปเดตไป LINE API</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="bg-amber-500/10 border border-amber-500/20 text-amber-300 font-bold text-xs px-3 py-1.5 rounded-xl">
                  เรื่องรอแก้ไข {tickets.filter(t => t.status !== 'Resolved').length} รายการ
                </span>
              </div>
            </div>

            {/* Tickets Table / List Layout */}
            {tickets.length === 0 ? (
              <div className="bg-[#121216]/90 p-12 rounded-3xl border border-white/10 text-center text-slate-500">
                <Wrench className="w-12 h-12 mx-auto text-slate-700 mb-3 animate-pulse" />
                <h3 className="text-base font-bold text-slate-300">ยังไม่มีรายงานการแจ้งเรื่องชำรุด</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto font-light">เมื่อผู้พักอาศัยแจ้งเรื่องผ่านทางหน้าระบบ แชทจะขึ้นที่นี่โดยอัตโนมัติพร้อมส่งแจ้งเตือนบอท LINE</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Left side: List of active and past tickets */}
                <div className="xl:col-span-2 space-y-4">
                  <div className="bg-[#121216]/90 rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
                    <div className="px-6 py-5 border-b border-white/10 bg-[#0a0a0c]/60 flex justify-between items-center">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>📋 รายการร้องเรียนทั้งหมด ({tickets.length} เรื่อง)</span>
                      </h3>
                    </div>

                    <div className="divide-y divide-white/5 max-h-[70vh] overflow-y-auto">
                      {tickets.slice().reverse().map((tc) => {
                        return (
                          <div
                            key={tc.id}
                            className="p-6 hover:bg-white/[0.02] transition-colors flex flex-col md:flex-row md:items-start justify-between gap-4"
                          >
                            <div className="space-y-3 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="bg-slate-800 text-white font-extrabold text-xs px-2.5 py-1 rounded-lg border border-slate-700">
                                  ห้อง {tc.roomNumber}
                                </span>
                                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                                  tc.urgency === 'high' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                  tc.urgency === 'medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                  'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                }`}>
                                  {tc.urgency === 'high' ? '🔴 ด่วนมาก' : tc.urgency === 'medium' ? '🟡 ปานกลาง' : '🟢 ต่ำ'}
                                </span>
                                <span className="text-xxs text-slate-500 font-mono">
                                  ID: {tc.id} | วันที่แจ้ง: {new Date(tc.createdAt).toLocaleDateString('th-TH')} {new Date(tc.createdAt).toLocaleTimeString('th-TH')}
                                </span>
                              </div>

                              <div>
                                <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wide flex items-center gap-2">
                                  <span>หมวดหมู่: {
                                    tc.category === 'aircon' ? '💨 เครื่องปรับอากาศ' :
                                    tc.category === 'plumbing' ? '💧 ท่อน้ำ/สุขภัณฑ์' :
                                    tc.category === 'electricity' ? '🔌 อุปกรณ์ไฟฟ้า' :
                                    tc.category === 'furniture' ? '🪑 เฟอร์นิเจอร์' : '📦 ทั่วไป/อื่นๆ'
                                  }</span>
                                </h4>
                                <p className="text-slate-400 text-xs font-light mt-1.5 leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-white/5">
                                  {tc.description}
                                </p>
                              </div>

                              {tc.photo && (
                                <div className="mt-2">
                                  <a
                                    href={tc.photo}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 text-brand-400 hover:text-brand-300 text-xxs font-medium"
                                  >
                                    <ImageIcon className="w-3.5 h-3.5" />
                                    <span>คลิกเพื่อดูรูปภาพแนบของผู้พักอาศัย 📸</span>
                                  </a>
                                </div>
                              )}

                              <div className="grid grid-cols-2 gap-4 text-xxs text-slate-500 pt-1">
                                <div>👤 ชื่อผู้แจ้ง: <span className="text-slate-300 font-semibold">{tc.guestName}</span></div>
                                <div>📞 เบอร์ติดต่อ: <span className="text-slate-300 font-semibold font-mono">{tc.guestPhone}</span></div>
                              </div>

                              {tc.adminNotes && (
                                <div className="bg-[#121216] border border-white/10 rounded-xl p-3 text-xxs text-left">
                                  <span className="font-extrabold text-amber-400 block mb-1">💬 โน้ตความคืบหน้าจากฝ่ายอาคาร:</span>
                                  <p className="text-slate-300 font-light leading-relaxed">{tc.adminNotes}</p>
                                </div>
                              )}
                            </div>

                            {/* Ticket Action states */}
                            <div className="shrink-0 flex flex-col items-start md:items-end gap-3 justify-between">
                              <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold border uppercase tracking-wider ${
                                tc.status === 'Resolved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                tc.status === 'In Progress' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              }`}>
                                {tc.status === 'Resolved' ? '🟢 ซ่อมแซมเสร็จสิ้น' :
                                 tc.status === 'In Progress' ? '🔵 กำลังดำเนินการ' :
                                 '⏳ รอเข้าดำเนินการ'}
                              </span>

                              <div className="flex flex-row md:flex-col gap-1.5 w-full">
                                {tc.status !== 'In Progress' && tc.status !== 'Resolved' && (
                                  <button
                                    onClick={() => handleUpdateTicketStatus(tc.id, 'In Progress', 'ได้รับเรื่องเรียบร้อย และกำลังจัดส่งทีมช่างเทคนิคอาคารเข้าตรวจสอบ')}
                                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xxs transition-colors w-full cursor-pointer flex items-center justify-center gap-1"
                                  >
                                    <span>รับงาน & ซ่อม ⚙️</span>
                                  </button>
                                )}
                                {tc.status !== 'Resolved' && (
                                  <button
                                    onClick={() => {
                                      setClosingTicketId(tc.id);
                                      setTicketCloseNotes('ดำเนินการแก้ไขเรียบร้อยแล้ว');
                                    }}
                                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-extrabold text-xxs transition-colors w-full cursor-pointer flex items-center justify-center gap-1"
                                  >
                                    <span>ปิดงานแจ้งซ่อม ✅</span>
                                  </button>
                                )}
                                {tc.status === 'Resolved' && (
                                  <>
                                    {deleteConfirmTicketId === tc.id ? (
                                      <div className="flex items-center gap-1.5 bg-rose-500/5 border border-rose-500/25 p-1 rounded-xl animate-pulse w-full justify-center">
                                        <span className="text-[10px] text-rose-400 font-medium px-1">ยืนยันลบ?</span>
                                        <button
                                          onClick={() => {
                                            onUpdateTickets(tickets.filter(t => t.id !== tc.id));
                                            setDeleteConfirmTicketId(null);
                                          }}
                                          className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[10px] font-bold transition-all shadow-md shadow-rose-600/25 cursor-pointer"
                                        >
                                          ลบเลย
                                        </button>
                                        <button
                                          onClick={() => setDeleteConfirmTicketId(null)}
                                          className="p-1 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-md transition-colors cursor-pointer"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => setDeleteConfirmTicketId(tc.id)}
                                        className="px-3 py-1.5 rounded-lg bg-rose-950/20 hover:bg-rose-600/25 border border-rose-500/20 text-rose-400 hover:text-rose-300 font-bold text-xxs transition-all w-full cursor-pointer flex items-center justify-center gap-1"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                        <span>ลบรายการแจ้งซ่อม</span>
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right side: Instructions / Quick Simulation */}
                <div className="space-y-6">
                  <div className="bg-slate-900/60 p-6 rounded-3xl border border-white/5 space-y-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>อธิบายระบบงานซ่อมคู่กับ LINE API</span>
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed font-light">
                      ระบบนี้เชื่อมต่อกับ <strong>LINE Notify / LINE Messaging API</strong> ของฝ่ายจัดการอาคารโดยอัตโนมัติ:
                    </p>
                    <ul className="text-xxs text-slate-500 space-y-2 leading-relaxed text-left">
                      <li className="flex items-start gap-2">
                        <span className="text-amber-500">⚡</span>
                        <span><strong>เมื่อผู้เช่ากดแจ้งปัญหา:</strong> บอทจะทำการส่งข้อความด่วนแจ้งเตือนเข้าแชทช่างใน LINE ทันทีพร้อมเบอร์โทร</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-500">⚙️</span>
                        <span><strong>เมื่อแอดมินอัปเดตสถานะงาน:</strong> บอทจะทำการส่งอัปเดตตอบรับให้ผู้พักทราบเพื่อความพึงพอใจสูงสุด</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Custom Ticket Closure Modal */}
        <AnimatePresence>
          {closingTicketId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setClosingTicketId(null)}
                className="absolute inset-0 bg-[#060608]/80 backdrop-blur-md"
              />
              {/* Content Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-md bg-slate-950 border border-white/10 rounded-3xl p-6 shadow-2xl z-10 text-left overflow-hidden"
              >
                {/* Premium Glow effect */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
                  <Wrench className="w-6 h-6" />
                </div>

                <h3 className="text-lg font-bold text-white mb-2">สรุปรายงานการแจ้งซ่อม</h3>
                <p className="text-xs text-slate-400 font-light leading-relaxed mb-4">
                  ระบุรายละเอียดการซ่อมบำรุงหรือหมายเหตุช่าง เพื่อตอบกลับไปยังผู้เข้าพักและส่งแจ้งเตือนผ่านบอท LINE ทันที
                </p>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">บันทึกรายงานช่าง</label>
                    <textarea
                      value={ticketCloseNotes}
                      onChange={(e) => setTicketCloseNotes(e.target.value)}
                      placeholder="เช่น ดำเนินการเปลี่ยนอะไหล่ใหม่เรียบร้อยแล้ว..."
                      rows={3}
                      className="w-full bg-[#121216]/90 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 transition-colors resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setClosingTicketId(null)}
                    className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl font-bold text-xxs text-slate-300 transition-colors cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={() => {
                      if (closingTicketId) {
                        handleUpdateTicketStatus(closingTicketId, 'Resolved', ticketCloseNotes);
                      }
                      setClosingTicketId(null);
                    }}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 rounded-xl font-bold text-xxs shadow-lg shadow-emerald-600/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    เสร็จสิ้น & ปิดงาน
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* UPGRADE 4: Interactive Slip Verification Modal Overlay */}
        <AnimatePresence>
          {selectedSlipBooking && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#030304]/90 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#0b0b0e] border border-white/10 rounded-3xl w-full max-w-4xl h-[85vh] flex flex-col md:flex-row overflow-hidden shadow-[0_15px_50px_rgba(0,0,0,0.8)]"
              >
                {/* Left side: Slip image Interactive Viewer Canvas */}
                <div className="flex-1 bg-[#050507] p-6 flex flex-col relative border-b md:border-b-0 md:border-r border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xxs font-mono uppercase bg-brand-500/10 text-brand-400 border border-brand-500/20 px-2.5 py-1 rounded-lg">Interactive Canvas</span>
                    
                    {/* Controls Row */}
                    <div className="flex items-center gap-1 bg-slate-900/80 p-0.5 rounded-lg border border-white/5">
                      <button
                        type="button"
                        onClick={() => setSlipZoom(prev => Math.max(0.5, prev - 0.25))}
                        className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded transition-colors text-xs cursor-pointer"
                        title="Zoom Out"
                      >
                        ➖
                      </button>
                      <button
                        type="button"
                        onClick={() => setSlipZoom(prev => Math.min(3, prev + 0.25))}
                        className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded transition-colors text-xs cursor-pointer"
                        title="Zoom In"
                      >
                        ➕
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSlipZoom(1); setSlipRotation(0); }}
                        className="px-2 py-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded transition-colors text-xxs font-semibold cursor-pointer"
                        title="Reset View"
                      >
                        Reset (100%)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSlipRotation(prev => prev - 90)}
                        className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded transition-colors text-xs cursor-pointer"
                        title="Rotate Counter-Clockwise"
                      >
                        ↺
                      </button>
                      <button
                        type="button"
                        onClick={() => setSlipRotation(prev => prev + 90)}
                        className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded transition-colors text-xs cursor-pointer"
                        title="Rotate Clockwise"
                      >
                        ↻
                      </button>
                    </div>
                  </div>

                  {/* Canvas Stage */}
                  <div className="flex-1 relative rounded-2xl bg-black/40 border border-white/5 overflow-hidden flex items-center justify-center">
                    <div className="absolute top-2.5 right-2.5 z-10 text-[10px] bg-black/60 text-slate-400 px-2 py-1 rounded-md font-mono">
                      Scale: {Math.round(slipZoom * 100)}% | Rotation: {slipRotation}°
                    </div>
                    
                    <div className="w-full h-full flex items-center justify-center overflow-auto p-4">
                      <img
                        id="modal-slip-image"
                        src={selectedSlipBooking.slipImage}
                        alt="สลิปโอนเงิน"
                        className="max-h-full max-w-full object-contain shadow-2xl transition-all duration-300 select-none pointer-events-none"
                        style={{
                          transform: `scale(${slipZoom}) rotate(${slipRotation}deg)`
                        }}
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                </div>

                {/* Right side: Verification form and status controls */}
                <div className="w-full md:w-80 bg-[#0d0d12] p-6 flex flex-col justify-between overflow-y-auto">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-white">🔍 ยืนยันสลิปเข้าพัก</h3>
                      <button
                        type="button"
                        onClick={() => setSelectedSlipBooking(null)}
                        className="w-7 h-7 flex items-center justify-center bg-slate-900 border border-white/5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Metadata Card */}
                    <div className="bg-[#121216]/90 border border-white/5 p-4 rounded-xl space-y-3.5">
                      <div>
                        <span className="text-xxs text-slate-500 uppercase font-mono block">ผู้จอง / Guest</span>
                        <span className="text-sm font-bold text-white block mt-0.5">{selectedSlipBooking.guestName}</span>
                        <span className="text-xxs text-slate-400 font-mono block mt-0.5">📞 {selectedSlipBooking.guestPhone}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-xxs text-slate-500 uppercase font-mono block">ยูนิตห้อง</span>
                          <span className="text-xs font-bold text-white block mt-0.5">Room {selectedSlipBooking.roomNumber}</span>
                        </div>
                        <div>
                          <span className="text-xxs text-slate-500 uppercase font-mono block">ประเภทสิทธิ์</span>
                          <span className="text-xs font-bold text-brand-400 block mt-0.5">เช่า{selectedSlipBooking.bookingType === 'daily' ? 'รายวัน' : 'รายเดือน'}</span>
                        </div>
                      </div>

                      <div className="h-px bg-white/5" />

                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-400">ค่ามัดจำแรกเข้า:</span>
                          <span className="font-bold text-white">฿{selectedSlipBooking.depositPaid.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">ยอดรวมทั้งสิ้น:</span>
                          <span className="font-bold text-brand-400">฿{selectedSlipBooking.totalPrice.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Check list */}
                    <div className="space-y-2.5">
                      <h4 className="text-xxs text-slate-400 font-bold uppercase tracking-wider">📋 รายการตรวจสอบด้วยตนเอง</h4>
                      <div className="space-y-2">
                        {[
                          'ตรวจสอบยอดเงินโอนตรงตามเงื่อนไข',
                          'ตรวจสอบวันที่และเวลาบนสลิปถูกต้อง',
                          'มีเครื่องหมายเสร็จสมบูรณ์หรือลายน้ำธนาคาร',
                          'ชื่อบัญชีผู้รับเงินคือบัญชีอาคารหอพัก'
                        ].map((label, index) => (
                          <label key={index} className="flex items-start gap-2 text-xxs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer select-none">
                            <input
                              type="checkbox"
                              defaultChecked
                              className="w-3.5 h-3.5 rounded bg-slate-900 border-white/10 text-brand-500 focus:ring-0 mt-0.5 cursor-pointer"
                            />
                            <span>{label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="pt-4 border-t border-white/5 space-y-2">
                    {selectedSlipBooking.status === 'Pending' && (
                      <button
                        type="button"
                        onClick={() => {
                          // Approve Booking
                          handleBookingStatusChange(selectedSlipBooking.id, 'Active');
                          setSelectedSlipBooking(null);
                        }}
                        className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-brand-500/10 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        ✅ อนุมัติการชำระ & เช็คอิน
                      </button>
                    )}
                    
                    <button
                      type="button"
                      onClick={() => setSelectedSlipBooking(null)}
                      className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      ปิดหน้าจอตรวจสอบ
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </main>

    </div>
  );
}

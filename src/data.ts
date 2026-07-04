import { Room, Booking, UtilityInvoice, SystemSettings, MaintenanceTicket } from './types';

export const DEFAULT_SETTINGS: SystemSettings = {
  electricityUnitRate: 8, // 8 บาท/หน่วย
  waterUnitRate: 18,     // 18 บาท/หน่วย
  commonFee: 300,        // ค่าส่วนกลางรายเดือน
  securityDepositMultiplier: 1, // มัดจำ 1 เดือน
  propertyName: 'DORMYHUB',
  promptPayNumber: '089-123-4567',
  lineNotificationEnabled: false,
  lineTokenType: 'MessagingApi',
  lineNotifyToken: '',
  lineChannelAccessToken: '',
  lineUserId: '',
};

export const INITIAL_ROOMS: Room[] = [
  {
    id: 'room-101',
    number: '101',
    type: 'Standard',
    status: 'Available',
    dailyPrice: 550,
    monthlyPrice: 4200,
    amenities: ['เครื่องปรับอากาศ', 'อินเทอร์เน็ตไร้สาย (Wi-Fi)', 'เตียงเดี่ยวขนาดควีนไซส์', 'พัดลมเพดาน', 'ตู้เสื้อผ้า', 'ห้องน้ำในตัว'],
    description: 'ห้องพักระดับเริ่มต้น ตกแต่งสไตล์มินิมอล อบอุ่น มีระเบียงรับลมธรรมชาติ เหมาะสำหรับผู้ที่ต้องการความเงียบสงบในราคาสุดคุ้ม',
    image: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80',
    floor: 1,
    electricityMeter: 1240,
    waterMeter: 310,
  },
  {
    id: 'room-102',
    number: '102',
    type: 'Standard',
    status: 'Occupied',
    dailyPrice: 550,
    monthlyPrice: 4200,
    amenities: ['เครื่องปรับอากาศ', 'อินเทอร์เน็ตไร้สาย (Wi-Fi)', 'เตียงเดี่ยวขนาดควีนไซส์', 'เครื่องทำน้ำอุ่น', 'ตู้เสื้อผ้า', 'ตู้เย็นขนาดเล็ก'],
    description: 'ห้องพักมาตรฐานบนชั้น 1 เดินทางเข้าออกสะดวก มีสิ่งอำนวยความสะดวกครบครัน ตอบโจทย์ชีวิตวัยรุ่นและวัยทำงาน',
    image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80',
    floor: 1,
    electricityMeter: 2150,
    waterMeter: 485,
  },
  {
    id: 'room-201',
    number: '201',
    type: 'Deluxe',
    status: 'Available',
    dailyPrice: 850,
    monthlyPrice: 5500,
    amenities: ['เครื่องปรับอากาศ', 'อินเทอร์เน็ตความเร็วสูง', 'สมาร์ททีวี 43 นิ้ว', 'ตู้เย็น 2 ประตู', 'เตียงคิงไซส์ 6 ฟุต', 'ไมโครเวฟ', 'เครื่องทำน้ำอุ่น', 'โต๊ะทำงาน'],
    description: 'ห้องดีลักซ์สุดหรูที่อัปเกรดความกว้างขวางและเฟอร์นิเจอร์ระดับพรีเมียม โซฟานั่งเล่นสำหรับรับแขก และมุมโต๊ะทำงานส่วนตัวริมหน้าต่างบานใหญ่',
    image: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
    floor: 2,
    electricityMeter: 840,
    waterMeter: 120,
  },
  {
    id: 'room-202',
    number: '202',
    type: 'Deluxe',
    status: 'Occupied',
    dailyPrice: 850,
    monthlyPrice: 5500,
    amenities: ['เครื่องปรับอากาศ', 'อินเทอร์เน็ตความเร็วสูง', 'สมาร์ททีวี 43 นิ้ว', 'ตู้เย็น 2 ประตู', 'เตียงคู่ (Twin Beds)', 'ไมโครเวฟ', 'เครื่องทำน้ำอุ่น', 'ระเบียงส่วนตัวกว้างพิเศษ'],
    description: 'ห้องดีลักซ์แบบเตียงคู่ ตกแต่งสไตล์นอร์ดิกสบายตา พร้อมระบบระบายอากาศยอดเยี่ยม เหมาะสำหรับแชร์ร่วมกับเพื่อนหรือเพื่อนร่วมงาน',
    image: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80',
    floor: 2,
    electricityMeter: 3410,
    waterMeter: 765,
  },
  {
    id: 'room-301',
    number: '301',
    type: 'Suite',
    status: 'Available',
    dailyPrice: 1500,
    monthlyPrice: 9500,
    amenities: ['ห้องรับแขกแยกสัดส่วน', 'เครื่องปรับอากาศ 2 เครื่อง', 'สมาร์ททีวี 55 นิ้ว', 'ตู้เย็นพรีเมียม', 'อ่างอาบน้ำสไตล์โมเดิร์น', 'เครื่องล้างจาน', 'เตียงพรีเมียมคิงไซส์', 'ระบบประตูดิจิทัลล็อก'],
    description: 'สุดยอดห้องพักระดับเพนต์เฮาส์สวีท มีการแยกส่วนห้องนอนและห้องรับแขกอย่างเป็นสัดส่วน ตกแต่งด้วยลายหินอ่อนและสีกรอบทองสุดลักชัวรี อ่างอาบน้ำหรูเพื่อการพักผ่อนอย่างแท้จริง',
    image: 'https://images.unsplash.com/photo-1582719478250-c89cae4db85b?auto=format&fit=crop&w=800&q=80',
    floor: 3,
    electricityMeter: 510,
    waterMeter: 92,
  },
  {
    id: 'room-302',
    number: '302',
    type: 'Deluxe',
    status: 'Maintenance',
    dailyPrice: 1200,
    monthlyPrice: 8000,
    amenities: ['เครื่องปรับอากาศ', 'Wi-Fi ความเร็วสูง', 'อ่างอาบน้ำ', 'สมาร์ททีวี', 'ตู้เย็น'],
    description: 'อยู่ระหว่างการปรับปรุงระบบเครื่องปรับอากาศและเปลี่ยนวอลเปเปอร์ชุดใหม่ชั่วคราว เพื่อเตรียมต้อนรับผู้เช่าในสัปดาห์หน้า',
    image: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80',
    floor: 3,
    electricityMeter: 1980,
    waterMeter: 410,
  }
];

export const INITIAL_BOOKINGS: Booking[] = [
  {
    id: 'book-1',
    roomId: 'room-102',
    roomNumber: '102',
    guestName: 'ศรัณย์ แซ่ตั้ง',
    guestPhone: '081-234-5678',
    guestEmail: 'saran.s@gmail.com',
    checkInDate: '2026-06-01',
    checkOutDate: '2027-06-01',
    bookingType: 'monthly',
    status: 'Active',
    totalPrice: 4200,
    depositPaid: 4200,
    createdAt: '2026-05-28T10:30:00Z',
  },
  {
    id: 'book-2',
    roomId: 'room-202',
    roomNumber: '202',
    guestName: 'ดร. นภัสสร แก้วมณี',
    guestPhone: '089-987-6543',
    guestEmail: 'napassorn.k@outlook.com',
    checkInDate: '2026-04-15',
    checkOutDate: '2026-10-15',
    bookingType: 'monthly',
    status: 'Active',
    totalPrice: 5500,
    depositPaid: 5500,
    createdAt: '2026-04-10T14:15:00Z',
  },
  {
    id: 'book-3',
    roomId: 'room-201',
    roomNumber: '201',
    guestName: 'วิศรุต อนันตศิลป์',
    guestPhone: '085-555-1234',
    guestEmail: 'wissarut.a@live.com',
    checkInDate: '2026-06-25',
    checkOutDate: '2026-06-28',
    bookingType: 'daily',
    status: 'Active',
    totalPrice: 2550, // 3 คืน * 850
    depositPaid: 0,
    createdAt: '2026-06-20T08:00:00Z',
  },
  {
    id: 'book-4',
    roomId: 'room-101',
    roomNumber: '101',
    guestName: 'พิชญุตม์ ธาราวรรณ',
    guestPhone: '092-444-5555',
    guestEmail: 'pitchayut.t@gmail.com',
    checkInDate: '2026-06-15',
    checkOutDate: '2026-06-18',
    bookingType: 'daily',
    status: 'CheckedOut',
    totalPrice: 1650, // 3 คืน * 550
    depositPaid: 0,
    createdAt: '2026-06-12T11:45:00Z',
  }
];

export const INITIAL_INVOICES: UtilityInvoice[] = [
  {
    id: 'inv-102-05',
    roomId: 'room-102',
    roomNumber: '102',
    billingMonth: 'พฤษภาคม 2569',
    prevElectricity: 2010,
    currElectricity: 2150, // ใช้ไป 140 หน่วย
    prevWater: 472,
    currWater: 485, // ใช้ไป 13 หน่วย
    electricityUnitRate: 8,
    waterUnitRate: 18,
    electricityCost: 1120, // 140 * 8
    waterCost: 234,        // 13 * 18
    commonFee: 300,
    totalCost: 1654,
    status: 'Paid',
    issueDate: '2026-05-31',
    paidDate: '2026-06-03',
  },
  {
    id: 'inv-202-05',
    roomId: 'room-202',
    roomNumber: '202',
    billingMonth: 'พฤษภาคม 2569',
    prevElectricity: 3220,
    currElectricity: 3410, // ใช้ไป 190 หน่วย
    prevWater: 748,
    currWater: 765, // ใช้ไป 17 หน่วย
    electricityUnitRate: 8,
    waterUnitRate: 18,
    electricityCost: 1520, // 190 * 8
    waterCost: 306,        // 17 * 18
    commonFee: 300,
    totalCost: 2126,
    status: 'Unpaid',
    issueDate: '2026-05-31',
  }
];

export const INITIAL_TICKETS: MaintenanceTicket[] = [
  {
    id: 'TC-2819',
    roomId: 'room-102',
    roomNumber: '102',
    guestName: 'ศรัณย์ แซ่ตั้ง',
    guestPhone: '081-234-5678',
    category: 'aircon',
    urgency: 'medium',
    description: 'เครื่องปรับอากาศมีลมร้อนสลับเย็น และมีเสียงดังผิดปกติขณะทำงาน คาดว่าน้ำยาแอร์อาจจะรั่วหรือต้องการล้างทำความสะอาดแอร์ด่วนครับ',
    status: 'In Progress',
    createdAt: '2026-06-29T11:00:00Z',
    photo: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=400&q=80',
    adminNotes: 'ช่างนัดหมายเข้าตรวจสอบวันศุกร์นี้ เวลา 10:00 น.'
  },
  {
    id: 'TC-1102',
    roomId: 'room-202',
    roomNumber: '202',
    guestName: 'ดร. นภัสสร แก้วมณี',
    guestPhone: '089-987-6543',
    category: 'plumbing',
    urgency: 'high',
    description: 'ก๊อกน้ำในห้องน้ำมีน้ำรั่วซึมตลอดเวลา ทำให้พื้นเปียกตลอดวันและเสียงดังรบกวนเวลานอนค่ะ รบกวนส่งช่างมาแก้ไขด่วนที่สุดค่ะ',
    status: 'Pending',
    createdAt: '2026-07-01T08:30:00Z',
    photo: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=400&q=80'
  }
];


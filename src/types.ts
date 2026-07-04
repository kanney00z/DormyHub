export interface Room {
  id: string;
  number: string;
  type: 'Standard' | 'Deluxe' | 'Suite' | 'Family';
  status: 'Available' | 'Occupied' | 'Maintenance';
  dailyPrice: number;
  monthlyPrice: number;
  amenities: string[];
  description: string;
  image: string;
  floor: number;
  electricityMeter: number; // Last recorded kWh meter reading
  waterMeter: number;       // Last recorded m3 water meter reading
}

export interface Booking {
  id: string;
  roomId: string;
  roomNumber: string;
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  guestLine?: string;
  checkInDate: string;
  checkOutDate: string;
  bookingType: 'daily' | 'monthly';
  status: 'Pending' | 'Active' | 'CheckedOut' | 'Cancelled';
  totalPrice: number;
  depositPaid: number; // Deposit for monthly, e.g. 1 month rent
  createdAt: string;
  paymentMethod?: 'Cash' | 'PromptPay';
  slipImage?: string;
}

export interface UtilityInvoice {
  id: string;
  roomId: string;
  roomNumber: string;
  billingMonth: string; // e.g., "มิถุนายน 2569"
  prevElectricity: number;
  currElectricity: number;
  prevWater: number;
  currWater: number;
  electricityUnitRate: number;
  waterUnitRate: number;
  electricityCost: number;
  waterCost: number;
  commonFee: number;
  totalCost: number;
  status: 'Unpaid' | 'Paid';
  issueDate: string;
  paidDate?: string;
}

export interface SystemSettings {
  electricityUnitRate: number; // e.g. 8 Baht/unit
  waterUnitRate: number;       // e.g. 18 Baht/unit
  commonFee: number;          // e.g. 300 Baht/month
  securityDepositMultiplier: number; // e.g. 1 (1 month rent deposit)
  propertyName?: string;
  promptPayNumber?: string;
  lineNotificationEnabled?: boolean;
  lineTokenType?: 'Notify' | 'MessagingApi';
  lineNotifyToken?: string;
  lineChannelAccessToken?: string;
  lineUserId?: string;
}

export interface MaintenanceTicket {
  id: string;
  roomId: string;
  roomNumber: string;
  guestName: string;
  guestPhone: string;
  category: 'aircon' | 'plumbing' | 'electricity' | 'furniture' | 'other';
  urgency: 'low' | 'medium' | 'high';
  description: string;
  status: 'Pending' | 'In Progress' | 'Resolved';
  createdAt: string;
  resolvedAt?: string;
  photo?: string;
  adminNotes?: string;
}

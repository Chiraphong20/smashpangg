export type Rank = 
  | 'VIP1' | 'VIP2' | 'VIP3' 
  | 'BG1' | 'BG2' | 'BG3' 
  | 'S-1' | 'S-2' | 'S-3' 
  | 'S1' | 'S2' | 'S3' 
  | 'P-' | 'P' | 'P+';

export interface Member {
  id: string;
  name: string;
  rank: Rank;
  gamesPlayed: number;
  checkInTime: number;
  status: 'waiting' | 'playing' | 'resting' | 'away' | 'paid';
  balance: number;       // รวมทั้งหมด
  courtBalance: number;  // ค่าสนาม
  shuttleBalance: number;// ค่าลูก
  shuttleCount: number;  // จำนวนลูก
  snackBalance: number;  // ค่าน้ำ/ขนมรวม
  snackHistory: Array<{ id: string; name: string; price: number; time: number }>; // ประวัติการซื้อสินค้า
  paidCourtFee: boolean;
}

export interface Court {
  id: string;
  name: string;
  players: (string | null)[];
  status: 'empty' | 'active';
  startTime?: number;
  shuttlecocks: number;
}

export interface Snack {
  id: string;
  name: string;
  price: number;
  icon: string;
}

export interface GameRecord {
  id: string;
  courtId: string;
  courtName: string;
  playedAt: number;
  players: Array<{ id: string; name: string; rank: Rank }>;
  shuttlesUsed: number;
  shuttleCostPerPerson: number;
  courtFeePerPerson: number; // 0 ถ้าเจ้าตัวเคยจ่ายแล้ว
}

export interface PaymentRecord {
  id: string;
  memberId: string;
  memberName: string;
  memberRank: Rank;
  amount: number;
  timestamp: number;
  method: string;
  note?: string;
}

export interface SessionRecord {
  id: string;
  date: number;
  gameHistory: GameRecord[];
  paymentHistory: PaymentRecord[];
  membersSnapshot: Member[];
}

export const RANKS: Rank[] = [
  'VIP1', 'VIP2', 'VIP3',
  'BG1', 'BG2', 'BG3',
  'S-1', 'S-2', 'S-3',
  'S1', 'S2', 'S3',
  'P-', 'P', 'P+'
];

export const RANK_LEVEL_LABELS: Record<Rank, string> = {
  'VIP1': 'อาชีพ (1)', 'VIP2': 'อาชีพ (2)', 'VIP3': 'อาชีพ (3)',
  'BG1': 'สูงมาก (1)', 'BG2': 'สูงมาก (2)', 'BG3': 'สูงมาก (3)',
  'S-1': 'สูง (-) (1)', 'S-2': 'สูง (-) (2)', 'S-3': 'สูง (-) (3)',
  'S1': 'กลาง-สูง (1)', 'S2': 'กลาง-สูง (2)', 'S3': 'กลาง-สูง (3)',
  'P-': 'ต้น-กลาง',
  'P': 'ต้น',
  'P+': 'มือใหม่',
};

export const RANK_COLORS: Record<Rank, string> = {
  'VIP1': 'bg-error text-white',
  'VIP2': 'bg-error text-white',
  'VIP3': 'bg-error text-white',
  'BG1': 'bg-error text-white',
  'BG2': 'bg-error text-white',
  'BG3': 'bg-error text-white',
  'S-1': 'bg-secondary text-white',
  'S-2': 'bg-secondary text-white',
  'S-3': 'bg-secondary text-white',
  'S1': 'bg-secondary text-white',
  'S2': 'bg-secondary text-white',
  'S3': 'bg-secondary text-white',
  'P-': 'bg-tertiary text-white',
  'P': 'bg-tertiary text-white',
  'P+': 'bg-tertiary text-white',
};

export const RANK_WEIGHTS: Record<Rank, number> = {
  'VIP1': 15, 'VIP2': 14, 'VIP3': 13,
  'BG1': 12, 'BG2': 11, 'BG3': 10,
  'S-1': 9, 'S-2': 8, 'S-3': 7,
  'S1': 6, 'S2': 5, 'S3': 4,
  'P-': 3,
  'P': 2,
  'P+': 1,
};

export const DEFAULT_SNACKS: Snack[] = [
  { id: 'water', name: 'น้ำเปล่า', price: 10, icon: '💧' },
  { id: 'gatorade', name: 'เกเตอเรด', price: 25, icon: '⚡' },
  { id: 'shuttle', name: 'ลูกแบด', price: 25, icon: '🏸' },
  { id: 'snack', name: 'ขนม', price: 15, icon: '🍪' },
];

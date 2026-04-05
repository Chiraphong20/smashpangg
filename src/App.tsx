import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Users, LayoutDashboard, Trophy, Banknote, UserPlus, Search, ShoppingCart, History, FileText, ChevronLeft, ChevronRight, Menu, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { Member, Court, Rank, RANKS, RANK_COLORS, Snack, PaymentRecord, GameRecord, DEFAULT_SNACKS, SessionRecord } from './types';
import { format } from 'date-fns';
import confetti from 'canvas-confetti';

import { DashboardTab } from './components/DashboardTab';
import { CourtsTab } from './components/CourtsTab';
import { MembersTab } from './components/MembersTab';
import { SettingsTab } from './components/SettingsTab';
import { AddMemberModal } from './components/AddMemberModal';
import { AddCourtModal } from './components/AddCourtModal';
import { ManageProductsModal } from './components/ManageProductsModal';
import { ImportMembersModal } from './components/ImportMembersModal';
import { LogsTab } from './components/LogsTab';
import { RANK_WEIGHTS } from './types';

type Tab = 'dashboard' | 'members' | 'courts' | 'settings' | 'logs';

const mkMember = (id: string, name: string, rank: Rank, gamesPlayed: number, offset: number): Member => ({
  id, name, rank, gamesPlayed,
  checkInTime: Date.now() - offset,
  status: 'waiting',
  balance: 0, courtBalance: 0, shuttleBalance: 0, shuttleCount: 0, snackBalance: 0,
  snackHistory: [],
  paidCourtFee: false,
});

const INITIAL_MEMBERS: Member[] = [];

const INITIAL_COURTS: Court[] = [
  { id: 'c1', name: 'คอร์ด 1', players: [null, null, null, null], status: 'empty', shuttlecocks: 1 },
  { id: 'c2', name: 'คอร์ด 2', players: [null, null, null, null], status: 'empty', shuttlecocks: 1 },
  { id: 'c3', name: 'คอร์ด 3', players: [null, null, null, null], status: 'empty', shuttlecocks: 1 },
];

export default function App() {
  const [members, setMembers] = useState<Member[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [snacks, setSnacks] = useState<Snack[]>(DEFAULT_SNACKS);
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([]);
  const [gameHistory, setGameHistory] = useState<GameRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('courts');
  const [courtFeePerPerson, setCourtFeePerPerson] = useState(40);
  const [shuttlePrice, setShuttlePrice] = useState(25);
  const [minRankFilter, setMinRankFilter] = useState<Rank>('P+');
  const [maxRankFilter, setMaxRankFilter] = useState<Rank>('VIP1');
  const [sessionHistory, setSessionHistory] = useState<SessionRecord[]>([]);
  const [viewingSession, setViewingSession] = useState<SessionRecord | null>(null);
  const [googleSheetUrl, setGoogleSheetUrl] = useState('https://script.google.com/macros/s/AKfycbycTfnjCigRi9v22ik0inNDshlkEoXmQVcbwwgwGplDei7Ub3_CJvWQVY4HpiTCM3mQ/exec');
  const [isSyncing, setIsSyncing] = useState(false);
  const [rankMemory, setRankMemory] = useState<Record<string, Rank>>({});
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Modal states
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddCourt, setShowAddCourt] = useState(false);
  const [showManageProducts, setShowManageProducts] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importIsSession, setImportIsSession] = useState(false);

  // Sync state
  const [isAutoSync, setIsAutoSync] = useState(() => localStorage.getItem('smashit_autosync') === 'active');
  const [lastSyncTime, setLastSyncTime] = useState(Date.now());
  const [isPushing, setIsPushing] = useState(false);

  // Use a ref to track if a change was internal (to avoid infinite sync loops)
  const lastKnownRemoteState = useRef<string>('');

  // Load from localStorage
  useEffect(() => {
    const mems = localStorage.getItem('smashit_members');
    const crts = localStorage.getItem('smashit_courts');
    const hist = localStorage.getItem('smashit_history');
    const pays = localStorage.getItem('smashit_payments');
    const sessions = localStorage.getItem('smashit_sessions');
    const setting_fee = localStorage.getItem('smashit_fee');
    const setting_shuttle = localStorage.getItem('smashit_shuttle');

    if (mems) {
      const parsedMembers = JSON.parse(mems);
      const migratedMembers = parsedMembers.map((m: any) => ({
        ...m,
        snackHistory: m.snackHistory || []
      }));
      setMembers(migratedMembers);
    } else {
      setMembers(INITIAL_MEMBERS);
    }

    if (crts) setCourts(JSON.parse(crts));
    else setCourts(INITIAL_COURTS);

    if (pays) setPaymentHistory(JSON.parse(pays));
    if (sessions) setSessionHistory(JSON.parse(sessions));
    const gs_url = localStorage.getItem('smashit_gs_url');
    const r_mem = localStorage.getItem('smashit_rank_memory');
    if (gs_url) setGoogleSheetUrl(gs_url);
    if (r_mem) setRankMemory(JSON.parse(r_mem));
    if (setting_fee) setCourtFeePerPerson(Number(setting_fee));
    if (setting_shuttle) setShuttlePrice(Number(setting_shuttle));
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (members.length > 0) localStorage.setItem('smashit_members', JSON.stringify(members));
    if (courts.length > 0) localStorage.setItem('smashit_courts', JSON.stringify(courts));
    localStorage.setItem('smashit_history', JSON.stringify(gameHistory));
    localStorage.setItem('smashit_payments', JSON.stringify(paymentHistory));
    localStorage.setItem('smashit_sessions', JSON.stringify(sessionHistory));
    localStorage.setItem('smashit_fee', courtFeePerPerson.toString());
    localStorage.setItem('smashit_shuttle', shuttlePrice.toString());
    localStorage.setItem('smashit_gs_url', googleSheetUrl);
    localStorage.setItem('smashit_rank_memory', JSON.stringify(rankMemory));
  }, [members, courts, gameHistory, paymentHistory, sessionHistory, courtFeePerPerson, shuttlePrice, googleSheetUrl, rankMemory]);

  const resetDay = async () => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการเริ่มวันใหม่? (ล้างประวัติการตีและรีเซ็ตคอร์ด)')) return;
    saveSession();
    if (googleSheetUrl) {
      await syncToGoogleSheets();
    }
    setGameHistory([]);
    setPaymentHistory([]);
    setCourts(INITIAL_COURTS);
    setMembers(prev => prev.map(m => ({
      ...m,
      gamesPlayed: 0,
      balance: 0,
      courtBalance: 0,
      shuttleBalance: 0,
      shuttleCount: 0,
      snackBalance: 0,
      snackHistory: [],
      paidCourtFee: false,
      status: 'resting',
      checkInTime: Date.now()
    })));
  };

  const checkInMember = (memberId: string) => {
    setMembers(prev => prev.map(m => m.id === memberId 
      ? { ...m, status: 'waiting', checkInTime: Date.now() } 
      : m));
  };

  // --- REAL-TIME SYNC LOGIC ---
  const syncLiveCloud = async (action: 'push_live' | 'pull_live') => {
    if (!googleSheetUrl || !isAutoSync) return;
    
    try {
      if (action === 'push_live') {
        setIsPushing(true);
        const payload = {
          action: 'push_live',
          timestamp: Date.now(),
          data: {
            members,
            courts,
            snacks,
            paymentHistory,
            gameHistory,
            rankMemory,
            courtFeePerPerson,
            shuttlePrice
          }
        };
        await fetch(googleSheetUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        setLastSyncTime(Date.now());
      } else {
        // pull_live
        const res = await fetch(`${googleSheetUrl}?action=pull_live`);
        if (!res.ok) return;
        const result = await res.json();
        
        if (result && result.timestamp > lastSyncTime) {
          const { data } = result;
          if (data.members) setMembers(data.members);
          if (data.courts) setCourts(data.courts);
          if (data.snacks) setSnacks(data.snacks);
          if (data.paymentHistory) setPaymentHistory(data.paymentHistory);
          if (data.gameHistory) setGameHistory(data.gameHistory);
          if (data.rankMemory) setRankMemory(data.rankMemory);
          if (data.courtFeePerPerson) setCourtFeePerPerson(data.courtFeePerPerson);
          if (data.shuttlePrice) setShuttlePrice(data.shuttlePrice);
          setLastSyncTime(result.timestamp);
        }
      }
    } catch (err) {
      console.error('Sync error:', err);
    } finally {
      setIsPushing(false);
    }
  };

  // Auto-Pull Polling (Every 10 seconds)
  useEffect(() => {
    if (!isAutoSync || !googleSheetUrl) return;
    const interval = setInterval(() => {
      syncLiveCloud('pull_live');
    }, 10000);
    return () => clearInterval(interval);
  }, [isAutoSync, googleSheetUrl, lastSyncTime]);

  // Debounced Auto-Push (Trigger 3s after state changes)
  useEffect(() => {
    if (!isAutoSync || !googleSheetUrl) return;
    
    const handler = setTimeout(() => {
      // Only push if we aren't currently pulling or if we detect a local change
      // For simplicity, we just push every time state stabilizes
      syncLiveCloud('push_live');
    }, 3000);

    return () => clearTimeout(handler);
  }, [members, courts, snacks, paymentHistory, gameHistory, isAutoSync, googleSheetUrl]);

  const syncToGoogleSheets = async () => {
    if (!googleSheetUrl) return;
    setIsSyncing(true);
    try {
      const payload = {
        timestamp: new Date().toISOString(),
        members: members.map(m => ({
          name: m.name,
          rank: m.rank,
          games: m.gamesPlayed,
          court_fee: m.courtBalance,
          shuttle_fee: m.shuttleBalance,
          snack_fee: m.snackBalance,
          total: m.balance
        })),
        games: gameHistory.map(g => ({
          time: format(g.playedAt, 'HH:mm'),
          court: g.courtName,
          players: g.players.map(p => p.name).join(', '),
          shuttles: g.shuttlesUsed,
          cost_per_person: g.shuttleCostPerPerson
        })),
        payments: paymentHistory.map(p => ({
          time: format(p.timestamp, 'HH:mm'),
          member: p.memberName,
          amount: p.amount,
          method: p.method
        }))
      };

      await fetch(googleSheetUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      // Note: no-cors means we can't read the response, but it usually succeeds
    } catch (err) {
      console.error('GS Sync Error:', err);
      alert('ไม่สามารถส่งข้อมูลไปยัง Google Sheets ได้ โปรดตรวจสอบ Script URL');
    } finally {
      setIsSyncing(false);
    }
  };

  const pushMasterData = async (memberList?: Member[]) => {
    if (!googleSheetUrl) return;
    setIsSyncing(true);
    try {
      const payload = {
        action: 'push_master',
        members: memberList || members,
        rankMemory,
        settings: { courtFeePerPerson, shuttlePrice, googleSheetUrl }
      };
      await fetch(googleSheetUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!memberList) alert('สำรองข้อมูลสมาชิกและตั้งค่าขึ้น Cloud เรียบร้อยแล้ว!');
    } catch (err) {
      if (!memberList) alert('ไม่สามารถสำรองข้อมูลได้');
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  const removeFromSession = (memberId: string) => {
    setCourts(prev => prev.map(c => ({ ...c, players: c.players.map(p => p === memberId ? null : p) })));
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, status: 'resting' } : m));
  };

  const pullMasterData = async () => {
    if (!googleSheetUrl) return;
    setIsSyncing(true);
    try {
      // For Apps Script, we often need to use JSONP or specific URL params for GET
      // to avoid CORS preflight issues during development if not properly configured.
      const res = await fetch(`${googleSheetUrl}?action=pull_master`);
      const data = await res.json();
      if (data.rankMemory) setRankMemory(data.rankMemory);
      if (data.settings) {
        if (data.settings.courtFeePerPerson) setCourtFeePerPerson(data.settings.courtFeePerPerson);
        if (data.settings.shuttlePrice) setShuttlePrice(data.settings.shuttlePrice);
      }
      alert('โหลดข้อมูลจาก Cloud เรียบร้อย!');
    } catch (err) {
      console.error(err);
      alert('ไม่สามารถโหลดข้อมูลจาก Cloud ได้ (ตรวจสอบว่าคุณได้อัปเดตสคริปต์ใน Google Sheets หรือยัง)');
    } finally {
      setIsSyncing(false);
    }
  };

  const pullSessionData = async (date: string) => {
    if (!googleSheetUrl) return;
    setIsSyncing(true);
    try {
      const res = await fetch(`${googleSheetUrl}?action=pull_session&date=${date}`);
      if (!res.ok) throw new Error('Network response was not ok');
      const data = await res.json();
      
      // Handle response that might be from a sheet summary or a full record
      if (data && (data.date || data.timestamp)) {
        const timestamp = data.date || new Date(data.timestamp).getTime();
        
        // Helper to clean numeric values (remove currency symbols, commas, etc.)
        const cleanNum = (val: any) => {
          if (typeof val === 'number') return val;
          if (!val) return 0;
          const cleaned = String(val).replace(/[^0-9.-]/g, '');
          const n = parseFloat(cleaned);
          return isNaN(n) ? 0 : n;
        };

        const VALID_RANKS = ['VIP1', 'VIP2', 'VIP3', 'BG1', 'BG2', 'BG3', 'S-1', 'S-2', 'S-3', 'S1', 'S2', 'S3', 'P-', 'P', 'P+'];

        // Reconstruct members from simplified data if necessary
        const reconstructedMembers: Member[] = (data.membersSnapshot || data.members || [])
          .filter((m: any) => m.name && VALID_RANKS.includes(String(m.rank).toUpperCase().trim())) // Filter out headers/junk
          .map((m: any, i: number) => {
            const rank = String(m.rank).toUpperCase().trim() as Rank;
            return {
              id: m.id || `pulled-${date}-${i}`,
              name: m.name,
              rank: rank,
              gamesPlayed: cleanNum(m.gamesPlayed || m.games),
              checkInTime: timestamp,
              status: 'resting',
              balance: cleanNum(m.balance || m.total),
              courtBalance: cleanNum(m.courtBalance || m.court_fee),
              shuttleBalance: cleanNum(m.shuttleBalance || m.shuttle_fee),
              snackBalance: cleanNum(m.snackBalance || m.snack_fee),
              shuttleCount: cleanNum(m.shuttleCount),
              snackHistory: m.snackHistory || [],
              paidCourtFee: m.paidCourtFee || (cleanNum(m.court_fee || m.courtBalance) > 0)
            };
          });

        // Reconstruct games
        const reconstructedGames: GameRecord[] = (data.gameHistory || data.games || [])
          .filter((g: any) => g.time || g.playedAt) // Filter out junk rows
          .map((g: any, i: number) => ({
            id: g.id || `game-${date}-${i}`,
            courtId: g.courtId || 'c1',
            courtName: g.courtName || g.court || 'คอร์ด',
            playedAt: g.playedAt || timestamp,
            players: g.players && typeof g.players === 'string' 
              ? g.players.split(',').map((n: string) => ({ id: n.trim(), name: n.trim(), rank: 'P' }))
              : (g.players || []),
            shuttlesUsed: cleanNum(g.shuttlesUsed || g.shuttles),
            shuttleCostPerPerson: cleanNum(g.shuttleCostPerPerson || g.cost_per_person),
            courtFeePerPerson: cleanNum(g.courtFeePerPerson || 0)
          }));

        const session: SessionRecord = {
          id: data.id || `session-${date}`,
          date: timestamp,
          membersSnapshot: reconstructedMembers,
          gameHistory: reconstructedGames,
          paymentHistory: data.paymentHistory || data.payments || []
        };
        
        setSessionHistory(prev => {
          const filtered = prev.filter(s => format(s.date, 'yyyy-MM-dd') !== date);
          return [session, ...filtered];
        });
        setViewingSession(session);
        return session;
      } else {
        alert('ไม่พบข้อมูลสำหรับวันที่ ' + date + ' (หรือสคริปต์อาจยังคืนค่าไม่ถูกต้อง)');
      }
    } catch (err) {
      console.error('Pull Session Error:', err);
      alert('ไม่สามารถดึงข้อมูลได้: โปรดตรวจสอบว่าข้อมูลใน Sheet ของคุณมีอยู่จริงและ URL ถูกต้อง');
    } finally {
      setIsSyncing(false);
    }
  };



  const seedMockHistory = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(19, 0, 0, 0);

    const mockMembers: Member[] = [
      { id: 'mock-1', name: 'คุณสมชาย (ทดสอบ)', rank: 'S1', gamesPlayed: 4, checkInTime: yesterday.getTime(), status: 'resting', balance: 0, courtBalance: 160, shuttleBalance: 75, snackBalance: 20, shuttleCount: 3, snackHistory: [{ id: 's1', name: 'น้ำเปล่า', price: 20, time: yesterday.getTime() + 100000 }], paidCourtFee: true },
      { id: 'mock-2', name: 'คุณสมศรี (ทดสอบ)', rank: 'P', gamesPlayed: 2, checkInTime: yesterday.getTime(), status: 'resting', balance: 140, courtBalance: 80, shuttleBalance: 50, snackBalance: 10, shuttleCount: 2, snackHistory: [{ id: 's2', name: 'กล้วยทอด', price: 10, time: yesterday.getTime() + 200000 }], paidCourtFee: false }
    ];

    const mockGames: GameRecord[] = [
      { id: 'g-mock-1', courtId: 'c1', courtName: 'คอร์ด 1', playedAt: yesterday.getTime() + 3600000, players: [{ id: 'mock-1', name: 'คุณสมชาย (ทดสอบ)', rank: 'S1' }, { id: 'mock-2', name: 'คุณสมศรี (ทดสอบ)', rank: 'P' }], shuttlesUsed: 2, shuttleCostPerPerson: 25, courtFeePerPerson: 40 }
    ];

    const mockPayments: PaymentRecord[] = [
      { id: 'p-mock-1', memberId: 'mock-1', memberName: 'คุณสมชาย (ทดสอบ)', memberRank: 'S1', amount: 255, timestamp: yesterday.getTime() + 7200000, method: 'Cash', note: '4 เกม' }
    ];

    const newSession: SessionRecord = {
      id: `session-mock-${yesterday.getTime()}`,
      date: yesterday.getTime(),
      membersSnapshot: mockMembers,
      gameHistory: mockGames,
      paymentHistory: mockPayments
    };

    setSessionHistory(prev => [newSession, ...prev]);
    alert('สร้างข้อมูลจำลองของ "เมื่อวาน" เรียบร้อยแล้ว! \nตอนนี้คุณสามารถเลือกวันที่จากเมนูด้านบนเพื่อทดสอบปุ่ม "Sync Now" หรือดูข้อมูลย้อนหลังได้เลยครับ');
  };

  const saveSession = () => {
    if (gameHistory.length === 0 && paymentHistory.length === 0) return;
    const session: SessionRecord = {
      id: Math.random().toString(36).substr(2, 9),
      date: Date.now(),
      gameHistory: [...gameHistory],
      paymentHistory: [...paymentHistory],
      membersSnapshot: [...members]
    };
    setSessionHistory(prev => [session, ...prev]);
  };

  const factoryReset = () => {
    if (!confirm('!!! คำเตือน !!! คุณแน่ใจหรือไม่ว่าต้องการล้างข้อมูลทั้งหมด? ข้อมูลสมาชิกและประวัติทั้งหมดจะหายไป')) return;
    localStorage.clear();
    location.reload();
  };

  const getWaitingList = useMemo(() => {
    const minW = RANK_WEIGHTS[minRankFilter] || 0;
    const maxW = RANK_WEIGHTS[maxRankFilter] || 15;
    const lower = Math.min(minW, maxW);
    const upper = Math.max(minW, maxW);

    return members
      .filter(m => m.status === 'waiting')
      .filter(m => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return true;
        return m.name.toLowerCase().includes(query);
      })
      .filter(m => {
        const w = RANK_WEIGHTS[m.rank] || 0;
        return w >= lower && w <= upper;
      })
      .sort((a, b) => a.gamesPlayed !== b.gamesPlayed ? a.gamesPlayed - b.gamesPlayed : a.checkInTime - b.checkInTime);
  }, [members, searchQuery, minRankFilter, maxRankFilter]);

  // ── AUTO MATCH (จัดทีมให้สมดุลที่สุดไม่ว่าจะเหลือที่ว่างกี่ที่) ───────────────────────
  const autoMatch = (courtId: string) => {
    const court = courts.find(c => c.id === courtId);
    if (!court) return;

    const emptySlotIndices = court.players.map((p, i) => p === null ? i : -1).filter(i => i !== -1);
    if (emptySlotIndices.length === 0) { alert('คอร์ดเต็มแล้ว!'); return; }

    const waiting = getWaitingList.filter(m => !court.players.includes(m.id));
    if (waiting.length < emptySlotIndices.length) {
      alert(`คนในคิวไม่พอ (ต้องการ ${emptySlotIndices.length} คน)`);
      return;
    }

    const candidates = waiting.slice(0, emptySlotIndices.length);
    const getW = (pid: string | null) => {
      if (!pid) return 0;
      const m = members.find(x => x.id === pid);
      return m ? (RANK_WEIGHTS[m.rank] || 0) : 0;
    };

    // Helper: Calculate all permutations of an array
    const getPermutations = (arr: any[]): any[][] => {
      if (arr.length <= 1) return [arr];
      return arr.reduce((acc, item, i) => {
        const remaining = [...arr.slice(0, i), ...arr.slice(i + 1)];
        const perms = getPermutations(remaining);
        return [...acc, ...perms.map(p => [item, ...p])];
      }, [] as any[][]);
    };

    const allCandidatePerms = getPermutations(candidates.map(c => c.id));
    let bestPlayers: (string | null)[] = [...court.players];
    let minDiff = Infinity;

    // ทดสอบการวาง candidates ลงในช่องว่างทุกแบบที่เป็นไปได้
    for (const perm of allCandidatePerms) {
      const testPlayers = [...court.players];
      emptySlotIndices.forEach((idx, i) => { testPlayers[idx] = perm[i]; });

      const teamAWeight = getW(testPlayers[0]) + getW(testPlayers[1]);
      const teamBWeight = getW(testPlayers[2]) + getW(testPlayers[3]);
      const diff = Math.abs(teamAWeight - teamBWeight);

      if (diff < minDiff) {
        minDiff = diff;
        bestPlayers = testPlayers;
      }
    }

    setCourts(prev => prev.map(c => c.id === courtId ? { ...c, players: bestPlayers } : c));
    const addedIds = candidates.map(m => m.id);
    setMembers(prev => prev.map(m => addedIds.includes(m.id) ? { ...m, status: 'playing' } : m));
  };

  // ── START GAME: commit 4 players, auto-count 1 shuttle ────────────────────
  const startGame = (courtId: string) => {
    const court = courts.find(c => c.id === courtId);
    if (!court) return;
    const playerIds = court.players.filter(Boolean) as string[];
    if (playerIds.length !== 4) { alert('ต้องมีผู้เล่นครบ 4 คนพอดี'); return; }
    setCourts(prev => prev.map(c =>
      c.id === courtId ? { ...c, status: 'active' } : c
    ));
  };

  // ── RESET COURT: record game, charge costs, clear ─────────────────────────
  const resetCourt = (courtId: string) => {
    const court = courts.find(c => c.id === courtId);
    if (!court) return;
    const playerIds = court.players.filter(Boolean) as string[];
    // ค่าลูก = ลูก × shuttlePrice ต่อคน (ไม่หาร 4 เพราะ shuttlePrice คือราคาต่อคนอยู่แล้ว)
    const shuttleCostPerPerson = court.shuttlecocks * shuttlePrice;

    const playerSnapshots = playerIds.map(pid => {
      const m = members.find(m => m.id === pid)!;
      return { id: pid, name: m.name, rank: m.rank };
    });
    const gameRec: GameRecord = {
      id: Math.random().toString(36).substr(2, 9),
      courtId, courtName: court.name,
      playedAt: Date.now(),
      players: playerSnapshots,
      shuttlesUsed: court.shuttlecocks,
      shuttleCostPerPerson,
      courtFeePerPerson: 0,
    };

    setMembers(prev => prev.map(m => {
      if (!playerIds.includes(m.id)) return m;
      const courtCharge = m.paidCourtFee ? 0 : courtFeePerPerson;
      return {
        ...m,
        status: 'waiting',
        gamesPlayed: m.gamesPlayed + 1,
        balance: m.balance + shuttleCostPerPerson + courtCharge,
        courtBalance: m.courtBalance + courtCharge,
        shuttleBalance: m.shuttleBalance + shuttleCostPerPerson,
        shuttleCount: m.shuttleCount + court.shuttlecocks,
        paidCourtFee: true,
        checkInTime: Date.now(),
      };
    }));

    setCourts(prev => prev.map(c =>
      c.id === courtId ? { ...c, players: [null, null, null, null], status: 'empty', shuttlecocks: 1 } : c
    ));
    setGameHistory(prev => [gameRec, ...prev]);
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
  };

  // ── PLAYER MANAGEMENT ─────────────────────────────────────────────────────
  const removePlayerFromCourt = (courtId: string, slotIndex: number) => {
    const court = courts.find(c => c.id === courtId);
    if (!court || court.status === 'active') return; // ห้ามเปลี่ยนขณะเล่นอยู่
    const pid = court.players[slotIndex];
    if (!pid) return;
    setCourts(prev => prev.map(c => c.id === courtId
      ? { ...c, players: c.players.map((p, i) => i === slotIndex ? null : p) } : c));
    setMembers(prev => prev.map(m => m.id === pid ? { ...m, status: 'waiting' } : m));
  };

  const addPlayerToCourt = (courtId: string, slotIndex: number, playerId: string) => {
    const court = courts.find(c => c.id === courtId);
    if (court?.status === 'active') return; // ห้ามเปลี่ยนขณะเล่นอยู่
    setCourts(prev => prev.map(c => ({
      ...c,
      players: c.id === courtId
        ? c.players.map((p, i) => i === slotIndex ? playerId : p)
        : c.players.map(p => p === playerId ? null : p),
    })));
    setMembers(prev => prev.map(m => m.id === playerId ? { ...m, status: 'playing' } : m));
  };

  const addSnackToMember = (memberId: string, snack: Snack) => {
    setMembers(prev => prev.map(m => m.id === memberId
      ? {
        ...m,
        balance: m.balance + snack.price,
        snackBalance: m.snackBalance + snack.price,
        snackHistory: [...m.snackHistory, { ...snack, time: Date.now() }]
      }
      : m));
  };

  const removeSnackFromMember = (memberId: string, snackItemIndex: number) => {
    setMembers(prev => prev.map(m => {
      if (m.id !== memberId) return m;
      const snackToRemove = m.snackHistory[snackItemIndex];
      if (!snackToRemove) return m;
      const newHistory = [...m.snackHistory];
      newHistory.splice(snackItemIndex, 1);
      return {
        ...m,
        balance: m.balance - snackToRemove.price,
        snackBalance: m.snackBalance - snackToRemove.price,
        snackHistory: newHistory
      };
    }));
  };

  const updateSnackPrice = (memberId: string, itemIndex: number, newPrice: number) => {
    setMembers(prev => prev.map(m => {
      if (m.id !== memberId) return m;
      const snack = m.snackHistory[itemIndex];
      if (!snack) return m;
      const diff = newPrice - snack.price;
      const newHistory = [...m.snackHistory];
      newHistory[itemIndex] = { ...snack, price: newPrice };
      return {
        ...m,
        balance: m.balance + diff,
        snackBalance: m.snackBalance + diff,
        snackHistory: newHistory
      };
    }));
  };

  // ── EDIT GAME: ปรับลูกย้อนหลัง (คืนเงินส่วนต่าง/เรียกเก็บเพิ่ม) ──────────────
  const editGame = (gameId: string, newShuttles: number) => {
    const game = gameHistory.find(g => g.id === gameId);
    if (!game || newShuttles < 1) return;
    const oldShuttles = game.shuttlesUsed;
    const shuttleDiff = newShuttles - oldShuttles;
    const delta = shuttleDiff * shuttlePrice;
    const playerIds = game.players.map(p => p.id);
    setMembers(prev => prev.map(m =>
      playerIds.includes(m.id)
        ? {
          ...m,
          balance: m.balance + delta,
          shuttleBalance: m.shuttleBalance + delta,
          shuttleCount: m.shuttleCount + shuttleDiff
        }
        : m
    ));
    setGameHistory(prev => prev.map(g =>
      g.id === gameId
        ? { ...g, shuttlesUsed: newShuttles, shuttleCostPerPerson: newShuttles * shuttlePrice }
        : g
    ));
  };

  const updateMemberShuttles = (memberId: string, delta: number) => {
    setMembers(prev => prev.map(m => {
      if (m.id !== memberId) return m;
      const newCount = Math.max(0, m.shuttleCount + delta);
      const actualDelta = newCount - m.shuttleCount;
      const costChange = actualDelta * shuttlePrice;
      return {
        ...m,
        shuttleCount: newCount,
        shuttleBalance: m.shuttleBalance + costChange,
        balance: m.balance + costChange
      };
    }));
  };

  const undoGame = (gameId: string) => {
    const game = gameHistory.find(g => g.id === gameId);
    if (!game) return;
    if (!confirm(`ต้องการยกเลิกเกม "${game.courtName}" เมื่อเวลา ${format(game.playedAt, 'HH:mm')} ใช่หรือไม่?\n(ระบบจะคืนค่าลูกและค่าสนามให้ผู้เล่นทุกคน)`)) return;

    const playerIds = game.players.map(p => p.id);
    const numPlayers = game.players.length;
    const shuttleCost = game.shuttleCostPerPerson;
    const shuttlesPerPerson = game.shuttlesUsed / numPlayers;

    setMembers(prev => prev.map(m => {
      if (!playerIds.includes(m.id)) return m;

      const courtRefund = game.courtFeePerPerson || 0;

      return {
        ...m,
        gamesPlayed: Math.max(0, m.gamesPlayed - 1),
        balance: m.balance - shuttleCost - courtRefund,
        shuttleBalance: m.shuttleBalance - shuttleCost,
        shuttleCount: Math.max(0, m.shuttleCount - shuttlesPerPerson),
        courtBalance: m.courtBalance - courtRefund,
        paidCourtFee: (m.courtBalance - courtRefund) > 0
      };
    }));

    setGameHistory(prev => prev.filter(g => g.id !== gameId));

    // ถ้าคอร์ดว่าง เราอาจจะคืนผู้เล่นลงคอร์ด? 
    // แต่เพื่อความง่าย เราแค่คืนเงินและลบประวัติพอ
  };

  const updateMemberRank = (memberId: string, rank: Rank) => {
    setMembers(prev => prev.map(m => {
      if (m.id === memberId) {
        setRankMemory(prevMem => ({ ...prevMem, [m.name]: rank }));
        return { ...m, rank };
      }
      return m;
    }));
  };

  const updateMemberName = (memberId: string, name: string) => {
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, name } : m));
  };


  const processPayment = (memberId: string, amount: number, method: string = 'Cash', otherMemberIds: string[] = []) => {
    const member = members.find(m => m.id === memberId);
    if (!member) return;

    const allMemberIds = [memberId, ...otherMemberIds];
    const otherMembers = members.filter(m => otherMemberIds.includes(m.id));
    const otherNames = otherMembers.map(m => m.name).join(', ');
    
    const note = otherMemberIds.length > 0 
      ? `จ่ายรวม: ${otherNames}` 
      : `${member.gamesPlayed} เกม`;

    const record: PaymentRecord = {
      id: Math.random().toString(36).substr(2, 9),
      memberId,
      memberName: member.name,
      memberRank: member.rank,
      amount,
      timestamp: Date.now(),
      method,
      note,
    };

    setPaymentHistory(prev => [record, ...prev]);
    setMembers(prev => prev.map(m => allMemberIds.includes(m.id)
      ? { 
          ...m, 
          balance: 0, 
          courtBalance: 0, 
          shuttleBalance: 0, 
          snackBalance: 0, 
          snackHistory: [],
          shuttleCount: 0,
          paidCourtFee: true
        } : m));
  };

  const addCourt = (name: string) => {
    setCourts(prev => [...prev, { id: `c${Date.now()}`, name, players: [null, null, null, null], status: 'empty', shuttlecocks: 0 }]);
  };

  const deleteCourt = (courtId: string) => {
    const court = courts.find(c => c.id === courtId);
    const playerIds = (court?.players.filter(Boolean) as string[]) || [];
    if (playerIds.length > 0) setMembers(prev => prev.map(m => playerIds.includes(m.id) ? { ...m, status: 'waiting' } : m));
    setCourts(prev => prev.filter(c => c.id !== courtId));
  };

  const addMember = (name: string, rank: Rank, status: Member['status'] = 'resting') => {
    setRankMemory(prev => ({ ...prev, [name]: rank }));
    const newMember: Member = {
      id: Math.random().toString(36).substr(2, 9),
      name, rank, gamesPlayed: 0,
      checkInTime: Date.now(),
      status,
      balance: 0, courtBalance: 0, shuttleBalance: 0, snackBalance: 0,
      shuttleCount: 0,
      snackHistory: [],
      paidCourtFee: false,
    };
    setMembers(prev => {
      const next = [...prev, newMember];
      pushMasterData(next);
      return next;
    });
    setShowAddMember(false);
  };

  const importMembers = (list: { name: string; rank: Rank }[], isSessionImport = false) => {
    const status: Member['status'] = isSessionImport ? 'waiting' : 'resting';
    
    setRankMemory(prev => {
      const next = { ...prev };
      list.forEach(item => { next[item.name] = item.rank; });
      return next;
    });

    setMembers(prev => {
      const now = Date.now();
      const current = [...prev];
      
      list.forEach((item, i) => {
        const existingIndex = current.findIndex(m => m.name.trim().toLowerCase() === item.name.trim().toLowerCase());
        if (existingIndex !== -1) {
          // Update details and check-in if it's a session import
          current[existingIndex] = {
            ...current[existingIndex],
            rank: item.rank,
            status: isSessionImport ? 'waiting' : current[existingIndex].status,
            checkInTime: isSessionImport ? (now + i) : current[existingIndex].checkInTime
          };
        } else {
          // New member
            current.push({
              id: Math.random().toString(36).substr(2, 9),
              name: item.name, 
              rank: item.rank,
              gamesPlayed: 0,
              checkInTime: now + i,
              status: status,
              balance: 0, courtBalance: 0, shuttleBalance: 0, snackBalance: 0,
              shuttleCount: 0,
              snackHistory: [],
              paidCourtFee: false,
            });
          }
        });
        // Sync to cloud
        pushMasterData(current);
        return current;
      });
    };
  
    const removeMember = (memberId: string) => {
      if (!confirm('ยืนยันการลบสมาชิกออกจากฐานข้อมูลถาวร? (จะหายไปจาก Cloud ด้วย)')) return;
      setCourts(prev => prev.map(c => ({ ...c, players: c.players.map(p => p === memberId ? null : p) })));
      setMembers(prev => {
        const next = prev.filter(m => m.id !== memberId);
        pushMasterData(next);
        return next;
      });
    };
  
    const bulkCheckIn = (memberIds: string[]) => {
      setMembers(prev => prev.map(m => memberIds.includes(m.id) ? { ...m, status: 'waiting', checkInTime: Date.now() } : m));
    };
  
    const bulkRemove = (memberIds: string[]) => {
      if (!confirm(`ยืนยันการลบสมาชิก ${memberIds.length} คนออกจากฐานข้อมูลถาวร? (จะหายไปจาก Cloud ด้วย)`)) return;
      setCourts(prev => prev.map(c => ({ ...c, players: c.players.map(p => memberIds.includes(p as string) ? null : p) })));
      setMembers(prev => {
        const next = prev.filter(m => !memberIds.includes(m.id));
        pushMasterData(next);
        return next;
      });
    };
  
    const bulkUpdateRank = (memberIds: string[], rank: Rank) => {
      setMembers(prev => {
        const next = prev.map(m => memberIds.includes(m.id) ? { ...m, rank } : m);
        pushMasterData(next);
        return next;
      });
      const names = members.filter(m => memberIds.includes(m.id)).map(m => m.name);
      setRankMemory(prev => {
        const next = { ...prev };
        names.forEach(n => next[n] = rank);
        return next;
      });
    };
  
    const tabs = [
      { id: 'dashboard', icon: LayoutDashboard, label: 'ภาพรวม' },
      { id: 'members', icon: Users, label: 'สมาชิก' },
      { id: 'courts', icon: Trophy, label: 'คอร์ด' },
      { id: 'logs', icon: History, label: 'บันทึก' },
      { id: 'settings', icon: Settings, label: 'ตั้งค่าระบบ' },
    ];
  
    return (
      <div className="min-h-screen bg-background flex flex-col lg:flex-row">
        {/* Sidebar */}
        <aside className={cn(
          "hidden lg:flex flex-col fixed left-0 top-0 h-screen bg-surface-container border-r border-on-surface/5 transition-all duration-300 z-[100]",
          isSidebarCollapsed ? "w-20 p-2" : "w-64 p-4"
        )}>
          <div className={cn("mb-8 flex items-center gap-3 transition-all", isSidebarCollapsed ? "justify-center pt-4" : "px-2 pt-6")}>
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-black italic text-xl shadow-lg shadow-primary/20 shrink-0">S</div>
            {!isSidebarCollapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h4 className="font-headline font-black text-lg text-on-surface tracking-tight">SmashIT</h4>
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Organizer Pro</p>
              </motion.div>
            )}
          </div>
  
          <nav className="flex-1 space-y-1">
            {tabs.map(item => (
              <button key={item.id} onClick={() => setActiveTab(item.id as Tab)}
                title={isSidebarCollapsed ? item.label : ""}
                className={cn('w-full flex items-center rounded-xl font-bold transition-all duration-200',
                  isSidebarCollapsed ? "justify-center p-3" : "gap-3 px-4 py-3",
                  activeTab === item.id ? 'bg-white text-primary shadow-sm translate-x-1' : 'text-on-surface/60 hover:text-on-surface hover:bg-white/50')}>
                <item.icon size={20} className="shrink-0" />
                {!isSidebarCollapsed && <span>{item.label}</span>}
              </button>
            ))}
          </nav>
  
          <div className="mt-auto pt-4 border-t border-on-surface/5 space-y-4">
            {!isSidebarCollapsed ? (
              <div className="bg-primary/5 p-4 rounded-2xl">
                <p className="text-[10px] font-black text-primary uppercase mb-1">รายรับวันนี้</p>
                <p className="text-xl font-headline font-black text-on-surface">
                  ฿{(members.reduce((a, m) => a + m.balance, 0) + paymentHistory.reduce((a, r) => a + r.amount, 0)).toLocaleString()}
                </p>
              </div>
            ) : (
              <div className="flex justify-center text-primary" title="รายรับวันนี้">
                <Banknote size={20} />
              </div>
            )}
  
            <button onClick={() => setShowManageProducts(true)}
              title={isSidebarCollapsed ? "จัดการสินค้า" : ""}
              className={cn("w-full flex items-center text-primary/80 font-bold hover:bg-primary/5 rounded-xl transition-colors",
                isSidebarCollapsed ? "justify-center p-3" : "gap-3 px-4 py-3")}>
              <ShoppingCart size={18} className="shrink-0" />
              {!isSidebarCollapsed && <span>จัดการสินค้า</span>}
            </button>
            
            <button onClick={() => setShowImport(true)}
              title={isSidebarCollapsed ? "นำเข้าจากไลน์" : ""}
              className={cn("w-full flex items-center text-secondary/80 font-bold hover:bg-secondary/5 rounded-xl transition-colors",
                isSidebarCollapsed ? "justify-center p-3" : "gap-3 px-4 py-3")}>
              <FileText size={18} className="shrink-0" />
              {!isSidebarCollapsed && <span>นำเข้าจากไลน์</span>}
            </button>
  
            {/* Toggle Button */}
            <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="w-full flex items-center justify-center p-3 text-on-surface/20 hover:text-on-surface/60 transition-colors"
            >
              {isSidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
          </div>
        </aside>
  
        {/* Main Container */}
        <div className={cn(
          "flex-1 transition-all duration-300",
          isSidebarCollapsed ? "lg:ml-20" : "lg:ml-64"
        )}>
          {/* Modals */}
          <AddMemberModal open={showAddMember} onClose={() => setShowAddMember(false)} onAdd={addMember} existingNames={members.map(m => m.name)} />
          <AddCourtModal open={showAddCourt} onClose={() => setShowAddCourt(false)} onAdd={addCourt} />
          <ManageProductsModal open={showManageProducts} onClose={() => setShowManageProducts(false)} snacks={snacks} onSave={setSnacks} />
          <ImportMembersModal 
            open={showImport} 
            onClose={() => setShowImport(false)} 
            onImport={importMembers} 
            rankMemory={rankMemory} 
            existingNames={members.map(m => m.name)} 
            isSessionMode={importIsSession}
          />
  
        {/* Main Content Area */}
        <main className="p-4 md:p-6 court-texture pb-24 lg:pb-6 min-h-screen">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              {activeTab === 'dashboard' && (
                <DashboardTab
                  members={members} courts={courts} snacks={snacks}
                  paymentHistory={paymentHistory} gameHistory={gameHistory}
                  onAddSnack={addSnackToMember}
                  onUpdateShuttles={updateMemberShuttles}
                  onUpdateRank={updateMemberRank}
                  onRemoveSnack={removeSnackFromMember}
                  onUpdateSnackPrice={updateSnackPrice}
                  viewingSession={viewingSession}
                  onCloseSession={() => setViewingSession(null)}
                  sessionHistory={sessionHistory}
                  onViewSession={(s) => setViewingSession(s)}
                  onProcessPayment={processPayment}
                  onPullSession={pullSessionData}
                  onAddCourt={() => setShowAddCourt(true)}
                  isSidebarCollapsed={isSidebarCollapsed}
                  onCheckIn={checkInMember}
                  onRemove={removeFromSession}
                  onResetDay={resetDay}
                  isSyncing={isSyncing}
                  isPushing={isPushing}
                  isAutoSync={isAutoSync}
                  lastSyncTime={lastSyncTime}
                  onImportLine={() => { setImportIsSession(true); setShowImport(true); }}
                />
              )}
            {activeTab === 'logs' && (
              <LogsTab
                gameHistory={gameHistory}
                sessionHistory={sessionHistory}
                onViewSession={setViewingSession}
                onActiveTab={setActiveTab}
              />
            )}
            {activeTab === 'members' && (
              <MembersTab
                members={members}
                searchQuery={searchQuery}
                onSearch={setSearchQuery}
                onRemove={removeMember}
                onAddMember={() => { setImportIsSession(false); setShowAddMember(true); }}
                onImportLine={() => { setImportIsSession(false); setShowImport(true); }}
                onUpdateRank={updateMemberRank}
                onUpdateName={updateMemberName}
                onAddCourt={() => setShowAddCourt(true)}
                onCheckIn={checkInMember}
                onBulkCheckIn={bulkCheckIn}
                onBulkRemove={bulkRemove}
                onBulkUpdateRank={bulkUpdateRank}
              />
            )}
            {activeTab === 'courts' && (
              <CourtsTab
                members={members} courts={courts} snacks={snacks}
                searchQuery={searchQuery} gameHistory={gameHistory}
                onAutoMatch={autoMatch} onStartGame={startGame} onResetCourt={resetCourt}
                onRemovePlayer={removePlayerFromCourt} onAddPlayer={addPlayerToCourt}
                onDeleteCourt={deleteCourt} onAddSnack={addSnackToMember}
                onEditGame={editGame} onUndoGame={undoGame} onUpdateCourt={setCourts}
                minRankFilter={minRankFilter} setMinRankFilter={setMinRankFilter}
                maxRankFilter={maxRankFilter} setMaxRankFilter={setMaxRankFilter}
                onAddCourt={() => setShowAddCourt(true)}
              />
            )}
            {activeTab === 'settings' && (
              <SettingsTab
                courtFeePerPerson={courtFeePerPerson}
                setCourtFeePerPerson={setCourtFeePerPerson}
                shuttlePrice={shuttlePrice}
                setShuttlePrice={setShuttlePrice}
                googleSheetUrl={googleSheetUrl}
                setGoogleSheetUrl={setGoogleSheetUrl}
                onSync={syncToGoogleSheets}
                isSyncing={isSyncing}
                isAutoSync={isAutoSync}
                setIsAutoSync={(val) => {
                  setIsAutoSync(val);
                  localStorage.setItem('smashit_autosync', val ? 'active' : 'inactive');
                }}
                onPushCloud={pushMasterData}
                onPullCloud={pullMasterData}
                onSeedMockHistory={seedMockHistory}
                onResetDay={resetDay}
                onFactoryReset={factoryReset}
                rankMemory={rankMemory}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
      </div>

      {/* Mobile Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-xl flex justify-around items-center px-4 pb-8 pt-3 z-50 border-t border-on-surface/5">
        {tabs.map(item => (
          <button key={item.id} onClick={() => setActiveTab(item.id as Tab)}
            className={cn('flex flex-col items-center gap-1 p-2 rounded-2xl transition-all',
              activeTab === item.id ? 'text-primary' : 'text-on-surface/40')}>
            <item.icon size={22} />
            <span className="text-[9px] font-black uppercase">{item.label}</span>
          </button>
        ))}
        <button onClick={() => setShowManageProducts(true)}
          className="flex flex-col items-center gap-1 p-2 rounded-2xl transition-all text-on-surface/40">
          <ShoppingCart size={22} />
          <span className="text-[9px] font-black uppercase">สินค้า</span>
        </button>
      </nav>
    </div>
  );
}

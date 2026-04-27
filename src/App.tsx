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

const API_BASE = import.meta.env.VITE_API_URL || '';

type Tab = 'dashboard' | 'members' | 'courts' | 'settings' | 'logs';

const mkMember = (id: string, name: string, rank: Rank, gamesPlayed: number, offset: number): Member => ({
  id, name, rank, gamesPlayed,
  checkInTime: Date.now() - offset,
  status: 'waiting',
  balance: 0, courtBalance: 0, shuttleBalance: 0, shuttleCount: 0, snackBalance: 0,
  snackHistory: [],
  paidCourtFee: false,
  totalCourt: 0, totalShuttle: 0, totalSnack: 0,
});

const INITIAL_MEMBERS: Member[] = [];

const INITIAL_COURTS: Court[] = [
  { id: 'c1', name: 'คอร์ด 1', players: [null, null, null, null], status: 'empty', shuttlecocks: 1 },
  { id: 'c2', name: 'คอร์ด 2', players: [null, null, null, null], status: 'empty', shuttlecocks: 1 },
  { id: 'c3', name: 'คอร์ด 3', players: [null, null, null, null], status: 'empty', shuttlecocks: 1 },
  { id: 'c4', name: 'คอร์ด 4', players: [null, null, null, null], status: 'empty', shuttlecocks: 1 },
  { id: 'c5', name: 'คอร์ด 5', players: [null, null, null, null], status: 'empty', shuttlecocks: 1 },
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
  const [rankMemory, setRankMemory] = useState<Record<string, Rank>>({});
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Modal states
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddCourt, setShowAddCourt] = useState(false);
  const [showManageProducts, setShowManageProducts] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importIsSession, setImportIsSession] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Sync to API on startup
  useEffect(() => {
    (async () => {
      try {
        setIsSyncing(true);
        const [stateRes, masterRes] = await Promise.all([
          fetch(`${API_BASE}/api/state`).catch(() => null),
          fetch(`${API_BASE}/api/master`).catch(() => null)
        ]);

        let loadedState: any = null;
        if (stateRes && stateRes.ok) loadedState = await stateRes.json();

        let loadedMaster: any = null;
        if (masterRes && masterRes.ok) loadedMaster = await masterRes.json();

        // 1) Load basic states
        if (loadedState?.courts && loadedState.courts.length > 0) {
          setCourts(loadedState.courts);
        } else {
          setCourts(INITIAL_COURTS);
        }

        if (loadedState?.gameHistory) setGameHistory(loadedState.gameHistory);
        if (loadedState?.paymentHistory) setPaymentHistory(loadedState.paymentHistory);
        if (loadedState?.sessionHistory) setSessionHistory(loadedState.sessionHistory);
        if (loadedState?.courtFeePerPerson) setCourtFeePerPerson(loadedState.courtFeePerPerson);
        if (loadedState?.shuttlePrice) setShuttlePrice(loadedState.shuttlePrice);
        if (loadedState?.snacks && loadedState.snacks.length > 4) {
          setSnacks(loadedState.snacks);
        } else {
          setSnacks(DEFAULT_SNACKS);
        }

        // 2) Load and Merge Master <-> State
        let activeMembers: Member[] = loadedState?.members || [...INITIAL_MEMBERS];
        let combinedRankMemory = loadedState?.rankMemory || {};

        if (loadedMaster?.rankMemory) {
          combinedRankMemory = { ...combinedRankMemory, ...loadedMaster.rankMemory };
        }

        if (loadedMaster?.members) {
          loadedMaster.members.forEach((masterMem: Member) => {
            combinedRankMemory[masterMem.name] = masterMem.rank;
            const existing = activeMembers.find(m => m.name.toLowerCase() === masterMem.name.toLowerCase());
            if (!existing) {
              activeMembers.push({ ...masterMem, status: 'resting' });
            }
          });
        }

        setMembers(activeMembers);
        setRankMemory(combinedRankMemory);

      } catch (err) {
        console.error('Failed to load initial data from DB:', err);
      } finally {
        setIsSyncing(false);
        // Add a slight artificial delay for the premium feel
        setTimeout(() => setIsInitialLoading(false), 1200);
      }
    })();
  }, []);

  // Debounced save EVERYTHING to Database
  useEffect(() => {
    const handler = setTimeout(async () => {
      // Don't save empty states over initial real DB states before API finishes pulling
      // if (members.length === 0 && isSyncing) return;

      try {
        await fetch(`${API_BASE}/api/state`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            members,
            courts,
            gameHistory,
            paymentHistory,
            sessionHistory,
            rankMemory,
            courtFeePerPerson,
            shuttlePrice,
            snacks
          })
        });
      } catch (err) {
        console.warn('Failed to save state to DB:', err);
      }
    }, 2000);
    return () => clearTimeout(handler);
  }, [members, courts, gameHistory, paymentHistory, sessionHistory, courtFeePerPerson, shuttlePrice, rankMemory, snacks]);

  // Debounced save MASTER DATA (Permanent members & Settings) to MySQL
  useEffect(() => {
    const handler = setTimeout(async () => {
      try {
        await fetch(`${API_BASE}/api/master`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            members: members,
            settings: { courtFeePerPerson, shuttlePrice }
          })
        });
      } catch (err) {
        console.warn('Failed to save master data to DB:', err);
      }
    }, 5000); // Save master data less frequently
    return () => clearTimeout(handler);
  }, [members, courtFeePerPerson, shuttlePrice]);

  const resetDay = async () => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการเริ่มวันใหม่? (ล้างประวัติการตีและรีเซ็ตคอร์ด)')) return;
    saveSession();

    // Sync session to the DB
    setIsSyncing(true);
    try {
      await fetch(`${API_BASE}/api/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timestamp: Date.now(),
          members: members,
          games: gameHistory,
          payments: paymentHistory
        })
      });
    } catch (err) {
      console.error('Failed to archive session to DB:', err);
    } finally {
      setIsSyncing(false);
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
      checkInTime: Date.now(),
      totalCourt: 0,
      totalShuttle: 0,
      totalSnack: 0
    })));

  };

  const clearBoard = () => {
    if (!confirm('ยืนยัน "ล้างกระดาน" หรือไม่? \n(ลบรายการทั้งหมดของวันนี้ทิ้งโดยไม่บันทึกประวัติ)')) return;
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
      checkInTime: Date.now(),
      totalCourt: 0,
      totalShuttle: 0,
      totalSnack: 0
    })));
  };

  const updateGame = (gameId: string, newPlayerIds: string[], newShuttles: number) => {
    const game = gameHistory.find(g => g.id === gameId);
    if (!game) return;

    const oldPlayerIds = game.players.map(p => p.id);
    const oldShuttles = game.shuttlesUsed;
    const oldShuttleCost = game.shuttleCostPerPerson;
    const oldCourtFee = game.courtFeePerPerson || 0;

    const newShuttleCost = newShuttles * shuttlePrice;
    
    setMembers(prev => prev.map(m => {
      let updated = { ...m };
      
      // 1. Refund old players
      if (oldPlayerIds.includes(m.id)) {
        updated.balance -= (oldShuttleCost + oldCourtFee);
        updated.shuttleBalance -= oldShuttleCost;
        updated.courtBalance -= oldCourtFee;
        updated.shuttleCount = Math.max(0, updated.shuttleCount - oldShuttles);
        updated.gamesPlayed = Math.max(0, updated.gamesPlayed - 1);
        updated.totalCourt = Math.max(0, (updated.totalCourt || 0) - oldCourtFee);
        updated.totalShuttle = Math.max(0, (updated.totalShuttle || 0) - oldShuttleCost);
        // Important: if they no longer have any games, reset paidCourtFee
        if (updated.gamesPlayed === 0) updated.paidCourtFee = false;
      }

      // 2. Charge new players
      if (newPlayerIds.includes(m.id)) {
        const chargeField = updated.paidCourtFee ? 0 : courtFeePerPerson;
        updated.balance += (newShuttleCost + chargeField);
        updated.shuttleBalance += newShuttleCost;
        updated.courtBalance += chargeField;
        updated.shuttleCount += newShuttles;
        updated.gamesPlayed += 1;
        updated.paidCourtFee = true;
        updated.totalCourt = (updated.totalCourt || 0) + chargeField;
        updated.totalShuttle = (updated.totalShuttle || 0) + newShuttleCost;
      }

      return updated;
    }));

    setGameHistory(prev => prev.map(g => {
      if (g.id !== gameId) return g;
      const newPlayers = newPlayerIds.map(pid => {
        const p = members.find(px => px.id === pid)!;
        return { id: pid, name: p.name, rank: p.rank };
      });
      return { 
        ...g, 
        players: newPlayers, 
        shuttlesUsed: newShuttles, 
        shuttleCostPerPerson: newShuttleCost,
        courtFeePerPerson: oldCourtFee // Keep old charge status or update? safest to keep logic consistent
      };
    }));
  };

  const addMember = (name: string, rank: Rank) => {
    const existing = members.find(m => m.name.toLowerCase() === name.toLowerCase());

    // Auto-update rank memory when a member is added manually
    setRankMemory(prev => ({ ...prev, [name]: rank }));

    if (existing) {
      if (existing.status === 'waiting') {
        alert('ผู้เล่นนี้อยู่ในคิวแล้ว!');
        return;
      }
      setMembers(prev => prev.map(m => m.name.toLowerCase() === name.toLowerCase()
        ? { 
            ...m, 
            status: 'waiting', 
            checkInTime: Date.now(), 
            rank,
            balance: 0,
            courtBalance: 0,
            shuttleBalance: 0,
            snackBalance: 0,
            shuttleCount: 0,
            gamesPlayed: 0,
            snackHistory: [],
            paidCourtFee: false,
            totalCourt: 0,
            totalShuttle: 0,
            totalSnack: 0
          }
        : m
      ));
    } else {
      setMembers(prev => [...prev, mkMember(`m-${Date.now()}`, name, rank, 0, prev.length * 1000)]);
    }
    setShowAddMember(false);
  };

  const checkInMember = (memberId: string) => {
    setMembers(prev => prev.map(m => m.id === memberId
      ? { ...m, status: 'waiting', checkInTime: Date.now() }
      : m));
  };

  const removeFromSession = (memberId: string) => {
    if (!confirm('ยืนยันการลบรายชื่อออกจากเซสชันวันนี้?')) return;
    setCourts(prev => prev.map(c => ({ ...c, players: c.players.map(p => p === memberId ? null : p) })));
    setMembers(prev => prev.map(m => m.id === memberId ? {
      ...m,
      status: 'resting',
      gamesPlayed: 0,
      balance: 0,
      courtBalance: 0,
      shuttleBalance: 0,
      shuttleCount: 0,
      snackBalance: 0,
      snackHistory: [],
      paidCourtFee: false
    } : m));
  };

  const pullSessionData = async (date: string) => {
    setIsSyncing(true);
    try {
      const res = await fetch(`${API_BASE}/api/session?date=${date}`);
      if (!res.ok) throw new Error('API return error');
      const data = await res.json();
      if (data && data.date) {
        const session: SessionRecord = {
          id: data.id,
          date: data.date,
          membersSnapshot: data.membersSnapshot || [],
          gameHistory: data.gameHistory || [],
          paymentHistory: data.paymentHistory || []
        };
        setSessionHistory(prev => {
          const filtered = prev.filter(s => format(s.date, 'yyyy-MM-dd') !== date);
          return [session, ...filtered];
        });
        setViewingSession(session);
        return session;
      }
    } catch (err) {
      console.error('Pull Session Error:', err);
      alert('ไม่สามารถดึงข้อมูลประวัติจากฐานข้อมูลได้');
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
        totalCourt: (m.totalCourt || 0) + courtCharge,
        totalShuttle: (m.totalShuttle || 0) + shuttleCostPerPerson,
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
    if (!court) return;
    const pid = court.players[slotIndex];
    if (!pid) return;
    setCourts(prev => prev.map(c => c.id === courtId
      ? { ...c, players: c.players.map((p, i) => i === slotIndex ? null : p) } : c));
    setMembers(prev => prev.map(m => m.id === pid ? { ...m, status: 'waiting' } : m));
  };

  const addPlayerToCourt = (courtId: string, slotIndex: number, playerId: string) => {
    const court = courts.find(c => c.id === courtId);
    if (!court) return;

    // Get the player currently in that slot (if any)
    const oldPlayerId = court.players[slotIndex];

    setCourts(prev => prev.map(c => ({
      ...c,
      players: c.id === courtId
        ? c.players.map((p, i) => i === slotIndex ? playerId : p)
        : c.players.map(p => p === playerId ? null : p),
    })));

    setMembers(prev => prev.map(m => {
      // New player going in
      if (m.id === playerId) return { ...m, status: 'playing' };
      // Old player being kicked out of THIS slot
      if (m.id === oldPlayerId) return { ...m, status: 'waiting' };
      return m;
    }));
  };

  const addSnacksToMember = (memberId: string, addedSnacks: Snack[]) => {
    if (addedSnacks.length === 0) return;
    const totalExtraBalance = addedSnacks.reduce((sum, s) => sum + s.price, 0);
    const historyEntries = addedSnacks.map(s => ({ ...s, time: Date.now() }));

    setMembers(prev => prev.map(m => m.id === memberId ? {
      ...m,
      balance: m.balance + totalExtraBalance,
      snackBalance: m.snackBalance + totalExtraBalance,
      snackHistory: [...(m.snackHistory || []), ...historyEntries],
      totalSnack: (m.totalSnack || 0) + totalExtraBalance
    } : m));
  };

  const addSnackToMember = (memberId: string, snack: Snack) => {
    setMembers(prev => prev.map(m => m.id === memberId
      ? {
        ...m,
        balance: m.balance + snack.price,
        snackBalance: m.snackBalance + snack.price,
        snackHistory: [...m.snackHistory, { ...snack, time: Date.now() }],
        totalSnack: (m.totalSnack || 0) + snack.price
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
        snackHistory: newHistory,
        totalSnack: Math.max(0, (m.totalSnack || 0) - snackToRemove.price)
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
        snackHistory: newHistory,
        totalSnack: (m.totalSnack || 0) + diff
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
          shuttleCount: m.shuttleCount + shuttleDiff,
          totalShuttle: (m.totalShuttle || 0) + delta
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
        balance: m.balance + costChange,
        totalShuttle: (m.totalShuttle || 0) + costChange
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
        paidCourtFee: (m.courtBalance - courtRefund) > 0,
        totalShuttle: Math.max(0, (m.totalShuttle || 0) - shuttleCost),
        totalCourt: Math.max(0, (m.totalCourt || 0) - courtRefund)
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

    // Check if partial
    const totalDebt = member.balance + otherMembers.reduce((sum, m) => sum + m.balance, 0);
    const isFullPayment = amount >= totalDebt;

    const note = otherMemberIds.length > 0
      ? `จ่ายรวม${isFullPayment ? '' : ' (บางส่วน)'}: ${otherNames}`
      : `${member.gamesPlayed} เกม${isFullPayment ? '' : ' (จ่ายบางส่วน)'}`;

    const recordDetails = {
      courtBalance: member.courtBalance + otherMembers.reduce((sum, m) => sum + m.courtBalance, 0),
      shuttleBalance: member.shuttleBalance + otherMembers.reduce((sum, m) => sum + m.shuttleBalance, 0),
      snackHistory: [
        ...member.snackHistory,
        ...otherMembers.flatMap(m => m.snackHistory)
      ]
    };

    const record: PaymentRecord = {
      id: Math.random().toString(36).substr(2, 9),
      memberId,
      memberName: member.name,
      memberRank: member.rank,
      amount,
      timestamp: Date.now(),
      method,
      note,
      details: recordDetails
    };

    setPaymentHistory(prev => [record, ...prev]);

    setMembers(prev => {
      let remainingPayment = amount;
      const next = [...prev];

      for (const id of allMemberIds) {
        const idx = next.findIndex(m => m.id === id);
        if (idx === -1) continue;
        const m = { ...next[idx] };

        if (remainingPayment <= 0) break;

        const debtToClear = Math.min(m.balance, remainingPayment);
        m.balance -= debtToClear;
        remainingPayment -= debtToClear;

        // Track who paid for whom
        if (id !== memberId && debtToClear > 0) {
          m.paidBy = memberId;
          m.paidByName = member.name;
        }

        if (m.balance <= 0) {
          m.balance = 0;
          m.courtBalance = 0;
          m.shuttleBalance = 0;
          m.snackBalance = 0;
          m.snackHistory = [];
          m.shuttleCount = 0;
          m.paidCourtFee = true;
          m.status = 'paid';
        } else {
          // Adjust granular balances down
          let leftToClear = debtToClear;

          const snackClear = Math.min(m.snackBalance, leftToClear);
          m.snackBalance -= snackClear;
          leftToClear -= snackClear;

          const courtClear = Math.min(m.courtBalance, leftToClear);
          m.courtBalance -= courtClear;
          leftToClear -= courtClear;

          const shuttleClear = Math.min(m.shuttleBalance, leftToClear);
          m.shuttleBalance -= shuttleClear;
          leftToClear -= shuttleClear;
        }

        next[idx] = m;
      }
      return next;
    });
  };

  const reOpenSession = (memberId: string) => {
    setMembers(prev => prev.map(m => m.id === memberId
      ? { ...m, status: 'waiting', checkInTime: Date.now() }
      : m));
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
            checkInTime: isSessionImport ? (now + i) : current[existingIndex].checkInTime,
            ...(isSessionImport ? {
              balance: 0,
              courtBalance: 0,
              shuttleBalance: 0,
              snackBalance: 0,
              shuttleCount: 0,
              gamesPlayed: 0,
              snackHistory: [],
              paidCourtFee: false,
              totalCourt: 0,
              totalShuttle: 0,
              totalSnack: 0
            } : {})
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
            totalCourt: 0, totalShuttle: 0, totalSnack: 0,
          });
        }
      });
      // Sync to cloud removed
      return current;
    });
  };

  const removeMember = (memberId: string) => {
    if (!confirm('ยืนยันการลบสมาชิกออกจากฐานข้อมูลถาวร? (จะหายไปจาก Cloud ด้วย)')) return;
    setCourts(prev => prev.map(c => ({ ...c, players: c.players.map(p => p === memberId ? null : p) })));
    setMembers(prev => {
      const next = prev.filter(m => m.id !== memberId);
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
      return next;
    });
  };

  const bulkUpdateRank = (memberIds: string[], rank: Rank) => {
    setMembers(prev => {
      const next = prev.map(m => memberIds.includes(m.id) ? { ...m, rank } : m);
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
    <>
      <AnimatePresence>
        {isInitialLoading && <SplashScreen key="splash" />}
      </AnimatePresence>

      <div className="min-h-screen bg-background flex flex-col lg:flex-row">
        {/* Sidebar */}
        <aside className={cn(
          "hidden lg:flex flex-col fixed left-0 top-0 h-screen bg-surface-container border-r border-on-surface/5 transition-all duration-300 z-[100]",
          isSidebarCollapsed ? "w-20 p-2" : "w-64 p-4"
        )}>
          <div className={cn("mb-8 flex items-center gap-3 transition-all", isSidebarCollapsed ? "justify-center pt-4" : "px-2 pt-6")}>
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-black italic text-xl shadow-lg shadow-primary/20 shrink-0">TJ</div>
            {!isSidebarCollapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h4 className="font-headline font-black text-lg text-on-surface tracking-tight">เตียเจริญ</h4>
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest">by เน็ตน่ารัก</p>
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

            {/* Cloud Status Indicator */}
            <div className="px-5 pb-6">
              <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center">
                  <div className={cn("w-2.5 h-2.5 rounded-full transition-all duration-500", isSyncing ? "bg-primary animate-pulse scale-110 shadow-[0_0_12px_rgba(var(--primary-rgb),0.6)]" : "bg-green-500 shadow-[0_0_8px_rgba(22,163,74,0.4)]")} />
                  {isSyncing && <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-primary animate-ping opacity-40" />}
                </div>
                {!isSidebarCollapsed && (
                  <span className={cn("text-[9px] font-black uppercase tracking-[0.2em] transition-colors duration-300", isSyncing ? "text-primary italic" : "text-on-surface/30")}>
                    {isSyncing ? "Cloud Synchronizing..." : "DB Connected & Synced"}
                  </span>
                )}
              </div>
            </div>

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
          <AddMemberModal
            open={showAddMember}
            onClose={() => setShowAddMember(false)}
            onAdd={addMember}
            existingNames={members.map(m => m.name)}
            rankMemory={rankMemory}
          />
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
                    onUpdateRank={updateMemberRank}
                    onRemoveSnack={removeSnackFromMember}
                    onUpdateSnackPrice={updateSnackPrice}
                    viewingSession={viewingSession}
                    onCloseSession={() => setViewingSession(null)}
                    sessionHistory={sessionHistory}
                    onViewSession={(s) => setViewingSession(s)}
                    onProcessPayment={processPayment}
                    onReOpen={reOpenSession}
                    onPullSession={pullSessionData}
                    isSyncing={isSyncing}
                    onAddCourt={() => setShowAddCourt(true)}
                    isSidebarCollapsed={isSidebarCollapsed}
                    onCheckIn={checkInMember}
                    onRemove={removeFromSession}
                    onResetDay={resetDay}
                    onClearBoard={clearBoard}
                    onUpdateGame={updateGame}
                    onAddSnack={addSnacksToMember}
                    onImportLine={() => { setImportIsSession(true); setShowImport(true); }}
                  />
                )}
                {activeTab === 'logs' && (
                  <LogsTab 
                    gameHistory={gameHistory} 
                    sessionHistory={sessionHistory} 
                    members={members}
                    onViewSession={setViewingSession} 
                    onActiveTab={setActiveTab}
                    onUpdateGame={updateGame}
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
                    onDeleteCourt={deleteCourt} onAddSnack={addSnacksToMember}
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
    </>
  );
}

// ── SplashScreen Component ───────────────────────────────────────────────────
function SplashScreen() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="fixed inset-0 z-[1000] bg-on-surface flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Background Orbs */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-secondary/10 rounded-full blur-[120px]" />

      <div className="relative flex flex-col items-center">
        {/* Animated Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2, type: "spring" }}
          className="w-24 h-24 bg-primary rounded-full flex items-center justify-center text-white italic text-5xl font-black shadow-[0_0_50px_rgba(var(--primary-rgb),0.4)] mb-8"
        >
          TJ
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center"
        >
          <h1 className="font-headline font-black text-4xl text-white tracking-tighter mb-2">เตียเจริญ</h1>
          <p className="text-xs font-black text-primary uppercase tracking-[0.4em] ml-1">by เน็ตน่ารัก</p>
        </motion.div>

        {/* High-end loading bar */}
        <div className="mt-12 w-48 h-1 bg-white/10 rounded-full overflow-hidden relative">
          <motion.div
            initial={{ left: "-100%" }}
            animate={{ left: "100%" }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-primary to-transparent"
          />
        </div>

        <p className="mt-6 text-[9px] font-black text-white/20 uppercase tracking-widest animate-pulse">Synchronizing with Cloud DB...</p>
      </div>

      {/* Shuttlecock animation */}
      <motion.div
        animate={{
          y: [0, -20, 0],
          rotate: [0, 15, -15, 0]
        }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-12 text-3xl opacity-10"
      >
        🏸
      </motion.div>
    </motion.div>
  );
}

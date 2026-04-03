import React, { useState, useMemo, useEffect } from 'react';
import { Users, LayoutDashboard, Trophy, Banknote, UserPlus, Search, ShoppingCart, History } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { Member, Court, Rank, RANKS, RANK_COLORS, Snack, PaymentRecord, GameRecord, DEFAULT_SNACKS } from './types';
import { format } from 'date-fns';
import confetti from 'canvas-confetti';

import { DashboardTab } from './components/DashboardTab';
import { CourtsTab } from './components/CourtsTab';
import { MembersTab } from './components/MembersTab';
import { FinanceTab } from './components/FinanceTab';
import { AddMemberModal } from './components/AddMemberModal';
import { AddCourtModal } from './components/AddCourtModal';
import { ManageProductsModal } from './components/ManageProductsModal';
import { ImportMembersModal } from './components/ImportMembersModal';
import { LogsTab } from './components/LogsTab';
import { RANK_WEIGHTS } from './types';

type Tab = 'dashboard' | 'members' | 'courts' | 'finance' | 'logs';

const mkMember = (id: string, name: string, rank: Rank, gamesPlayed: number, offset: number): Member => ({
  id, name, rank, gamesPlayed,
  checkInTime: Date.now() - offset,
  status: 'waiting',
  balance: 0, courtBalance: 0, shuttleBalance: 0, shuttleCount: 0, snackBalance: 0,
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

  // Load from localStorage
  useEffect(() => {
    const mems = localStorage.getItem('smashit_members');
    const crts = localStorage.getItem('smashit_courts');
    const hist = localStorage.getItem('smashit_history');
    const pays = localStorage.getItem('smashit_payments');
    const setting_fee = localStorage.getItem('smashit_fee');
    const setting_shuttle = localStorage.getItem('smashit_shuttle');

    if (mems) setMembers(JSON.parse(mems));
    else setMembers(INITIAL_MEMBERS);

    if (crts) setCourts(JSON.parse(crts));
    else setCourts(INITIAL_COURTS);

    if (hist) setGameHistory(JSON.parse(hist));
    if (pays) setPaymentHistory(JSON.parse(pays));
    if (setting_fee) setCourtFeePerPerson(Number(setting_fee));
    if (setting_shuttle) setShuttlePrice(Number(setting_shuttle));
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (members.length > 0) localStorage.setItem('smashit_members', JSON.stringify(members));
    if (courts.length > 0) localStorage.setItem('smashit_courts', JSON.stringify(courts));
    localStorage.setItem('smashit_history', JSON.stringify(gameHistory));
    localStorage.setItem('smashit_payments', JSON.stringify(paymentHistory));
    localStorage.setItem('smashit_fee', courtFeePerPerson.toString());
    localStorage.setItem('smashit_shuttle', shuttlePrice.toString());
  }, [members, courts, gameHistory, paymentHistory, courtFeePerPerson, shuttlePrice]);

  const resetDay = () => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการเริ่มวันใหม่? (ล้างประวัติการตีและรีเซ็ตคอร์ด)')) return;
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
      paidCourtFee: false,
      status: 'waiting',
      checkInTime: Date.now()
    })));
  };

  const factoryReset = () => {
    if (!confirm('!!! คำเตือน !!! คุณแน่ใจหรือไม่ว่าต้องการล้างข้อมูลทั้งหมด? ข้อมูลสมาชิกและประวัติทั้งหมดจะหายไป')) return;
    localStorage.clear();
    location.reload();
  };
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddCourt, setShowAddCourt] = useState(false);
  const [showManageProducts, setShowManageProducts] = useState(false);
  const [showImport, setShowImport] = useState(false);

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
      ? { ...m, balance: m.balance + snack.price, snackBalance: m.snackBalance + snack.price }
      : m));
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
        ? { ...m, 
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

  const updateMemberRank = (memberId: string, rank: Rank) => {
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, rank } : m));
  };

  const markAsPaid = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (!member || member.balance === 0) return;
    const record: PaymentRecord = {
      id: Math.random().toString(36).substr(2, 9),
      memberId,
      memberName: member.name,
      memberRank: member.rank,
      amount: member.balance,
      paidAt: Date.now(),
      note: `${member.gamesPlayed} เกม`,
    };
    setPaymentHistory(prev => [record, ...prev]);
    setMembers(prev => prev.map(m => m.id === memberId
      ? { ...m, balance: 0, courtBalance: 0, shuttleBalance: 0, snackBalance: 0 } : m));
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

  const addMember = (name: string, rank: Rank) => {
    setMembers(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      name, rank, gamesPlayed: 0,
      checkInTime: Date.now(),
      status: 'waiting',
      balance: 0, courtBalance: 0, shuttleBalance: 0, snackBalance: 0,
      paidCourtFee: false,
    }]);
    setShowAddMember(false);
  };

  const importMembers = (list: { name: string; rank: Rank }[]) => {
    const now = Date.now();
    setMembers(prev => [
      ...prev,
      ...list.map((m, i) => ({
        id: Math.random().toString(36).substr(2, 9),
        name: m.name, rank: m.rank,
        gamesPlayed: 0,
        checkInTime: now + i,
        status: 'waiting' as const,
        balance: 0, courtBalance: 0, shuttleBalance: 0, snackBalance: 0,
        paidCourtFee: false,
      }))
    ]);
  };

  const removeMember = (memberId: string) => {
    setCourts(prev => prev.map(c => ({ ...c, players: c.players.map(p => p === memberId ? null : p) })));
    setMembers(prev => prev.filter(m => m.id !== memberId));
  };

  const tabs = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'ภาพรวม' },
    { id: 'members', icon: Users, label: 'สมาชิก' },
    { id: 'courts', icon: Trophy, label: 'คอร์ด' },
    { id: 'logs', icon: History, label: 'บันทึก' },
    { id: 'finance', icon: Banknote, label: 'การเงิน' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-screen w-64 bg-surface-container p-4 gap-2 border-r border-on-surface/5 pt-6">
        <div className="mb-8 px-2 flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-black italic text-xl shadow-lg shadow-primary/20">S</div>
          <div>
            <h4 className="font-headline font-black text-lg text-on-surface tracking-tight">SmashIT</h4>
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Organizer Pro</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1">
          {tabs.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id as Tab)}
              className={cn('w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-200',
                activeTab === item.id ? 'bg-white text-primary shadow-sm translate-x-1' : 'text-on-surface/60 hover:text-on-surface hover:bg-white/50')}>
              <item.icon size={20} />{item.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto pt-4 border-t border-on-surface/5 space-y-4">
          <div className="bg-primary/5 p-4 rounded-2xl">
            <p className="text-[10px] font-black text-primary uppercase mb-1">รายรับวันนี้</p>
            <p className="text-xl font-headline font-black text-on-surface">
              ฿{(members.reduce((a, m) => a + m.balance, 0) + paymentHistory.reduce((a, r) => a + r.amount, 0)).toLocaleString()}
            </p>
          </div>
          <button onClick={() => setShowManageProducts(true)}
            className="w-full flex items-center gap-3 px-4 py-3 text-primary/80 font-bold hover:bg-primary/5 rounded-xl transition-colors">
            <ShoppingCart size={18} />จัดการสินค้า
          </button>
        </div>
      </aside>

      {/* Modals */}
      <AddMemberModal open={showAddMember} onClose={() => setShowAddMember(false)} onAdd={addMember} />
      <AddCourtModal open={showAddCourt} onClose={() => setShowAddCourt(false)} onAdd={addCourt} />
      <ManageProductsModal open={showManageProducts} onClose={() => setShowManageProducts(false)} snacks={snacks} onSave={setSnacks} />
      <ImportMembersModal open={showImport} onClose={() => setShowImport(false)} onImport={importMembers} />

      {/* Main */}
      <main className="flex-1 lg:ml-64 p-4 md:p-8 court-texture pb-24 lg:pb-8">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl md:text-5xl font-headline font-black text-on-surface tracking-tighter">
              {tabs.find(t => t.id === activeTab)?.label}
            </h1>
            <p className="text-on-surface-variant font-medium text-sm">{format(new Date(), 'EEEE, do MMMM yyyy')}</p>
          </div>
          <div className="flex items-center gap-3">
            {(activeTab === 'courts' || activeTab === 'members') && (
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface/40 group-focus-within:text-primary transition-colors" size={18} />
                <input type="text" placeholder="ค้นหาผู้เล่น..." value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-3 bg-white border-none rounded-2xl shadow-sm focus:ring-2 focus:ring-primary/20 w-full md:w-56 transition-all" />
              </div>
            )}
            {activeTab === 'members' && (
              <>
                <button onClick={() => setShowImport(true)}
                  className="flex items-center gap-2 bg-white border-2 border-primary/20 text-primary px-4 py-3 rounded-2xl font-bold text-sm hover:bg-primary/5 transition-colors">
                  📋 นำเข้าจากไลน์
                </button>
                <button onClick={() => setShowAddMember(true)}
                  className="bg-primary text-white p-3 rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-transform">
                  <UserPlus size={24} />
                </button>
              </>
            )}
            {activeTab === 'courts' && (
              <button onClick={() => setShowAddCourt(true)}
                className="bg-primary text-white px-5 py-3 rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-transform font-bold flex items-center gap-2">
                <Trophy size={18} />+ เพิ่มคอร์ด
              </button>
            )}
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            {activeTab === 'dashboard' && (
              <DashboardTab
                members={members} courts={courts} snacks={snacks}
                paymentHistory={paymentHistory} gameHistory={gameHistory}
                courtFeePerPerson={courtFeePerPerson} setCourtFeePerPerson={setCourtFeePerPerson}
                shuttlePrice={shuttlePrice} setShuttlePrice={setShuttlePrice}
                onAddSnack={addSnackToMember}
                onUpdateShuttles={updateMemberShuttles}
                onUpdateRank={updateMemberRank}
                onResetDay={resetDay}
                onFactoryReset={factoryReset}
              />
            )}
            {activeTab === 'logs' && (
              <LogsTab gameHistory={gameHistory} />
            )}
            {activeTab === 'members' && (
              <MembersTab 
                members={members} 
                searchQuery={searchQuery} 
                onRemove={removeMember} 
                onAddMember={() => setShowAddMember(true)} 
                onUpdateRank={updateMemberRank}
              />
            )}
            {activeTab === 'courts' && (
              <CourtsTab
                members={members} courts={courts} snacks={snacks}
                searchQuery={searchQuery} gameHistory={gameHistory}
                onAutoMatch={autoMatch} onStartGame={startGame} onResetCourt={resetCourt}
                onRemovePlayer={removePlayerFromCourt} onAddPlayer={addPlayerToCourt}
                onDeleteCourt={deleteCourt} onAddSnack={addSnackToMember}
                onEditGame={editGame} onUpdateCourt={setCourts}
                minRankFilter={minRankFilter} setMinRankFilter={setMinRankFilter}
                maxRankFilter={maxRankFilter} setMaxRankFilter={setMaxRankFilter}
              />
            )}
            {activeTab === 'finance' && (
              <FinanceTab members={members} paymentHistory={paymentHistory} onMarkAsPaid={markAsPaid} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

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

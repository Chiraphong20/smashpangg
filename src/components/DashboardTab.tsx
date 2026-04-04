import React, { useState, useEffect } from 'react';
import { Trophy, Users, Banknote, TrendingUp, ChevronDown, ChevronUp, X, ShoppingCart, Plus, RefreshCw, Trash2, Clock, Search, Monitor, Calendar, History, CheckCircle2, Cloud, Upload, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Member, Court, PaymentRecord, GameRecord, Snack, Rank, RANKS, RANK_COLORS, RANK_LEVEL_LABELS, SessionRecord } from '../types';
import { format } from 'date-fns';
import { POSModal } from './POSModal';

interface Props {
  members: Member[];
  courts: Court[];
  snacks: Snack[];
  paymentHistory: PaymentRecord[];
  gameHistory: GameRecord[];
  courtFeePerPerson: number;
  setCourtFeePerPerson: (v: number) => void;
  shuttlePrice: number;
  setShuttlePrice: (v: number) => void;
  onAddSnack: (memberId: string, snack: Snack) => void;
  onUpdateShuttles: (memberId: string, delta: number) => void;
  onUpdateRank: (memberId: string, rank: Rank) => void;
  onRemoveSnack: (memberId: string, snackIndex: number) => void;
  viewingSession: SessionRecord | null;
  onCloseSession: () => void;
  sessionHistory: SessionRecord[];
  onViewSession: (s: SessionRecord) => void;
  googleSheetUrl: string;
  setGoogleSheetUrl: (v: string) => void;
  onSync: () => Promise<void>;
  isSyncing: boolean;
  onProcessPayment: (memberId: string, amount: number, method?: string, otherMemberIds?: string[]) => void;
  onUpdateSnackPrice: (memberId: string, index: number, price: number) => void;
  onSeedMockHistory: () => void;
  onResetDay: () => void;
  onFactoryReset: () => void;
  rankMemory: Record<string, Rank>;
  onPushCloud: () => Promise<void>;
  onPullCloud: () => Promise<void>;
}

// Modal showing a player's checkout details (snacks, games, and payment)
function CheckoutModal({ member, gameHistory, otherMembers, initialOthers = [], onUpdateRank, onRemoveSnack, onUpdateSnackPrice, onPay, isReadOnly, onClose }: {
  member: Member;
  gameHistory: GameRecord[];
  otherMembers: Member[];
  initialOthers?: string[];
  onUpdateRank: (memberId: string, rank: Rank) => void;
  onRemoveSnack: (memberId: string, snackIndex: number) => void;
  onUpdateSnackPrice: (memberId: string, index: number, price: number) => void;
  onPay: (amount: number, otherMemberIds: string[]) => void;
  isReadOnly: boolean;
  onClose: () => void;
}) {
  const [selectedOthers] = useState<string[]>(initialOthers);
  const myGames = gameHistory.filter(g => g.players.some(p => p.id === member.id));
  
  const othersNames = otherMembers.filter(m => selectedOthers.includes(m.id)).map(m => m.name).join(', ');
  const totalBalance = member.balance + otherMembers.filter(m => selectedOthers.includes(m.id)).reduce((a, b) => a + b.balance, 0);
  
  const [manualAmount, setManualAmount] = useState<number | null>(null);
  const displayAmount = manualAmount !== null ? manualAmount : totalBalance;

  const [editingSnackIndex, setEditingSnackIndex] = useState<number | null>(null);
  const [tempPrice, setTempPrice] = useState<string>('');

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-on-surface/50 backdrop-blur-sm" />
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-[2.5rem] w-full max-w-2xl p-8 shadow-2xl relative z-10 max-h-[85vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center gap-5 mb-6">
          <div className="relative group/rank">
            <div className={cn('w-16 h-16 rounded-[1.5rem] flex items-center justify-center font-black text-xl shrink-0 shadow-lg', RANK_COLORS[member.rank])}>
              {member.rank}
            </div>
            {!isReadOnly && (
              <select
                value={member.rank}
                onChange={(e) => onUpdateRank(member.id, e.target.value as Rank)}
                className="absolute inset-0 opacity-0 cursor-pointer"
              >
                {[...RANKS].map(r => (
                  <option key={r} value={r}>{r} ({RANK_LEVEL_LABELS[r]})</option>
                ))}
              </select>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-headline font-black text-3xl tracking-tight leading-none mb-2">{member.name}</h2>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-primary px-2 py-0.5 bg-primary/5 rounded-full">{RANK_LEVEL_LABELS[member.rank]}</span>
              <span className="text-on-surface/20">•</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-on-surface/40">{member.gamesPlayed} เกมส์</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 rounded-full hover:bg-background shrink-0 text-on-surface/20 hover:text-on-surface transition-colors"><X size={24} /></button>
        </div>

        {/* Cost summary cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-primary/5 rounded-[1.5rem] p-4 text-center border border-primary/5">
            <p className="text-[9px] font-black uppercase text-primary/40 tracking-widest mb-1">ค่าสนาม</p>
            <p className="font-headline font-black text-2xl text-primary">฿{member.courtBalance.toFixed(0)}</p>
          </div>
          <div className="bg-secondary/5 rounded-[1.5rem] p-4 text-center border border-secondary/5">
            <p className="text-[9px] font-black uppercase text-secondary/40 tracking-widest mb-1">ค่าลูก</p>
            <p className="font-headline font-black text-2xl text-secondary">฿{member.shuttleBalance.toFixed(0)}</p>
          </div>
          <div className="bg-tertiary/5 rounded-[1.5rem] p-4 text-center border border-tertiary/5 shadow-inner">
            <p className="text-[9px] font-black uppercase text-tertiary/40 tracking-widest mb-1">สินค้า</p>
            <p className="font-headline font-black text-2xl text-tertiary">฿{member.snackBalance.toFixed(0)}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-6 min-h-0 pr-1 custom-scrollbar">
          {/* Detailed Snack List */}
          {member.snackHistory?.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-black text-[10px] text-on-surface/30 uppercase tracking-widest flex items-center gap-2">
                <ShoppingCart size={12} /> รายละเอียดน้ำ/ขนม
              </h3>
              <div className="bg-background rounded-3xl p-4 space-y-2.5">
                {member.snackHistory.map((s, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3 group/snk">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-tertiary/20" />
                      <p className="text-sm font-bold truncate text-on-surface/70">{s.name}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {editingSnackIndex === idx ? (
                        <input 
                          type="number"
                          autoFocus
                          value={tempPrice}
                          onChange={e => setTempPrice(e.target.value)}
                          onBlur={() => {
                            const p = parseFloat(tempPrice);
                            if (!isNaN(p)) onUpdateSnackPrice(member.id, idx, p);
                            setEditingSnackIndex(null);
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              const p = parseFloat(tempPrice);
                              if (!isNaN(p)) onUpdateSnackPrice(member.id, idx, p);
                              setEditingSnackIndex(null);
                            }
                          }}
                          className="w-16 px-1.5 py-0.5 bg-white border border-primary/20 rounded text-xs font-black text-on-surface focus:ring-1 focus:ring-primary/20 outline-none"
                        />
                      ) : (
                        <button 
                          onClick={() => {
                            if (!isReadOnly) {
                              setEditingSnackIndex(idx);
                              setTempPrice(s.price.toString());
                            }
                          }}
                          className="text-xs font-black text-on-surface/80 hover:text-primary transition-colors decoration-dotted hover:underline"
                        >
                          ฿{s.price}
                        </button>
                      )}
                      {!isReadOnly && (
                        <button
                          onClick={() => onRemoveSnack(member.id, idx)}
                          className="p-1.5 rounded-lg bg-red-500/5 text-red-500/30 hover:bg-red-500 hover:text-white transition-all shadow-sm opacity-0 group-hover/snk:opacity-100"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Game History with Partners */}
          <div className="space-y-3">
            <h3 className="font-black text-[10px] text-on-surface/30 uppercase tracking-widest flex items-center gap-2">
              <Trophy size={12} /> รายละเอียดการตี
            </h3>
            {myGames.length === 0 ? (
              <p className="text-center py-6 text-on-surface/20 text-xs font-bold italic">ไม่มีประวัติการตีในรอบนี้</p>
            ) : (
              <div className="space-y-3">
                {myGames.map((g, idx) => {
                  const partners = g.players.filter(p => p.id !== member.id);
                  return (
                    <div key={g.id} className="bg-background rounded-3xl p-5 border border-on-surface/5 hover:border-primary/20 transition-all group/game">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary">
                            {myGames.length - idx}
                          </div>
                          <div>
                            <p className="text-sm font-black text-on-surface/80">{g.courtName}</p>
                            <p className="text-[10px] text-on-surface/40 font-bold">{format(g.playedAt, 'HH:mm น.')}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-on-surface/40 font-bold mb-0.5">ใช้ {g.shuttlesUsed} ลูก</p>
                          <p className="text-sm font-black text-primary">฿{(g.shuttleCostPerPerson + (g.courtFeePerPerson || 0)).toFixed(0)}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {partners.map(p => (
                          <span key={p.id} className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white border border-on-surface/5 rounded-lg text-[10px] font-bold text-on-surface/60">
                            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", RANK_COLORS[p.rank])} />
                            {p.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>


        {/* Bulk Payment Details label */}
        {!isReadOnly && selectedOthers.length > 0 && (
          <div className="mt-4 px-5 py-4 bg-primary/5 rounded-3xl border border-primary/10">
            <h4 className="text-[10px] font-black uppercase text-primary/60 tracking-widest mb-3">รายชื่อคนอื่นๆ ที่จ่ายร่วมกัน</h4>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {otherMembers.filter(m => selectedOthers.includes(m.id)).map(m => (
                <div key={m.id} className="flex items-center justify-between text-xs font-bold">
                  <span className="text-on-surface/60">{m.name}</span>
                  <span className="text-tertiary">฿{m.balance.toFixed(0)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Checkout */}
        <div className="mt-8 pt-6 border-t border-on-surface/5 flex items-center justify-between gap-6">
          <div className="flex-1">
            <p className="text-[10px] font-black uppercase text-on-surface/30 tracking-widest mb-1">ยอดชำระจริง (แก้ได้)</p>
            <div className="flex items-baseline gap-1 group">
              <span className="font-black text-2xl text-error/40 group-focus-within:text-error transition-colors">฿</span>
              <input 
                type="number"
                value={displayAmount}
                onChange={(e) => setManualAmount(Number(e.target.value))}
                className="bg-transparent border-none p-0 font-headline font-black text-4xl text-error tracking-tight focus:ring-0 w-full"
              />
            </div>
            {manualAmount !== null && manualAmount !== totalBalance && (
              <p className="text-[9px] font-bold text-primary uppercase mt-1 italic">* ปรับยอดจาก ฿{totalBalance.toFixed(0)}</p>
            )}
          </div>
          {!isReadOnly && displayAmount >= 0 && (
            <button
              onClick={() => onPay(displayAmount, selectedOthers)}
              className="flex-1 max-w-[200px] flex items-center justify-center gap-3 bg-primary text-white py-4 rounded-[1.5rem] font-black text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
            >
              <Banknote size={24} />
              รับเงิน
            </button>
          )}
          {member.balance === 0 && member.gamesPlayed > 0 && (
            <div className="flex items-center gap-2 text-green-500 font-black text-sm px-5 py-3 bg-green-500/10 rounded-2xl">
              <CheckCircle2 size={20} />
              ชำระเงินเรียบร้อย
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export function DashboardTab({
  members, courts, snacks, paymentHistory, gameHistory,
  courtFeePerPerson, setCourtFeePerPerson, shuttlePrice, setShuttlePrice,
  onAddSnack, onUpdateShuttles, onUpdateRank, onRemoveSnack, onUpdateSnackPrice, viewingSession, onCloseSession, 
  sessionHistory, onViewSession,
  googleSheetUrl, setGoogleSheetUrl, onSync, isSyncing, onProcessPayment, onSeedMockHistory,
  onResetDay, onFactoryReset, rankMemory, onPushCloud, onPullCloud
}: Props) {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [posTarget, setPosTarget] = useState<Member | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dbSearch, setDbSearch] = useState('');
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [bulkCheckout, setBulkCheckout] = useState<{member: Member, others: string[]} | null>(null);

  const isReadOnly = !!viewingSession;
  const currentMembers = viewingSession ? viewingSession.membersSnapshot : members;
  const currentPayments = viewingSession ? viewingSession.paymentHistory : paymentHistory;

  // Keyboard shortcut: Press Enter to checkout selected members
  useEffect(() => {
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && checkedIds.length > 0 && !bulkCheckout && !selectedMember && !posTarget && !settingsOpen) {
        // If user is focused on a text input, don't trigger (unless it's a checkbox)
        const active = document.activeElement as HTMLElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
          if ((active as HTMLInputElement).type !== 'checkbox') return;
        }
        
        const mainMember = currentMembers.find(m => m.id === checkedIds[0]);
        if (mainMember) {
          setBulkCheckout({ member: mainMember, others: checkedIds.slice(1) });
        }
      }
    };
    window.addEventListener('keyup', handleKeyUp);
    return () => window.removeEventListener('keyup', handleKeyUp);
  }, [checkedIds, bulkCheckout, selectedMember, posTarget, settingsOpen, currentMembers]);

  const filteredMembers = currentMembers
    .filter(m => m.name.toLowerCase().includes(dbSearch.toLowerCase()))
    .sort((a, b) => b.gamesPlayed - a.gamesPlayed || b.balance - a.balance);

  const activePlayers = currentMembers.filter(m => m.status === 'playing').length;
  const waitingPlayers = currentMembers.filter(m => m.status === 'waiting').length;
  const activeCourts = courts.filter(c => c.players.some(Boolean)).length;
  const totalPending = currentMembers.reduce((a, m) => a + m.balance, 0);
  const totalPaid = currentPayments.reduce((a, r) => a + r.amount, 0);

  return (
    <div className="space-y-4">
      {/* Dashboard Header with Session Selector (Compact) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white px-6 py-4 rounded-3xl shadow-sm border border-on-surface/5">
        <div className="flex items-center gap-4">
          <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center shadow-inner transition-colors", isReadOnly ? "bg-primary/10 text-primary" : "bg-green-500/10 text-green-500")}>
            <Monitor size={22} />
          </div>
          <div>
            <h2 className="font-headline font-black text-xl tracking-tight leading-none mb-1">
              {isReadOnly ? "ประวัติย้อนหลัง" : "Live Monitor"}
            </h2>
            <p className="text-[9px] font-bold text-on-surface/40 uppercase tracking-widest flex items-center gap-2">
              <span className={cn("w-2 h-2 rounded-full animate-pulse", isReadOnly ? "bg-primary" : "bg-green-500")} />
              {isReadOnly ? `ข้อมูลสรุปของ ${format(viewingSession!.date, 'do MMM yyyy')}` : "กระดานสรุปผลสด (เรียลไทม์)"}
            </p>
          </div>
        </div>

        <div className="flex bg-background p-1.5 rounded-3xl gap-1.5 shadow-inner">
          <div className="relative group">
            <Calendar size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface/30 group-focus-within:text-primary transition-colors z-10" />
            <input 
              type="date"
              value={isReadOnly ? format(viewingSession!.date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')}
              max={format(new Date(), 'yyyy-MM-dd')}
              onChange={(e) => {
                const selected = e.target.value;
                const today = format(new Date(), 'yyyy-MM-dd');
                
                if (selected === today) {
                  onCloseSession();
                } else {
                  const s = sessionHistory.find(sh => format(sh.date, 'yyyy-MM-dd') === selected);
                  if (s) onViewSession(s);
                  else {
                    onViewSession({
                      id: `empty-${selected}`,
                      date: new Date(selected).getTime(),
                      membersSnapshot: [],
                      gameHistory: [],
                      paymentHistory: []
                    });
                  }
                }
              }}
              className="bg-white pl-10 pr-4 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest text-on-surface/60 outline-none border border-on-surface/5 focus:border-primary/20 appearance-none transition-all cursor-pointer min-w-[200px]"
            />
          </div>
          
          {isReadOnly ? (
            <button
              onClick={onCloseSession}
              className="px-6 py-2.5 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
            >
              <Monitor size={14} /> ดูวันนี้
            </button>
          ) : (
            <button
              onClick={onResetDay}
              className="px-6 py-2.5 bg-error text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-error/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
            >
              <RefreshCw size={14} /> จบวันและสรุปยอด
            </button>
          )}
        </div>
      </div>

      {/* POS modal for manual charging from dashboard */}
      <AnimatePresence>
        {posTarget && (
          <POSModal
            member={currentMembers.find(m => m.id === posTarget.id) || posTarget}
            snacks={snacks}
            onAddSnack={onAddSnack}
            onClose={() => setPosTarget(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Quick Stats ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'เล่นอยู่', value: activePlayers, icon: Trophy, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'รอในคิว', value: waitingPlayers, icon: Users, color: 'text-secondary', bg: 'bg-secondary/10' },
          { label: 'คอร์ดใช้งาน', value: `${activeCourts}/${courts.length}`, icon: Banknote, color: 'text-tertiary', bg: 'bg-tertiary/10' },
          { label: 'รายรับรวม (฿)', value: (totalPending + totalPaid).toLocaleString(), icon: TrendingUp, color: 'text-error', bg: 'bg-error/10' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-3xl p-5 shadow-sm border border-on-surface/5">
            <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center mb-3', s.bg)}>
              <s.icon size={22} className={s.color} />
            </div>
            <p className="text-3xl font-headline font-black">{s.value}</p>
            <p className="text-[10px] font-bold text-on-surface/40 uppercase tracking-widest mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Main Player Table ── */}
      <div className="bg-white rounded-3xl shadow-sm border border-on-surface/5 overflow-hidden">
        <div className="px-6 py-4 border-b border-on-surface/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h2 className="font-headline font-black text-xl">ตารางผู้เล่น</h2>
            <p className="hidden md:block text-xs text-on-surface/40 font-bold">กดแถวรายการเพื่อคิดเงินหรือดูรายละเอียด</p>
          </div>
          <div className="relative group flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface/30 group-focus-within:text-primary transition-colors" size={14} />
            <input
              type="text"
              placeholder="ค้นหาชื่อลูกค้า..."
              value={dbSearch}
              onChange={e => setDbSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none shadow-sm transition-all"
            />
          </div>
        </div>

        {/* Table header */}
        <div className="grid grid-cols-12 gap-2 px-6 py-3 bg-background text-[10px] font-black uppercase tracking-widest text-on-surface/40 border-b border-on-surface/5">
          <div className="col-span-3 flex items-center gap-3">
            {!isReadOnly && (
              <input 
                type="checkbox" 
                checked={checkedIds.length === filteredMembers.filter(m => m.balance > 0).length && checkedIds.length > 0}
                onChange={(e) => {
                  if (e.target.checked) setCheckedIds(filteredMembers.filter(m => m.balance > 0).map(m => m.id));
                  else setCheckedIds([]);
                }}
                className="w-4 h-4 rounded border-on-surface/10 text-primary focus:ring-primary/20"
              />
            )}
            <span>ชื่อ / ระดับ</span>
          </div>
          <div className="col-span-1 text-center">เกม</div>
          <div className="col-span-2 text-right">ค่าสนาม</div>
          <div className="col-span-2 text-right">ค่าลูก</div>
          <div className="col-span-2 text-right">สินค้า</div>
          <div className="col-span-2 text-right text-error font-black">ยอดรวม</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-on-surface/5 overflow-y-auto max-h-[60vh] custom-scrollbar">
          {filteredMembers.length === 0 ? (
            <div className="px-6 py-20 text-center space-y-4">
              <div className="w-16 h-16 bg-on-surface/5 rounded-full flex items-center justify-center mx-auto text-on-surface/20">
                <Calendar size={32} />
              </div>
              <div>
                <p className="text-lg font-black text-on-surface/40">วันนี้ไม่ได้มีตีเกม</p>
                <p className="text-xs text-on-surface/20 font-bold uppercase tracking-widest mt-1">
                  {isReadOnly ? "ไม่พบประวัติการจองและชำระเงินในห้วงเวลานี้" : "ยังไม่มีข้อมูลผู้เล่นในวันนี้"}
                </p>
              </div>
            </div>
          ) : filteredMembers.map(m => {
            const isSettled = m.balance === 0 && (m.gamesPlayed > 0 || m.snackHistory?.length > 0);
            return (
              <div
                key={m.id}
                onClick={() => setSelectedMember(m)}
                className={cn(
                  "w-full grid grid-cols-12 gap-2 px-6 py-4 transition-all text-left group items-center border-none cursor-pointer",
                  isSettled ? "bg-green-500/5 hover:bg-green-500/10" : "hover:bg-primary/5 bg-white"
                )}
              >
                {/* Name + rank */}
                <div className="col-span-3 flex items-center gap-3 min-w-0">
                  {!isReadOnly && m.balance > 0 && (
                    <input 
                      type="checkbox" 
                      checked={checkedIds.includes(m.id)} 
                      onClick={e => e.stopPropagation()}
                      onChange={(e) => {
                        setCheckedIds(prev => e.target.checked ? [...prev, m.id] : prev.filter(id => id !== m.id));
                      }}
                      className="w-4 h-4 rounded border-on-surface/10 text-primary focus:ring-primary/20"
                    />
                  )}
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-sm transition-transform group-hover:scale-105', RANK_COLORS[m.rank])}>
                    {m.rank}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn("font-bold text-sm truncate transition-colors", isSettled ? "text-green-700" : "group-hover:text-primary")}>
                      {m.name}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className={cn('text-[9px] font-black px-1.5 py-0.5 rounded-full',
                        isSettled ? 'bg-green-500 text-white' :
                        m.status === 'playing' ? 'bg-green-100 text-green-700' :
                        m.status === 'waiting' ? 'bg-secondary/10 text-secondary' : 'bg-on-surface/5 text-on-surface/30')}>
                        {isSettled ? '✓ จ่ายแล้ว' : m.status === 'playing' ? '🏸 เล่น' : m.status === 'waiting' ? '⌛ รอ' : '😴 พัก'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Games */}
                <div className="col-span-1 text-center font-black text-sm text-on-surface/70">
                  {m.gamesPlayed}
                </div>

                {/* Court fee */}
                <div className="col-span-2 text-right font-bold text-sm">
                  <span className={m.courtBalance > 0 ? 'text-primary' : 'text-on-surface/20'}>
                    {m.courtBalance > 0 ? `฿${m.courtBalance.toFixed(0)}` : '—'}
                  </span>
                </div>

                {/* Shuttle */}
                <div className="col-span-2 text-right">
                  <div className="flex items-center justify-end gap-2 group/shuttle">
                    <div className="text-right">
                      <p className={cn('font-bold text-sm leading-tight', m.shuttleBalance > 0 ? 'text-secondary' : 'text-on-surface/20')}>
                        {m.shuttleBalance > 0 ? `฿${m.shuttleBalance.toFixed(0)}` : '—'}
                      </p>
                      {m.shuttleCount > 0 && <p className="text-[9px] text-on-surface/30 font-black leading-tight">({m.shuttleCount} ลูก)</p>}
                    </div>
                    {!isReadOnly && !isSettled && (
                      <div className="flex flex-col gap-0.5 opacity-0 group-hover/shuttle:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); onUpdateShuttles(m.id, 1); }} className="p-1 px-1.5 bg-secondary/10 hover:bg-secondary/20 text-secondary rounded-lg">
                          <Plus size={10} strokeWidth={4} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Snacks */}
                <div className="col-span-2 text-right font-bold text-sm">
                  <div className="flex items-center justify-end gap-2 group/snack">
                    <span className={m.snackBalance > 0 ? 'text-tertiary' : 'text-on-surface/20'}>
                      {m.snackBalance > 0 ? `฿${m.snackBalance.toFixed(0)}` : '—'}
                    </span>
                    {!isReadOnly && !isSettled && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setPosTarget(m); }}
                        className="p-1.5 rounded-xl text-tertiary bg-tertiary/10 transition-all shadow-sm shadow-tertiary/10 active:scale-95"
                      >
                        <ShoppingCart size={14} strokeWidth={3} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Total */}
                <div className="col-span-2 text-right font-headline font-black text-xl pr-2">
                  {isSettled ? (
                    <CheckCircle2 size={24} className="text-green-500 ml-auto" />
                  ) : (
                    <span className={m.balance > 0 ? 'text-error' : 'text-on-surface/10'}>
                      {m.balance > 0 ? `฿${m.balance.toFixed(0)}` : '✓'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Table footer totals */}
        <div className="relative">
          {checkedIds.length > 0 && (
            <motion.div 
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              className="absolute inset-x-0 -top-20 z-10 px-6 flex justify-end"
            >
              <button 
                onClick={() => {
                  const mainMember = filteredMembers.find(m => m.id === checkedIds[0]);
                  if (mainMember) {
                    setBulkCheckout({ member: mainMember, others: checkedIds.slice(1) });
                  }
                }}
                className="bg-primary text-white px-8 py-4 rounded-2xl font-black text-sm shadow-2xl shadow-primary/40 flex items-center gap-3 hover:scale-105 active:scale-95 transition-all"
              >
                <Banknote size={20} /> ชำระเงินที่เลือก ({checkedIds.length} คน)
              </button>
            </motion.div>
          )}
          <div className="grid grid-cols-12 gap-2 px-6 py-5 border-t-2 border-on-surface/5 bg-on-surface/2 font-black text-sm">
            <div className="col-span-4 text-on-surface/40 uppercase tracking-widest text-xs">สรุปยอดรวมวันนี้</div>
            <div className="col-span-2 text-right text-primary">฿{filteredMembers.reduce((a, m) => a + m.courtBalance, 0).toFixed(0)}</div>
            <div className="col-span-2 text-right text-secondary">฿{filteredMembers.reduce((a, m) => a + m.shuttleBalance, 0).toFixed(0)}</div>
            <div className="col-span-2 text-right text-tertiary">฿{filteredMembers.reduce((a, m) => a + m.snackBalance, 0).toFixed(0)}</div>
            <div className="col-span-2 text-right text-error text-2xl font-headline">฿{filteredMembers.reduce((a, m) => a + m.balance, 0).toFixed(0)}</div>
          </div>
        </div>
      </div>

      {/* ── Settings (collapsible) ── */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-on-surface/5 overflow-hidden">
        <button
          onClick={() => setSettingsOpen(v => !v)}
          className="w-full flex items-center justify-between px-8 py-5 font-headline font-black text-xl hover:bg-background transition-colors"
        >
          <span className="flex items-center gap-3"><Banknote size={24} className="text-primary" />ตั้งค่าระบบ</span>
          {settingsOpen ? <ChevronUp size={22} className="text-on-surface/40" /> : <ChevronDown size={22} className="text-on-surface/40" />}
        </button>
        <AnimatePresence>
          {settingsOpen && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
              className="overflow-hidden border-t border-on-surface/5">
              <div className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface/40 ml-2">ค่าสนามต่อคน (฿)</label>
                    <input type="number" value={courtFeePerPerson} onChange={e => setCourtFeePerPerson(Number(e.target.value))}
                      className="w-full px-6 py-4 bg-background rounded-2xl font-headline font-black text-3xl focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all border-none" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface/40 ml-2">ราคาลูกแบด (฿)</label>
                    <input type="number" value={shuttlePrice} onChange={e => setShuttlePrice(Number(e.target.value))}
                      className="w-full px-6 py-4 bg-background rounded-2xl font-headline font-black text-3xl focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all border-none" />
                  </div>
                </div>

                {/* Google Sheets Sync Settings */}
                <div className="border-t border-on-surface/5 pt-8 space-y-6">
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-on-surface/40 flex items-center gap-2">
                    <History size={16} className="text-secondary" />
                    Google Sheets Synchronization
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
                    <div className="sm:col-span-9 space-y-3">
                      <label className="text-[10px] font-black text-on-surface/30 ml-2">Script Web App URL</label>
                      <input
                        type="text"
                        value={googleSheetUrl}
                        onChange={e => setGoogleSheetUrl(e.target.value)}
                        placeholder="https://script.google.com/macros/s/.../exec"
                        className="w-full px-5 py-4 bg-background rounded-2xl text-sm font-bold border-none focus:ring-4 focus:ring-secondary/10 transition-all"
                      />
                    </div>
                    <div className="sm:col-span-3 flex flex-col gap-2">
                      <button
                        onClick={onSync}
                        disabled={!googleSheetUrl || isSyncing}
                        className={cn(
                          "w-full flex items-center justify-center gap-2 py-4.5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all",
                          !googleSheetUrl ? "bg-on-surface/5 text-on-surface/20 cursor-not-allowed" :
                            isSyncing ? "bg-secondary/20 text-secondary animate-pulse" : "bg-secondary text-white shadow-xl shadow-secondary/10 hover:scale-[1.02] active:scale-95"
                        )}
                      >
                        {isSyncing ? <RefreshCw size={18} className="animate-spin" /> : <TrendingUp size={18} />}
                        {isSyncing ? "กำลังส่ง..." : "ซิงค์ทันที"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Cloud Sync - New Section */}
                <div className="border-t border-on-surface/5 pt-8 space-y-6">
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-on-surface/40 flex items-center gap-2">
                    <Cloud size={16} className="text-primary" />
                    Multi-Browser Cloud Sync (สำรองข้อมูลมือแบดและการตั้งค่า)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button onClick={onPushCloud} disabled={isSyncing}
                      className="flex items-center justify-between p-5 bg-primary/5 hover:bg-primary/10 rounded-2xl transition-all group border-none">
                      <div className="text-left">
                        <p className="text-sm font-black text-primary uppercase">Backup to Cloud</p>
                        <p className="text-[10px] text-on-surface/40 font-bold italic">อัปโหลดรายชื่อและระดับมือขึ้น Cloud</p>
                      </div>
                      <Upload size={20} className="text-primary group-hover:-translate-y-1 transition-all" />
                    </button>
                    <button onClick={onPullCloud} disabled={isSyncing}
                      className="flex items-center justify-between p-5 bg-green-500/5 hover:bg-green-500/10 rounded-2xl transition-all group border-none">
                      <div className="text-left">
                        <p className="text-sm font-black text-green-600 uppercase">Restore from Cloud</p>
                        <p className="text-[10px] text-on-surface/40 font-bold italic">โหลดข้อมูลข้ามเครื่องมาจากเบราว์เซอร์อื่น</p>
                      </div>
                      <Download size={20} className="text-green-600 group-hover:translate-y-1 transition-all" />
                    </button>
                  </div>
                </div>

                <div className="border-t border-on-surface/5 pt-8 space-y-6">
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-on-surface/40 flex items-center gap-2">จัดการวัน</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <button onClick={onSeedMockHistory} className="flex items-center justify-between p-5 bg-secondary/5 hover:bg-secondary/10 rounded-2xl transition-all group border-none">
                      <div className="text-left">
                        <p className="text-sm font-black text-secondary uppercase">สร้างข้อมูลจำลอง</p>
                        <p className="text-[10px] text-on-surface/40 font-bold italic">ข้อมูลย้อนหลัง (Yesterday)</p>
                      </div>
                      <Plus size={20} className="text-secondary group-hover:scale-125 transition-all" />
                    </button>
                    <button onClick={onResetDay} className="flex items-center justify-between p-5 bg-error/5 hover:bg-error/10 rounded-2xl transition-all group border-none">
                      <div className="text-left">
                        <p className="text-sm font-black text-error uppercase">เริ่มวันใหม่ (Reset Day)</p>
                        <p className="text-[10px] text-on-surface/40 font-bold italic">สำรองข้อมูลและเริ่มรอบใหม่</p>
                      </div>
                      <RefreshCw size={20} className="text-error group-hover:rotate-180 transition-all duration-500" />
                    </button>
                    <button onClick={onFactoryReset} className="flex items-center justify-between p-5 bg-error/5 hover:bg-error/10 rounded-2xl transition-all group border-none text-left">
                      <div>
                        <p className="text-sm font-black text-error uppercase">ล้างข้อมูลทั้งหมด</p>
                        <p className="text-[10px] text-on-surface/40 font-bold italic">ลบสมาชิกออกทั้งหมด</p>
                      </div>
                      <Trash2 size={20} className="text-error group-hover:scale-125 transition-all" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Checkout Modal ── */}
      <AnimatePresence>
        {(selectedMember || bulkCheckout) && (
          <CheckoutModal
            member={bulkCheckout ? bulkCheckout.member : selectedMember!}
            initialOthers={bulkCheckout ? bulkCheckout.others : []}
            gameHistory={gameHistory}
            otherMembers={currentMembers}
            onUpdateRank={onUpdateRank}
            onRemoveSnack={onRemoveSnack}
            onUpdateSnackPrice={onUpdateSnackPrice}
            isReadOnly={isReadOnly}
            onPay={(amount, otherIds) => {
              const mId = bulkCheckout ? bulkCheckout.member.id : selectedMember!.id;
              onProcessPayment(mId, amount, 'Cash', otherIds);
              setSelectedMember(null);
              setBulkCheckout(null);
              setCheckedIds([]);
            }}
            onClose={() => {
              setSelectedMember(null);
              setBulkCheckout(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

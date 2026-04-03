import React, { useState } from 'react';
import { Trophy, Users, Banknote, TrendingUp, ChevronDown, ChevronUp, X, ShoppingCart, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Member, Court, PaymentRecord, GameRecord, Snack, Rank, RANKS, RANK_COLORS, RANK_LEVEL_LABELS } from '../types';
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
  onResetDay: () => void;
  onFactoryReset: () => void;
}

// Modal showing a player's game history (who they played with)
function PlayerHistoryModal({ member, gameHistory, onUpdateRank, onClose }: {
  member: Member;
  gameHistory: GameRecord[];
  onUpdateRank: (memberId: string, rank: Rank) => void;
  onClose: () => void;
}) {
  const myGames = gameHistory.filter(g => g.players.some(p => p.id === member.id));

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-on-surface/50 backdrop-blur-sm" />
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-[2rem] w-full max-w-lg p-6 shadow-2xl relative z-10 max-h-[80vh] flex flex-col">
        <div className="flex items-center gap-4 mb-5">
          <div className="relative group/rank">
            <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg shrink-0', RANK_COLORS[member.rank])}>
              {member.rank}
            </div>
            <select
              value={member.rank}
              onChange={(e) => onUpdateRank(member.id, e.target.value as Rank)}
              className="absolute inset-0 opacity-0 cursor-pointer"
            >
              {[...RANKS].map(r => (
                <option key={r} value={r}>{r} ({RANK_LEVEL_LABELS[r]})</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-headline font-black text-2xl">{member.name}</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-primary">{RANK_LEVEL_LABELS[member.rank]}</span>
              <span className="text-on-surface/20">•</span>
              <span className="text-xs text-on-surface/50">{member.gamesPlayed} เกม</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-background shrink-0"><X size={20} /></button>
        </div>

        {/* Cost summary */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-primary/5 rounded-2xl p-3 text-center">
            <p className="text-[10px] font-black uppercase text-primary/60 mb-1">ค่าสนาม</p>
            <p className="font-headline font-black text-lg text-primary">฿{member.courtBalance.toFixed(0)}</p>
          </div>
          <div className="bg-secondary/5 rounded-2xl p-3 text-center">
            <p className="text-[10px] font-black uppercase text-secondary/60 mb-1">ค่าลูก</p>
            <p className="font-headline font-black text-lg text-secondary">฿{member.shuttleBalance.toFixed(0)}</p>
          </div>
          <div className="bg-tertiary/5 rounded-2xl p-3 text-center">
            <p className="text-[10px] font-black uppercase text-tertiary/60 mb-1">ค่าสินค้า</p>
            <p className="font-headline font-black text-lg text-tertiary">฿{member.snackBalance.toFixed(0)}</p>
          </div>
        </div>

        {/* Game list */}
        <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
          <h3 className="font-bold text-sm text-on-surface/40 uppercase tracking-widest">ประวัติการตี</h3>
          {myGames.length === 0 ? (
            <p className="text-center py-8 text-on-surface/30 text-sm font-bold">ยังไม่มีประวัติ</p>
          ) : (
            myGames.slice(0, 20).map((g, idx) => {
              const partners = g.players.filter(p => p.id !== member.id);
              return (
                <div key={g.id} className="bg-background rounded-2xl p-4 flex items-center gap-4">
                  <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center font-black text-sm text-primary shrink-0">
                    {myGames.length - idx}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm">{g.courtName}</p>
                    <p className="text-xs text-on-surface/40 truncate">
                      กับ {partners.map(p => p.name).join(', ')}
                    </p>
                    <p className="text-[11px] text-on-surface/30">{format(g.playedAt, 'HH:mm')}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-on-surface/40">🏸 {g.shuttlesUsed} ลูก</p>
                    <p className="font-black text-sm text-primary">฿{(g.shuttleCostPerPerson + (g.courtFeePerPerson || 0)).toFixed(0)}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </div>
  );
}

export function DashboardTab({
  members, courts, snacks, paymentHistory, gameHistory,
  courtFeePerPerson, setCourtFeePerPerson, shuttlePrice, setShuttlePrice,
  onAddSnack, onUpdateShuttles, onUpdateRank, onResetDay, onFactoryReset
}: Props) {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [posTarget, setPosTarget] = useState<Member | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const activePlayers = members.filter(m => m.status === 'playing').length;
  const waitingPlayers = members.filter(m => m.status === 'waiting').length;
  const activeCourts = courts.filter(c => c.players.some(Boolean)).length;
  const totalPending = members.reduce((a, m) => a + m.balance, 0);
  const totalPaid = paymentHistory.reduce((a, r) => a + r.amount, 0);

  return (
    <div className="space-y-6">
      {/* POS modal for manual charging from dashboard */}
      <AnimatePresence>
        {posTarget && (
          <POSModal
            member={posTarget}
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
        <div className="px-6 py-4 border-b border-on-surface/5 flex items-center justify-between">
          <h2 className="font-headline font-black text-xl">ตารางผู้เล่น</h2>
          <p className="text-xs text-on-surface/40 font-bold">กดชื่อเพื่อดูประวัติ / กด 🛒 เพื่อคิดเงิน</p>
        </div>

        {/* Table header */}
        <div className="grid grid-cols-12 gap-2 px-6 py-3 bg-background text-[10px] font-black uppercase tracking-widest text-on-surface/40">
          <div className="col-span-3">ชื่อ / ระดับ</div>
          <div className="col-span-1 text-center">เกม</div>
          <div className="col-span-2 text-right">ค่าสนาม</div>
          <div className="col-span-3 text-right">ค่าลูก</div>
          <div className="col-span-2 text-right">สินค้า</div>
          <div className="col-span-1 text-right">รวม</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-on-surface/5">
          {[...members].sort((a, b) => b.gamesPlayed - a.gamesPlayed || b.balance - a.balance).map(m => (
            <div
              key={m.id}
              className="w-full grid grid-cols-12 gap-2 px-6 py-4 hover:bg-primary/3 transition-colors text-left group items-center"
            >
              {/* Name + rank (clickable for history) */}
              <button onClick={() => setSelectedMember(m)} className="col-span-3 flex items-center gap-3 min-w-0 text-left">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0', RANK_COLORS[m.rank])}>
                  {m.rank}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm truncate group-hover:text-primary transition-colors">{m.name}</p>
                  <div className="flex items-center gap-2">
                    <span className={cn('text-[9px] font-black px-1.5 py-0.5 rounded-full',
                      m.status === 'playing' ? 'bg-green-100 text-green-700' :
                      m.status === 'waiting' ? 'bg-secondary/10 text-secondary' : 'bg-on-surface/5 text-on-surface/30')}>
                      {m.status === 'playing' ? '🏸 เล่น' : m.status === 'waiting' ? '⌛ รอ' : '😴 พัก'}
                    </span>
                  </div>
                </div>
              </button>

              {/* Games */}
              <div className="col-span-1 text-center font-black text-sm">
                {m.gamesPlayed}
              </div>

              {/* Court fee */}
              <div className="col-span-2 text-right font-bold text-sm">
                <span className={m.courtBalance > 0 ? 'text-primary' : 'text-on-surface/30'}>
                  {m.courtBalance > 0 ? `฿${m.courtBalance.toFixed(0)}` : '—'}
                </span>
              </div>

              {/* Shuttle */}
              <div className="col-span-3 text-right">
                <div className="flex items-center justify-end gap-2 group/shuttle">
                   <div className="text-right">
                    <p className={cn('font-bold text-sm leading-tight', m.shuttleBalance > 0 ? 'text-secondary' : 'text-on-surface/30')}>
                      {m.shuttleBalance > 0 ? `฿${m.shuttleBalance.toFixed(0)}` : '—'}
                    </p>
                    {m.shuttleCount > 0 && <p className="text-[10px] text-on-surface/30 font-bold leading-tight">({m.shuttleCount} ลูก)</p>}
                   </div>
                   <div className="flex flex-col gap-0.5 opacity-0 group-hover/shuttle:opacity-100 transition-opacity">
                      <button onClick={() => onUpdateShuttles(m.id, 1)} className="p-0.5 bg-secondary/10 hover:bg-secondary/20 text-secondary rounded shadow-sm">
                        <ChevronUp size={10} strokeWidth={3} />
                      </button>
                      <button onClick={() => onUpdateShuttles(m.id, -1)} disabled={m.shuttleCount === 0}
                        className="p-0.5 bg-secondary/10 hover:bg-secondary/20 text-secondary rounded shadow-sm disabled:opacity-30">
                        <ChevronDown size={10} strokeWidth={3} />
                      </button>
                   </div>
                </div>
              </div>

              {/* Snacks */}
              <div className="col-span-2 text-right font-bold text-sm">
                <div className="flex items-center justify-end gap-2 group/snack">
                  <span className={m.snackBalance > 0 ? 'text-tertiary' : 'text-on-surface/30'}>
                    {m.snackBalance > 0 ? `฿${m.snackBalance.toFixed(0)}` : '—'}
                  </span>
                  <button
                    onClick={() => setPosTarget(m)}
                    className="p-1.5 rounded-lg text-on-surface/20 group-hover/snack:text-tertiary group-hover/snack:bg-tertiary/10 transition-all opacity-0 group-hover/snack:opacity-100"
                    title="ซื้อน้ำ/ขนม"
                  >
                    <ShoppingCart size={14} />
                  </button>
                </div>
              </div>

              {/* Total */}
              <div className="col-span-1 text-right font-headline font-black text-base pr-2">
                <span className={m.balance > 0 ? 'text-error' : 'text-on-surface/25'}>
                  {m.balance > 0 ? `฿${m.balance.toFixed(0)}` : '✓'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Table footer totals */}
        <div className="grid grid-cols-12 gap-2 px-6 py-4 border-t-2 border-on-surface/10 bg-on-surface/2 font-black text-sm">
          <div className="col-span-4 text-on-surface/60">รวมทั้งหมด ({members.length} คน)</div>
          <div className="col-span-2 text-right text-primary">฿{members.reduce((a, m) => a + m.courtBalance, 0).toFixed(0)}</div>
          <div className="col-span-2 text-right text-secondary">฿{members.reduce((a, m) => a + m.shuttleBalance, 0).toFixed(0)}</div>
          <div className="col-span-2 text-right text-tertiary">฿{members.reduce((a, m) => a + m.snackBalance, 0).toFixed(0)}</div>
          <div className="col-span-1 text-right text-error">฿{totalPending.toFixed(0)}</div>
          <div className="col-span-1"></div>
        </div>
      </div>

      {/* ── Settings (collapsible) ── */}
      <div className="bg-white rounded-3xl shadow-sm border border-on-surface/5 overflow-hidden">
        <button
          onClick={() => setSettingsOpen(v => !v)}
          className="w-full flex items-center justify-between px-6 py-4 font-headline font-black text-lg hover:bg-background transition-colors"
        >
          <span className="flex items-center gap-2"><Banknote size={20} className="text-primary" />ตั้งค่าค่าใช้จ่าย</span>
          {settingsOpen ? <ChevronUp size={18} className="text-on-surface/40" /> : <ChevronDown size={18} className="text-on-surface/40" />}
        </button>
        <AnimatePresence>
          {settingsOpen && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
              className="overflow-hidden border-t border-on-surface/5">
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface/40">ค่าสนามต่อคน/เซสชัน (฿)</label>
                  <input type="number" value={courtFeePerPerson} onChange={e => setCourtFeePerPerson(Number(e.target.value))}
                    className="w-full px-5 py-3 bg-background rounded-2xl font-headline font-black text-2xl focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  <p className="text-xs text-on-surface/40">คิดครั้งเดียว ไม่ว่าจะตีกี่เกม</p>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface/40">ราคาลูกแบด/ลูก (฿)</label>
                  <input type="number" value={shuttlePrice} onChange={e => setShuttlePrice(Number(e.target.value))}
                    className="w-full px-5 py-3 bg-background rounded-2xl font-headline font-black text-2xl focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  <p className="text-xs text-on-surface/40">แบ่งเท่าๆ กันในแต่ละเกม</p>
                </div>
                <div className="md:col-span-2 bg-primary/5 rounded-2xl p-4">
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">ตัวอย่างการคิด</p>
                  <p className="text-sm text-on-surface/70">ตี 3 เกม ใช้เกมละ 1 ลูก (4 คน)</p>
                  <p className="font-bold mt-1">ค่าสนาม ฿{courtFeePerPerson} + ค่าลูก ฿{shuttlePrice} × 3</p>
                  <p className="font-headline font-black text-primary text-xl">= รวม ฿{(courtFeePerPerson + (shuttlePrice * 3) / 4).toFixed(0)} / คน</p>
                </div>

                <div className="md:col-span-2 border-t border-on-surface/5 pt-6 space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-on-surface/40">จัดการระบบ (System)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      onClick={onResetDay}
                      className="flex items-center justify-between p-4 bg-primary/5 hover:bg-primary/10 rounded-2xl transition-colors group text-left"
                    >
                      <div>
                        <p className="text-sm font-black text-primary uppercase tracking-wider">เริ่มวันใหม่</p>
                        <p className="text-[10px] text-on-surface/40 font-bold">ล้างประวัติ (เก็บสมาชิกเดิม)</p>
                      </div>
                      <RefreshCw size={18} className="text-primary group-hover:rotate-180 transition-all duration-500" />
                    </button>

                    <button
                      onClick={onFactoryReset}
                      className="flex items-center justify-between p-4 bg-error/5 hover:bg-error/10 rounded-2xl transition-colors group text-left"
                    >
                      <div>
                        <p className="text-sm font-black text-error uppercase tracking-wider">ล้างข้อมูลทั้งหมด</p>
                        <p className="text-[10px] text-on-surface/40 font-bold">ลบสมาชิกและเลิกจัดเก็บ</p>
                      </div>
                      <Trash2 size={18} className="text-error group-hover:scale-125 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Player History Modal ── */}
      <AnimatePresence>
        {selectedMember && (
          <PlayerHistoryModal
            member={selectedMember}
            gameHistory={gameHistory}
            onUpdateRank={onUpdateRank}
            onClose={() => setSelectedMember(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

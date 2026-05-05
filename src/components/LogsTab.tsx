import React from 'react';
import { GameRecord, Member, PaymentRecord, RANK_COLORS, SessionRecord } from '../types';
import { History, LayoutDashboard, Trophy, Clock, X, Check, Banknote, ShoppingCart, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface Props {
  gameHistory: GameRecord[];
  sessionHistory: SessionRecord[];
  members: Member[];
  paymentHistory: PaymentRecord[];
  onViewSession: (session: SessionRecord) => void;
  onActiveTab: (tab: 'dashboard' | 'logs' | 'members' | 'courts' | 'finance') => void;
  onUpdateGame: (id: string, players: string[], shuttles: number) => void;
}

function EditGameModal({ game, members, onSave, onClose }: { game: GameRecord, members: Member[], onSave: (pids: string[], shuttles: number) => void, onClose: () => void }) {
  const [pids, setPids] = React.useState<string[]>(game.players.map(p => p.id));
  const [shuttles, setShuttles] = React.useState(game.shuttlesUsed);
  const [search, setSearch] = React.useState('');

  const filtered = members.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-on-surface/60 backdrop-blur-sm" />
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-[2.5rem] w-full max-w-xl p-8 shadow-2xl relative z-10 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-headline font-black text-2xl">แก้ไขข้อมูลเกม</h2>
          <button onClick={onClose} className="p-2 hover:bg-background rounded-full transition-colors"><X size={20} /></button>
        </div>

        <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
          <div>
            <label className="text-[10px] font-black uppercase text-on-surface/30 tracking-widest mb-2 block">จำนวนลูกแบด</label>
            <div className="flex items-center gap-4">
              <button onClick={() => setShuttles(Math.max(1, shuttles - 1))} className="w-10 h-10 rounded-xl bg-on-surface/5 flex items-center justify-center font-black">-</button>
              <span className="text-xl font-black w-12 text-center">{shuttles}</span>
              <button onClick={() => setShuttles(shuttles + 1)} className="w-10 h-10 rounded-xl bg-on-surface/5 flex items-center justify-center font-black">+</button>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-on-surface/30 tracking-widest mb-2 block">ผู้เล่น (4 คน)</label>
            <div className="flex flex-wrap gap-2 mb-4">
              {pids.map((id, idx) => {
                const m = members.find(mx => mx.id === id);
                return (
                  <div key={idx} className="bg-primary/10 text-primary px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-2">
                    {m?.name || 'Unknown'}
                    <button onClick={() => setPids(prev => prev.filter(pix => pix !== id))}><X size={12} /></button>
                  </div>
                );
              })}
            </div>

            <div className="space-y-4">
              <input 
                type="text" placeholder="ค้นหาชื่อผู้เล่น..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full px-4 py-3 bg-background rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-sm"
              />
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                {filtered.map(m => (
                  <button 
                    key={m.id} 
                    onClick={() => {
                      if (pids.includes(m.id)) setPids(pids.filter(id => id !== m.id));
                      else if (pids.length < 4) setPids([...pids, m.id]);
                    }}
                    className={cn("flex items-center gap-3 p-3 rounded-2xl transition-all text-left", pids.includes(m.id) ? "bg-primary text-white" : "bg-on-surface/5 hover:bg-on-surface/10")}
                  >
                    <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center text-[8px] font-black", pids.includes(m.id) ? "bg-white/20" : RANK_COLORS[m.rank])}>{m.rank}</div>
                    <span className="text-xs font-bold truncate">{m.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-on-surface/5">
          <button 
            disabled={pids.length !== 4} 
            onClick={() => onSave(pids, shuttles)}
            className="w-full bg-primary text-white font-black py-4 rounded-3xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all flex items-center justify-center gap-2"
          >
            <Check size={20} strokeWidth={3} /> บันทึกการแก้ไข
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export function LogsTab({ gameHistory, sessionHistory, members, paymentHistory, onViewSession, onActiveTab, onUpdateGame }: Props) {
  const [editingGame, setEditingGame] = React.useState<GameRecord | null>(null);
  const [expandedPayment, setExpandedPayment] = React.useState<string | null>(null);
  const [showSessionDropdown, setShowSessionDropdown] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  
  const logs = [...gameHistory].sort((a, b) => b.playedAt - a.playedAt);
  const payments = [...paymentHistory].sort((a, b) => b.timestamp - a.timestamp);

  // Close dropdown on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSessionDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Deduplicate sessions by date (keep the one with the most activity)
  const uniqueSessions = React.useMemo(() => {
    const map = new Map<string, SessionRecord>();
    sessionHistory.forEach(s => {
      const dateStr = format(s.date, 'yyyy-MM-dd');
      const existing = map.get(dateStr);
      const score = (s.gameHistory?.length || 0) + (s.paymentHistory?.length || 0);
      const existScore = existing ? (existing.gameHistory?.length || 0) + (existing.paymentHistory?.length || 0) : -1;
      if (!existing || score > existScore) {
        map.set(dateStr, s);
      }
    });
    return Array.from(map.values()).sort((a, b) => b.date - a.date);
  }, [sessionHistory]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <AnimatePresence>
        {editingGame && (
          <EditGameModal 
            game={editingGame} 
            members={members} 
            onClose={() => setEditingGame(null)} 
            onSave={(pids, shuttles) => {
              onUpdateGame(editingGame.id, pids, shuttles);
              setEditingGame(null);
            }} 
          />
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <h2 className="font-headline font-black text-3xl tracking-tighter flex items-center gap-3">
          <History size={32} className="text-primary" />
          บันทึกการตี
        </h2>
        <div className="flex items-center gap-2">
          <div className="bg-white px-4 py-2 rounded-2xl shadow-sm border border-on-surface/5 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-black text-on-surface/60 uppercase tracking-widest">Live Updates</span>
          </div>
        </div>
      </div>

      {/* Session History Section (Dropdown Calendar style) */}
      {uniqueSessions.length > 0 && (
        <div className="space-y-3 relative z-40" ref={dropdownRef}>
          <div className="flex items-center gap-2 px-1">
            <h3 className="text-xs font-black uppercase text-on-surface/40 tracking-widest">ประวัติการตี (เซสชันที่ผ่านมา)</h3>
            <div className="h-px bg-on-surface/5 flex-1" />
          </div>
          <div className="relative">
            <button
              onClick={() => setShowSessionDropdown(!showSessionDropdown)}
              className="w-full bg-white hover:bg-on-surface/5 rounded-2xl p-4 shadow-sm border border-on-surface/5 flex items-center justify-between transition-all active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                  <Calendar size={20} />
                </div>
                <div className="text-left">
                  <p className="font-black text-sm text-on-surface">เลือกดูประวัติย้อนหลัง</p>
                  <p className="text-[10px] font-bold text-on-surface/40 uppercase tracking-widest">
                    มีข้อมูลทั้งหมด {uniqueSessions.length} วัน
                  </p>
                </div>
              </div>
              <ChevronDown size={20} className={cn("text-on-surface/40 transition-transform", showSessionDropdown && "rotate-180")} />
            </button>

            <AnimatePresence>
              {showSessionDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-on-surface/10 z-50 overflow-hidden max-h-80 overflow-y-auto custom-scrollbar"
                >
                  <div className="p-2 space-y-1">
                    {uniqueSessions.map(session => (
                      <button
                        key={session.id}
                        onClick={() => {
                          onViewSession(session);
                          onActiveTab('dashboard');
                          setShowSessionDropdown(false);
                        }}
                        className="w-full text-left flex items-center justify-between p-3 rounded-xl hover:bg-primary/5 transition-colors group"
                      >
                        <div className="flex items-center gap-4">
                          {/* Red dot indicating active session date */}
                          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-on-surface/5 group-hover:bg-primary/10 transition-colors">
                            <span className="text-sm font-black text-on-surface/60 group-hover:text-primary">{format(session.date, 'd')}</span>
                            <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-error ring-2 ring-white" />
                          </div>
                          <div>
                            <p className="font-black text-sm group-hover:text-primary transition-colors">{format(session.date, 'd MMMM yyyy', { locale: th })}</p>
                            <p className="text-[10px] font-bold text-on-surface/40 uppercase tracking-widest">
                              {session.gameHistory.length} เกม · {session.membersSnapshot.length} ผู้เล่น
                            </p>
                          </div>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-white rounded-full shadow-sm">
                          <LayoutDashboard size={14} className="text-primary" />
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 px-1">
        <h3 className="text-xs font-black uppercase text-secondary/60 tracking-widest">รายการของวันนี้</h3>
        <div className="h-px bg-on-surface/5 flex-1" />
      </div>

      {/* Payment History Section */}
      {payments.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Banknote size={14} className="text-green-600" />
            <h3 className="text-xs font-black uppercase text-green-700/60 tracking-widest">บันทึกการชำระเงิน ({payments.length} รายการ)</h3>
            <div className="h-px bg-on-surface/5 flex-1" />
          </div>
          <div className="space-y-2">
            {payments.map(p => {
              const snackItems = p.details?.snackHistory || [];
              const isExpanded = expandedPayment === p.id;
              return (
                <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-on-surface/5 overflow-hidden">
                  <button
                    onClick={() => setExpandedPayment(isExpanded ? null : p.id)}
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-green-50/50 transition-colors text-left"
                  >
                    <div className="w-9 h-9 bg-green-500/10 rounded-xl flex items-center justify-center shrink-0">
                      <Banknote size={16} className="text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm text-on-surface">{p.memberName}</p>
                      <p className="text-[10px] font-bold text-on-surface/40">{format(p.timestamp, 'HH:mm น.')} • {p.note}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-headline font-black text-xl text-green-600">฿{p.amount.toLocaleString()}</p>
                      {snackItems.length > 0 && (
                        isExpanded ? <ChevronUp size={16} className="text-on-surface/30" /> : <ChevronDown size={16} className="text-on-surface/30" />
                      )}
                    </div>
                  </button>
                  {/* Snack details breakdown */}
                  {isExpanded && snackItems.length > 0 && (
                    <div className="px-5 pb-4 space-y-1.5 border-t border-on-surface/5 pt-3 bg-on-surface/[0.015]">
                      <p className="text-[9px] font-black uppercase text-on-surface/30 tracking-widest mb-2 flex items-center gap-1"><ShoppingCart size={10} /> รายการสินค้า</p>
                      {snackItems.map((s, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-on-surface/60 font-bold flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-tertiary/40 shrink-0" />
                            {s.name}
                          </span>
                          <span className="font-black text-tertiary">฿{s.price}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between text-xs pt-2 border-t border-on-surface/5 mt-2">
                        <span className="font-black text-on-surface/40 uppercase tracking-widest text-[9px]">รวมสินค้า</span>
                        <span className="font-black text-tertiary">฿{snackItems.reduce((a,s)=>a+s.price,0)}</span>
                      </div>
                      {(p.details?.courtBalance ?? 0) > 0 && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-black text-on-surface/40 uppercase tracking-widest text-[9px]">ค่าสนาม</span>
                          <span className="font-black text-primary">฿{p.details!.courtBalance}</span>
                        </div>
                      )}
                      {(p.details?.shuttleBalance ?? 0) > 0 && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-black text-on-surface/40 uppercase tracking-widest text-[9px]">ค่าลูกแบด</span>
                          <span className="font-black text-secondary">฿{p.details!.shuttleBalance}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 px-1 mt-2">
        <h3 className="text-xs font-black uppercase text-secondary/60 tracking-widest">บันทึกการตีวันนี้</h3>
        <div className="h-px bg-on-surface/5 flex-1" />
      </div>

      <div className="space-y-4">
        {logs.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-on-surface/10">
            <Clock size={48} className="mx-auto text-on-surface/10 mb-4" />
            <p className="font-bold text-on-surface/40">ยังไม่มีข้อมูลการตีของวันนี้</p>
          </div>
        ) : (
          logs.map((game, idx) => (
            <div key={game.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-on-surface/5 hover:shadow-md transition-shadow group">
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                
                {/* Time & Index */}
                <div className="flex items-center gap-4 shrink-0">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center font-black text-primary text-xl">
                    {logs.length - idx}
                  </div>
                  <div>
                    <p className="text-2xl font-black font-headline tabular-nums">{format(game.playedAt, 'HH:mm')}</p>
                    <p className="text-[10px] font-black text-on-surface/30 uppercase tracking-widest">{format(game.playedAt, 'd MMMM', { locale: th })}</p>
                  </div>
                </div>

                {/* Court Info */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3 bg-background px-4 py-3 rounded-2xl shrink-0">
                    <Trophy size={16} className="text-primary/60" />
                    <span className="font-black text-sm">{game.courtName}</span>
                  </div>
                  <button 
                    onClick={() => setEditingGame(game)}
                    className="text-[9px] font-black uppercase tracking-widest text-primary hover:underline"
                  >
                    ✏️ แก้ไขยอด/ผู้เล่น
                  </button>
                </div>

                {/* Matchup */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Team A */}
                    <div className="flex items-center gap-1.5 p-1.5 bg-primary/5 rounded-xl border border-primary/10">
                      <div className="flex items-center -space-x-2">
                        {game.players.slice(0, 2).map((p, i) => (
                          <div key={`${p.id}-${i}`} className={cn('w-8 h-8 rounded-lg border-2 border-white flex items-center justify-center font-black text-[10px] shadow-sm', RANK_COLORS[p.rank])}>
                            {p.rank}
                          </div>
                        ))}
                      </div>
                      <span className="text-sm font-bold truncate max-w-[150px]">
                        {game.players.slice(0, 2).map(p => p.name).join(' & ')}
                      </span>
                    </div>

                    <span className="text-[10px] font-black text-on-surface/20 uppercase">VS</span>

                    {/* Team B */}
                    <div className="flex items-center gap-1.5 p-1.5 bg-secondary/5 rounded-xl border border-secondary/10">
                      <div className="flex items-center -space-x-2">
                        {game.players.slice(2, 4).map((p, i) => (
                          <div key={`${p.id}-${i}`} className={cn('w-8 h-8 rounded-lg border-2 border-white flex items-center justify-center font-black text-[10px] shadow-sm', RANK_COLORS[p.rank])}>
                            {p.rank}
                          </div>
                        ))}
                      </div>
                      <span className="text-sm font-bold truncate max-w-[150px]">
                        {game.players.slice(2, 4).map(p => p.name).join(' & ')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Fees */}
                <div className="flex items-center gap-6 shrink-0 md:border-l md:border-on-surface/5 md:pl-6 text-right">
                  <div>
                    <p className="text-[10px] font-black text-on-surface/30 uppercase tracking-widest">ใช้ลูก</p>
                    <p className="font-headline font-black text-xl">🏸 {game.shuttlesUsed}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-on-surface/30 uppercase tracking-widest">รวม/คน</p>
                    <p className="font-headline font-black text-2xl text-primary">฿{(game.shuttleCostPerPerson + (game.courtFeePerPerson || 0)).toFixed(0)}</p>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

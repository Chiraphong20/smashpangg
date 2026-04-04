import React, { useState, useRef, useEffect } from 'react';
import { Bolt, X, Plus, Trash2, ShoppingCart, Search, Check, RotateCcw, Lock, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Member, Court, Snack, GameRecord, Rank, RANKS, RANK_WEIGHTS, RANK_COLORS, RANK_LEVEL_LABELS } from '../types';
import { format } from 'date-fns';
import { POSModal } from './POSModal';

let draggingPlayerId: string | null = null;

interface Props {
  members: Member[];
  courts: Court[];
  snacks: Snack[];
  searchQuery: string;
  gameHistory: GameRecord[];
  onAutoMatch: (courtId: string) => void;
  onStartGame: (courtId: string) => void;
  onResetCourt: (courtId: string) => void;
  onRemovePlayer: (courtId: string, slotIndex: number) => void;
  onAddPlayer: (courtId: string, slotIndex: number, playerId: string) => void;
  onDeleteCourt: (courtId: string) => void;
  onAddSnack: (memberId: string, snack: Snack) => void;
  onEditGame: (gameId: string, newShuttles: number) => void;
  onUndoGame: (gameId: string) => void;
  onUpdateCourt: React.Dispatch<React.SetStateAction<Court[]>>;
  minRankFilter: Rank;
  setMinRankFilter: (r: Rank) => void;
  maxRankFilter: Rank;
  setMaxRankFilter: (r: Rank) => void;
  onAddCourt: () => void;
}

// ── Player Picker ─────────────────────────────────────────────────────────────
function PlayerPicker({ members, currentPlayerId, onSelect, onClose, position }: {
  members: Member[];
  currentPlayerId: string | null;
  onSelect: (id: string | null) => void;
  onClose: () => void;
  position: 'top' | 'bottom';
}) {
  const [q, setQ] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);

  const list = members.filter(m =>
    (m.status === 'waiting' || m.id === currentPlayerId) &&
    m.name.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: position === 'top' ? -10 : 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: position === 'top' ? -10 : 10 }}
      transition={{ duration: 0.12 }}
      onClick={e => e.stopPropagation()}
      className={cn(
        "absolute left-0 right-0 z-50 bg-white rounded-2xl shadow-2xl border border-on-surface/5 overflow-hidden",
        position === 'top' ? "top-full mt-2" : "bottom-full mb-2"
      )}
    >
      <div className="p-3 border-b border-on-surface/5">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface/30" />
          <input ref={ref} value={q} onChange={e => setQ(e.target.value)} placeholder="ค้นหาชื่อ..."
            className="w-full pl-9 pr-3 py-2.5 bg-background rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
      </div>
      <div className="max-h-60 overflow-y-auto">
        {currentPlayerId && (
          <button onClick={() => { onSelect(null); onClose(); }}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-error/5 text-error transition-colors">
            <X size={15} /><span className="text-sm font-black">นำออกจากสล็อต</span>
          </button>
        )}
        {list.length === 0 && <p className="text-center py-6 text-sm text-on-surface/30 font-bold">ไม่พบผู้เล่น</p>}
        {list.map(m => (
          <button key={m.id} onClick={() => { onSelect(m.id); onClose(); }}
            className={cn('w-full flex items-center gap-3 px-4 py-3 hover:bg-primary/5 transition-colors', m.id === currentPlayerId ? 'bg-primary/5' : '')}>
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0', RANK_COLORS[m.rank])}>{m.rank}</div>
            <div className="flex-1 text-left min-w-0">
              <p className="font-bold truncate">{m.name}</p>
              <p className="text-xs text-on-surface/40">{RANK_LEVEL_LABELS[m.rank]} · {m.gamesPlayed} เกม</p>
            </div>
            {m.id === currentPlayerId && <Check size={15} className="text-primary shrink-0" />}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

// ── Slot Card ────────────────────────────────────────────────────────────────
function SlotCard({ slotIndex, playerId, team, members, onSelect, locked }: {
  key?: number;
  slotIndex: number;
  playerId: string | null;
  team: 'A' | 'B';
  members: Member[];
  onSelect: (id: string | null) => void;
  locked: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const player = members.find(m => m.id === playerId) ?? null;

  useEffect(() => {
    if (!open) return;
    const fn = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [open]);

  const teamAccent = team === 'A' ? 'border-l-primary' : 'border-l-secondary';
  const teamText = team === 'A' ? 'text-primary' : 'text-secondary';

  return (
    <div ref={wrapRef} className="relative">
      <div
        onClick={() => { if (!locked) setOpen(v => !v); }}
        onDragOver={e => { if (locked) return; e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          if (locked) return;
          e.preventDefault(); setDragOver(false);
          const pid = draggingPlayerId ?? e.dataTransfer.getData('playerId');
          if (pid) onSelect(pid);
        }}
        className={cn(
          'relative rounded-2xl border-2 transition-all select-none group min-h-[130px] flex flex-col justify-center',
          locked ? 'cursor-default' : 'cursor-pointer',
          dragOver
            ? 'border-yellow-300 bg-yellow-50 scale-[1.02] shadow-xl'
            : player
              ? `bg-white shadow-lg border-l-4 border-t-0 border-r-0 border-b-0 ${teamAccent}`
              : locked
                ? 'border-white/10 bg-white/5'
                : 'border-dashed border-white/30 bg-white/10 hover:bg-white/20 hover:border-white/60'
        )}
      >
        {/* X remove button */}
        {!locked && player && (
          <button
            onClick={e => { e.stopPropagation(); onSelect(null); }}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 bg-error/80 hover:bg-error text-white rounded-full flex items-center justify-center z-10 shadow-md"
          >
            <X size={12} />
          </button>
        )}
        {player ? (
          <div className="p-4 flex items-center gap-3">
            <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg shrink-0 shadow-md', RANK_COLORS[player.rank])}>
              {player.rank}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-headline font-black text-base truncate text-on-surface">{player.name}</p>
              <p className={cn('text-xs font-bold', teamText)}>{RANK_LEVEL_LABELS[player.rank]}</p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-[11px] font-black text-on-surface/50 bg-on-surface/5 px-2 py-0.5 rounded-full">
                  🏸 {player.gamesPlayed} เกม
                </span>
                {player.balance > 0 && (
                  <span className="text-[11px] font-black text-error bg-error/10 px-2 py-0.5 rounded-full">
                    ฿{player.balance.toFixed(0)}
                  </span>
                )}
              </div>
            </div>
            {locked && <Lock size={14} className="text-white/30 shrink-0" />}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-6 text-white/40">
            <div className="w-10 h-10 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center">
              <Plus size={20} className="text-white/30" />
            </div>
            <span className="text-xs font-bold text-white/40">เพิ่มผู้เล่น</span>
            {!locked && <span className="text-[10px] text-white/25">แตะ · ลาก · ดับเบิ้ลคลิก</span>}
          </div>
        )}
        {open && !locked && <div className="absolute inset-0 ring-2 ring-white rounded-2xl pointer-events-none" />}
      </div>

      <AnimatePresence>
        {open && !locked && (
          <PlayerPicker 
            members={members} 
            currentPlayerId={playerId} 
            onSelect={onSelect} 
            onClose={() => setOpen(false)} 
            position={team === 'A' ? 'top' : 'bottom'}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Game History Row (editable) ──────────────────────────────────────────────
function GameRow({ game, onEditGame, onUndoGame, shuttlePrice }: {
  key?: string;
  game: GameRecord;
  onEditGame: (id: string, n: number) => void;
  onUndoGame: (id: string) => void;
  shuttlePrice: number;
}) {
  const teamA = game.players.slice(0, 2);
  const teamB = game.players.slice(2, 4);
  return (
    <div className="bg-white/8 border border-white/10 rounded-2xl p-4 flex items-center gap-4 flex-wrap">
      {/* Time */}
      <div className="shrink-0 text-center">
        <p className="text-white/40 text-[10px] font-black uppercase">เกม</p>
        <p className="text-white font-black text-sm">{format(game.playedAt, 'HH:mm')}</p>
      </div>

      {/* Players */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          {teamA.map(p => (
            <div key={p.id} className={cn('flex items-center gap-1 px-2 py-1 rounded-lg', RANK_COLORS[p.rank])}>
              <span className="text-[10px] font-black">{p.rank}</span>
              <span className="text-xs font-bold">{p.name}</span>
            </div>
          ))}
          <span className="text-white/30 text-xs font-black">VS</span>
          {teamB.map(p => (
            <div key={p.id} className={cn('flex items-center gap-1 px-2 py-1 rounded-lg', RANK_COLORS[p.rank])}>
              <span className="text-[10px] font-black">{p.rank}</span>
              <span className="text-xs font-bold">{p.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Shuttle edit */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-white/40 text-xs font-black">🏸</span>
        <button
          onClick={() => onEditGame(game.id, game.shuttlesUsed - 1)}
          disabled={game.shuttlesUsed <= 1}
          className="w-7 h-7 bg-white/10 hover:bg-white/20 disabled:opacity-20 text-white rounded-lg font-black flex items-center justify-center transition-colors"
        >−</button>
        <span className="text-white font-black text-base w-6 text-center">{game.shuttlesUsed}</span>
        <button
          onClick={() => onEditGame(game.id, game.shuttlesUsed + 1)}
          className="w-7 h-7 bg-white/10 hover:bg-white/20 text-white rounded-lg font-black flex items-center justify-center transition-colors"
        >+</button>
      </div>

      {/* Cost */}
      <div className="text-right shrink-0">
        <p className="text-white/40 text-[10px] font-black">ค่าลูก/คน</p>
        <p className="text-white font-headline font-black text-base">฿{game.shuttleCostPerPerson.toFixed(0)}</p>
      </div>

      {/* Undo Button */}
      <button
        onClick={() => onUndoGame(game.id)}
        className="p-2 text-white/20 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
        title="ยกเลิกผลการตี (คืนเงินทุกคน)"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export function CourtsTab({
  members, courts, snacks, searchQuery, gameHistory,
  onAutoMatch, onStartGame, onResetCourt, onRemovePlayer, onAddPlayer,
  onDeleteCourt, onAddSnack, onEditGame, onUndoGame, onUpdateCourt,
  minRankFilter, setMinRankFilter, maxRankFilter, setMaxRankFilter,
  onAddCourt
}: Props) {
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(courts[0]?.id ?? null);
  const [posTarget, setPosTarget] = useState<Member | null>(null);
  const [localSearch, setLocalSearch] = useState('');

  const rankOptions = [...RANKS].reverse(); // from lower to higher P+ to VIP1

  useEffect(() => {
    if (!courts.find(c => c.id === selectedCourtId)) setSelectedCourtId(courts[0]?.id ?? null);
  }, [courts, selectedCourtId]);

  const selected = courts.find(c => c.id === selectedCourtId) ?? null;
  const isActive = selected?.status === 'active';
  const filledCount = selected ? selected.players.filter(Boolean).length : 0;

  // Games for this court only
  const courtGames = selected
    ? gameHistory.filter(g => g.courtId === selected.id).slice(0, 10)
    : [];

  const shuttlePrice = 25; // reflect same default; ideally from props

  const waiting = members
    .filter(m => m.status === 'waiting')
    .filter(m => {
      const query = (searchQuery + ' ' + localSearch).toLowerCase().trim();
      if (!query) return true;
      return m.name.toLowerCase().includes(query);
    })
    .filter(m => {
      const minW = RANK_WEIGHTS[minRankFilter] || 0;
      const maxW = RANK_WEIGHTS[maxRankFilter] || 15;
      const lower = Math.min(minW, maxW);
      const upper = Math.max(minW, maxW);
      const w = RANK_WEIGHTS[m.rank] || 0;
      return w >= lower && w <= upper;
    })
    .sort((a, b) => a.gamesPlayed !== b.gamesPlayed ? a.gamesPlayed - b.gamesPlayed : a.checkInTime - b.checkInTime);

  const handleSelect = (slot: number, pid: string | null) => {
    if (!selected || isActive) return;
    if (pid === null) onRemovePlayer(selected.id, slot);
    else onAddPlayer(selected.id, slot, pid);
  };

  const handleDoubleClick = (m: Member) => {
    if (!selected || isActive) return;
    const empty = selected.players.findIndex(p => p === null);
    if (empty !== -1) onAddPlayer(selected.id, empty, m.id);
    else alert('ไม่มีสล็อตว่างในคอร์ดนี้');
  };

  const addShuttle = (delta: number) => {
    if (!selected) return;
    onUpdateCourt(prev => prev.map(c => c.id === selected.id
      ? { ...c, shuttlecocks: Math.max(0, c.shuttlecocks + delta) } : c));
  };

  const teamA = selected ? [0, 1].map(i => members.find(m => m.id === selected.players[i]) ?? null) : [];
  const teamB = selected ? [2, 3].map(i => members.find(m => m.id === selected.players[i]) ?? null) : [];

  return (
    <div className="space-y-5">
      {/* Global POS modal */}
      <AnimatePresence>
        {posTarget && (
          <POSModal member={posTarget} snacks={snacks} onAddSnack={onAddSnack} onClose={() => setPosTarget(null)} />
        )}
      </AnimatePresence>

      {/* ── Court selector ── */}
      <div className="flex gap-3 flex-wrap">
        {courts.map(court => {
          const filled = court.players.filter(Boolean).length;
          const isSel = court.id === selectedCourtId;
          const active = court.status === 'active';
          return (
            <button key={court.id} onClick={() => setSelectedCourtId(court.id)}
              className={cn('flex items-center gap-2.5 px-5 py-3.5 rounded-2xl font-bold text-base transition-all border-2',
                isSel
                  ? active
                    ? 'bg-green-600 text-white border-green-600 shadow-lg shadow-green-600/25'
                    : 'bg-primary text-white border-primary shadow-lg shadow-primary/25'
                  : 'bg-white text-on-surface/70 border-on-surface/10 hover:border-primary/30 hover:text-primary')}>
              <div className={cn('w-2.5 h-2.5 rounded-full', active ? 'bg-green-300 animate-pulse' : isSel ? 'bg-white/50' : 'bg-on-surface/20')} />
              {court.name}
              {active
                ? <span className="text-xs font-black bg-white/20 px-2 py-0.5 rounded-full">กำลังตี</span>
                : <span className={cn('text-xs font-black px-1.5 py-0.5 rounded-full', isSel ? 'bg-white/20' : 'bg-on-surface/5 text-on-surface/40')}>{filled}/4</span>
              }
            </button>
          );
        })}
        
        {/* Add Court button */}
        <button onClick={onAddCourt}
          className="flex items-center gap-2 px-5 py-3.5 rounded-2xl font-black text-base transition-all border-2 border-dashed border-on-surface/10 text-on-surface/40 hover:border-primary/50 hover:text-primary hover:bg-primary/5">
          <Plus size={18} /> เพิ่มคอร์ด
        </button>
      </div>

      {selected ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

          {/* ── Waiting Queue ── */}
          <section className="xl:col-span-3 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-headline font-black text-xl">คิวรอ</h3>
                <span className="bg-primary/10 text-primary text-sm px-2.5 py-0.5 rounded-full font-black">{waiting.length}</span>
              </div>
              {isActive && (
                <div className="bg-green-50 px-3 py-1 rounded-full border border-green-200">
                  <p className="text-green-700 font-black text-[10px] uppercase">🏸 กำลังตี</p>
                </div>
              )}
            </div>

            {/* Filter Section */}
            <div className="space-y-3">
              {/* Local Search */}
              <div className="relative group">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface/30 group-focus-within:text-primary transition-colors" />
                <input 
                  value={localSearch}
                  onChange={e => setLocalSearch(e.target.value)}
                  placeholder="ค้นหาในคิว..." 
                  className="w-full pl-9 pr-3 py-2 bg-white border border-on-surface/5 rounded-xl text-xs font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none shadow-sm"
                />
              </div>

              {/* Rank Filter Range dropdowns */}
              <div className="space-y-2 bg-on-surface/2 p-3 rounded-2xl border border-on-surface/5">
                <p className="text-[10px] font-black uppercase text-on-surface/30 tracking-widest flex items-center gap-1.5 px-1">
                  <Bolt size={10} className="text-secondary" />
                  ช่วงระดับฝีมือที่ต้องการ
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <select
                      value={minRankFilter}
                      onChange={e => setMinRankFilter(e.target.value as Rank)}
                      className="w-full pl-3 pr-8 py-2 bg-white rounded-xl text-xs font-black appearance-none outline-none border-2 border-transparent focus:border-primary/20 shadow-sm transition-all"
                    >
                      {rankOptions.map(r => (
                        <option key={r} value={r}>{r} ({RANK_LEVEL_LABELS[r]})</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface/30 pointer-events-none" />
                  </div>
                  <span className="text-on-surface/20 text-xs font-black">—</span>
                  <div className="flex-1 relative">
                    <select
                      value={maxRankFilter}
                      onChange={e => setMaxRankFilter(e.target.value as Rank)}
                      className="w-full pl-3 pr-8 py-2 bg-white rounded-xl text-xs font-black appearance-none outline-none border-2 border-transparent focus:border-primary/20 shadow-sm transition-all"
                    >
                      {rankOptions.map(r => (
                        <option key={r} value={r}>{r} ({RANK_LEVEL_LABELS[r]})</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface/30 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2 max-h-[calc(100vh-450px)] overflow-y-auto pr-1 no-scrollbar">
              {waiting.map((m, idx) => (
                <div key={m.id}
                  draggable={!isActive}
                  onDragStart={e => { if (isActive) return; draggingPlayerId = m.id; e.dataTransfer.setData('playerId', m.id); }}
                  onDragEnd={() => { draggingPlayerId = null; }}
                  onDoubleClick={() => handleDoubleClick(m)}
                  className={cn(
                    'bg-white rounded-2xl p-3.5 shadow-sm flex items-center gap-3 border-2 border-transparent transition-all group',
                    isActive ? 'opacity-60 cursor-default' : 'cursor-grab active:cursor-grabbing hover:border-primary/20 hover:shadow-md'
                  )}
                >
                  <span className="text-sm font-black text-on-surface/25 w-5 shrink-0">{idx + 1}</span>
                  <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center font-black text-base shrink-0', RANK_COLORS[m.rank])}>{m.rank}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{m.name}</p>
                    <div className="flex gap-2 mt-0.5 flex-wrap">
                      <span className="text-[11px] font-black text-primary/70 bg-primary/5 px-1.5 py-0.5 rounded">{m.gamesPlayed} เกม</span>
                      {m.balance > 0 && <span className="text-[11px] font-black text-error/70 bg-error/5 px-1.5 py-0.5 rounded">฿{m.balance.toFixed(0)}</span>}
                    </div>
                  </div>
                  {/* POS button — always visible for queue members */}
                  <button
                    onClick={e => { e.stopPropagation(); setPosTarget(m); }}
                    className="p-2 rounded-xl text-on-surface/30 hover:text-primary hover:bg-primary/5 transition-all opacity-0 group-hover:opacity-100 shrink-0"
                    title="ซื้อสินค้า"
                  >
                    <ShoppingCart size={16} />
                  </button>
                </div>
              ))}
              {waiting.length === 0 && (
                <div className="text-center py-10 bg-white/50 rounded-2xl border-2 border-dashed border-on-surface/10">
                  <p className="text-sm text-on-surface/30 font-bold">ไม่มีผู้เล่นรอ</p>
                </div>
              )}
            </div>
          </section>

          {/* ── Court Visualization ── */}
          <section className="xl:col-span-9 space-y-4">
            <div className="rounded-[2rem] shadow-xl relative"
              style={{ background: isActive ? 'linear-gradient(160deg,#0f3020,#082212)' : 'linear-gradient(160deg,#1a3a2a,#0f2218)' }}>

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className={cn('w-3 h-3 rounded-full shrink-0', isActive ? 'bg-green-400 animate-pulse' : 'bg-white/20')} />
                  <h2 className="font-headline font-black text-2xl text-white">{selected.name}</h2>
                  {isActive
                    ? <span className="text-xs font-black bg-green-400/20 text-green-300 px-3 py-1.5 rounded-full">🏸 กำลังตีอยู่</span>
                    : <span className="text-xs text-white/40 font-bold">{filledCount}/4 คน</span>
                  }
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  {/* Shuttle counter - Visible in all states */}
                  <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-2xl px-4 py-2.5">
                    <button onClick={() => addShuttle(-1)} disabled={selected.shuttlecocks <= 0}
                      className="w-9 h-9 bg-white/10 text-white rounded-xl font-black text-lg flex items-center justify-center hover:bg-white/20 transition-colors disabled:opacity-20">-</button>
                    <div className="text-center px-1">
                      <p className="text-white/40 text-[8px] font-black uppercase leading-none mb-1">จำนวนลูก</p>
                      <p className="text-white font-headline font-black text-2xl leading-none">{selected.shuttlecocks}</p>
                    </div>
                    <button onClick={() => addShuttle(1)}
                      className="w-9 h-9 bg-green-400 text-green-900 rounded-xl font-black text-lg flex items-center justify-center hover:bg-green-300 transition-colors shadow-md">+</button>
                  </div>

                  {/* Cost preview */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-center">
                    <p className="text-white/40 text-[10px] font-black uppercase">ค่าลูก/คน</p>
                    <p className="text-white font-headline font-black text-lg">฿{(selected.shuttlecocks * 25).toFixed(0)}</p>
                  </div>

                  {isActive ? (
                    <button onClick={() => onResetCourt(selected.id)}
                      className="flex items-center gap-2 bg-red-500 text-white px-5 py-2.5 rounded-xl font-black uppercase text-sm tracking-widest shadow-lg hover:bg-red-400 hover:scale-105 transition-all">
                      <Check size={16} />จบเกม
                    </button>
                  ) : (
                    <>
                      <button onClick={() => onAutoMatch(selected.id)}
                        className="bg-white/10 border border-white/20 text-white px-4 py-2.5 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-white/20 transition flex items-center gap-2">
                        <Bolt size={13} fill="currentColor" />Auto-Fill
                      </button>
                      <button
                        onClick={() => onStartGame(selected.id)}
                        disabled={filledCount !== 4}
                        className={cn(
                          'flex items-center gap-2 px-6 py-2.5 rounded-xl font-black uppercase text-sm tracking-widest shadow-lg transition-all',
                          filledCount === 4
                            ? 'bg-green-400 text-green-900 hover:bg-green-300 hover:scale-105'
                            : 'bg-white/10 text-white/30 cursor-not-allowed border border-white/10'
                        )}>
                        ▶ เริ่ม {filledCount !== 4 && `(${filledCount}/4)`}
                      </button>
                      <button onClick={() => onDeleteCourt(selected.id)}
                        className="text-white/30 hover:text-red-400 p-2.5 rounded-xl hover:bg-red-400/10 transition-all">
                        <Trash2 size={20} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Court area */}
              <div className="px-6 pb-6">
                <div className="relative">
                  {/* Background Layer (Clipped) */}
                  <div className={cn(
                    "absolute inset-0 rounded-2xl overflow-hidden transition-colors",
                    isActive ? "bg-[#155c2e]" : "bg-[#1d7a3a]"
                  )}>
                    <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100"
                      style={{ opacity: 0.18, fill: 'none', stroke: 'white', strokeWidth: 0.5 }}>
                      <rect x="5" y="3" width="90" height="94" />
                      <line x1="5" y1="50" x2="95" y2="50" strokeWidth="1" />
                      <line x1="5" y1="26" x2="95" y2="26" /><line x1="5" y1="74" x2="95" y2="74" />
                      <line x1="50" y1="3" x2="50" y2="26" /><line x1="50" y1="74" x2="50" y2="97" />
                      <line x1="5" y1="15" x2="95" y2="15" /><line x1="5" y1="85" x2="95" y2="85" />
                      <line x1="12" y1="3" x2="12" y2="97" /><line x1="88" y1="3" x2="88" y2="97" />
                    </svg>
                    
                    {/* Net */}
                    <div className="absolute left-0 right-0" style={{ top: '50%', transform: 'translateY(-50%)' }}>
                      <div className="w-full h-1.5 bg-white/30 relative">
                        <div className="absolute left-1/2 -top-4 -translate-x-1/2 bg-white/90 text-green-900 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">NET</div>
                      </div>
                    </div>
                  </div>

                  {/* Interactive Layer (Allow Overflows for Search) */}
                  <div className="relative z-10">
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-primary/80 text-white text-xs font-black px-4 py-1 rounded-full z-10 shadow-lg">ทีม A</div>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-secondary/80 text-white text-xs font-black px-4 py-1 rounded-full z-10 shadow-lg">ทีม B</div>

                    <div className="grid grid-rows-2">
                      <div className="grid grid-cols-2 gap-4 p-6 pb-10">
                        {[0, 1].map(i => (
                          <SlotCard key={i} slotIndex={i} playerId={selected.players[i]} team="A"
                            members={members} onSelect={id => handleSelect(i, id)} locked={isActive} />
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-4 p-6 pt-10">
                        {[2, 3].map(i => (
                          <SlotCard key={i} slotIndex={i} playerId={selected.players[i]} team="B"
                            members={members} onSelect={id => handleSelect(i, id)} locked={isActive} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* VS bar */}
                <div className="mt-4 flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-5 py-3">
                  <div className="flex-1 min-w-0 text-right">
                    <p className="text-[11px] font-black text-primary/80 uppercase mb-0.5">ทีม A</p>
                    <p className="text-white text-sm font-bold truncate">{teamA.filter(Boolean).map(p => p!.name).join(' & ') || '—'}</p>
                  </div>
                  <span className="text-white/40 font-black text-base shrink-0">VS</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black text-secondary/80 uppercase mb-0.5">ทีม B</p>
                    <p className="text-white text-sm font-bold truncate">{teamB.filter(Boolean).map(p => p!.name).join(' & ') || '—'}</p>
                  </div>
                </div>
              </div>

              {/* ── Game History for this court ── */}
              {courtGames.length > 0 && (
                <div className="px-6 pb-6 space-y-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-headline font-black text-white text-base">เกมที่ผ่านมา</h3>
                    <span className="text-xs font-black bg-white/10 text-white/60 px-2 py-0.5 rounded-full">{courtGames.length} เกม</span>
                    <span className="text-[10px] text-white/30 font-bold">กด +/− เพื่อแก้จำนวนลูก</span>
                  </div>
                  <div className="space-y-2">
                    {courtGames.map(game => (
                      <GameRow key={game.id} game={game} onEditGame={onEditGame} onUndoGame={onUndoGame} shuttlePrice={shuttlePrice} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      ) : (
        <div className="text-center py-24 bg-white/60 rounded-3xl border-2 border-dashed border-on-surface/10">
          <p className="font-bold text-on-surface/40 text-lg">กด "+ เพิ่มคอร์ด" เพื่อเริ่มต้น</p>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { UserPlus, Trash2, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Member, Rank, RANKS, RANK_COLORS, RANK_LEVEL_LABELS } from '../types';

interface Props {
  members: Member[];
  searchQuery: string;
  onRemove: (id: string) => void;
  onAddMember: () => void;
  onUpdateRank: (memberId: string, rank: Rank) => void;
}

type Filter = 'all' | 'waiting' | 'playing' | 'resting';

export function MembersTab({ members, searchQuery, onRemove, onAddMember, onUpdateRank }: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filtered = members.filter(m => {
    const matchSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchFilter = filter === 'all' || m.status === filter;
    return matchSearch && matchFilter;
  }).sort((a, b) => a.checkInTime - b.checkInTime);

  const filters: { id: Filter; label: string }[] = [
    { id: 'all', label: `ทั้งหมด (${members.length})` },
    { id: 'waiting', label: `รอ (${members.filter(m => m.status === 'waiting').length})` },
    { id: 'playing', label: `เล่น (${members.filter(m => m.status === 'playing').length})` },
    { id: 'resting', label: `พัก (${members.filter(m => m.status === 'resting').length})` },
  ];

  return (
    <div className="space-y-6">
      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap">
        {filters.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={cn('px-4 py-2 rounded-full font-bold text-xs uppercase transition-all',
              filter === f.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white text-on-surface/60 hover:bg-white/80')}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Member list */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {filtered.map(member => (
            <motion.div key={member.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl p-5 shadow-sm border border-on-surface/5 relative group">
              <div className="flex items-start gap-4">
                <div className="relative group/rank cursor-pointer shrink-0">
                  <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center font-black text-base transition-transform group-hover/rank:scale-105', RANK_COLORS[member.rank])}>
                    {member.rank}
                  </div>
                  <select
                    value={member.rank}
                    onChange={(e) => onUpdateRank(member.id, e.target.value as Rank)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  >
                    {RANKS.map(r => (
                      <option key={r} value={r}>{r} ({RANK_LEVEL_LABELS[r]})</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base text-on-surface truncate">{member.name}</h3>
                  <p className="text-xs font-bold text-primary">{RANK_LEVEL_LABELS[member.rank]}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[10px] font-black text-on-surface/40 uppercase">{member.gamesPlayed} เกม</span>
                    <span className="text-[10px] text-on-surface/20">•</span>
                    <span className="text-[10px] font-black text-on-surface/40 uppercase">
                      รอ: {Math.floor((Date.now() - member.checkInTime) / 60000)} นาที
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-on-surface/5">
                <div className={cn('text-[10px] font-black px-3 py-1 rounded-full uppercase',
                  member.status === 'playing' ? 'bg-tertiary/10 text-tertiary' :
                  member.status === 'waiting' ? 'bg-secondary/10 text-secondary' :
                  'bg-on-surface/5 text-on-surface/40')}>
                  {member.status === 'playing' ? '🏸 เล่นอยู่' : member.status === 'waiting' ? '⏳ รอในคิว' : '💤 พักผ่อน'}
                </div>
                <div className="flex items-center gap-2">
                  {member.balance > 0 && (
                    <span className="text-xs font-black text-error">฿{member.balance.toFixed(0)}</span>
                  )}
                  {confirmDelete === member.id ? (
                    <div className="flex gap-1">
                      <button onClick={() => { onRemove(member.id); setConfirmDelete(null); }}
                        className="text-[10px] bg-error text-white px-2 py-1 rounded-lg font-black">ลบ</button>
                      <button onClick={() => setConfirmDelete(null)}
                        className="text-[10px] bg-on-surface/10 px-2 py-1 rounded-lg font-black">ยกเลิก</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDelete(member.id)}
                      className="opacity-0 group-hover:opacity-100 text-on-surface/20 hover:text-error transition-all">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Add member button */}
        <motion.button layout onClick={onAddMember}
          className="bg-white/50 rounded-3xl p-5 border-2 border-dashed border-on-surface/15 hover:border-primary/40 hover:bg-white/80 transition-all flex flex-col items-center justify-center gap-3 min-h-[144px] text-on-surface/40 hover:text-primary">
          <UserPlus size={28} />
          <span className="font-black text-xs uppercase tracking-widest">เพิ่มผู้เล่น</span>
        </motion.button>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20 text-on-surface/30">
          <p className="font-bold">ไม่พบผู้เล่น</p>
        </div>
      )}
    </div>
  );
}

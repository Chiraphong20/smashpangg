import React from 'react';
import { History, LayoutDashboard, Trophy, Clock } from 'lucide-react';
import { cn } from '../lib/utils';
import { GameRecord, RANK_COLORS, SessionRecord } from '../types';
import { format } from 'date-fns';

interface Props {
  gameHistory: GameRecord[];
  sessionHistory: SessionRecord[];
  onViewSession: (session: SessionRecord) => void;
  onActiveTab: (tab: 'dashboard' | 'logs' | 'members' | 'courts' | 'finance') => void;
}

export function LogsTab({ gameHistory, sessionHistory, onViewSession, onActiveTab }: Props) {
  // Sort by time descending
  const logs = [...gameHistory].sort((a, b) => b.playedAt - a.playedAt);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
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

      {/* Session History Section */}
      {sessionHistory.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <h3 className="text-xs font-black uppercase text-on-surface/40 tracking-widest">เซสชันที่ผ่านมา</h3>
            <div className="h-px bg-on-surface/5 flex-1" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sessionHistory.map(session => (
              <button 
                key={session.id}
                onClick={() => {
                  onViewSession(session);
                  onActiveTab('dashboard');
                }}
                className="bg-white hover:bg-primary/5 rounded-[2rem] p-5 shadow-sm border border-on-surface/5 flex items-center justify-between group transition-all text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary/5 rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <Clock size={20} />
                  </div>
                  <div>
                    <p className="font-black text-sm text-on-surface">เซสชัน {format(session.date, 'do MMM yyyy')}</p>
                    <p className="text-[10px] font-bold text-on-surface/40">
                      {session.gameHistory.length} เกม · {session.membersSnapshot.length} ผู้เล่น
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                  ดูรายละเอียด <LayoutDashboard size={14} />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 px-1">
        <h3 className="text-xs font-black uppercase text-secondary/60 tracking-widest">รายการของวันนี้</h3>
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
                    <p className="text-[10px] font-black text-on-surface/30 uppercase tracking-widest">{format(game.playedAt, 'do MMMM')}</p>
                  </div>
                </div>

                {/* Court Info */}
                <div className="flex items-center gap-3 bg-background px-4 py-3 rounded-2xl shrink-0">
                  <Trophy size={16} className="text-primary/60" />
                  <span className="font-black text-sm">{game.courtName}</span>
                </div>

                {/* Matchup */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Team A */}
                    <div className="flex items-center gap-1.5 p-1.5 bg-primary/5 rounded-xl border border-primary/10">
                      <div className="flex items-center -space-x-2">
                        {game.players.slice(0, 2).map((p, i) => (
                          <div key={p.id} className={cn('w-8 h-8 rounded-lg border-2 border-white flex items-center justify-center font-black text-[10px] shadow-sm', RANK_COLORS[p.rank])}>
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
                          <div key={p.id} className={cn('w-8 h-8 rounded-lg border-2 border-white flex items-center justify-center font-black text-[10px] shadow-sm', RANK_COLORS[p.rank])}>
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

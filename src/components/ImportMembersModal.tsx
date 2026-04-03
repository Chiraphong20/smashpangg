import React, { useState } from 'react';
import { X, FileText, UserPlus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Rank, RANKS, RANK_COLORS, RANK_LEVEL_LABELS } from '../types';

interface ParsedMember {
  id: string;
  name: string;
  rank: Rank;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onImport: (members: { name: string; rank: Rank }[]) => void;
}

// Parse LINE signup text → names
function parseLine(text: string): string[] {
  const lines = text.split('\n');
  const names: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Match "1 ชื่อ", "1. ชื่อ", "1ชื่อ", "- ชื่อ" patterns
    const match = trimmed.match(/^[\d]+[\.\):\s-]*\s*(.+)$/) || trimmed.match(/^[-•*]\s+(.+)$/);
    if (match) {
      let name = match[1].trim();
      // Remove trailing notes like time "18.30", parens, extra text that starts after 2 Thai words
      // Keep the full name as-is — user can edit
      name = name.replace(/\s*\(ไม่มา\).*$/i, '').trim();
      names.push(name);
    }
  }
  return names;
}

export function ImportMembersModal({ open, onClose, onImport }: Props) {
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<ParsedMember[]>([]);
  const [step, setStep] = useState<'paste' | 'confirm'>('paste');

  const handleParse = () => {
    const names = parseLine(text);
    if (names.length === 0) { alert('ไม่พบรายชื่อ — ลองวางข้อความในรูปแบบ "1 ชื่อ" หรือ "- ชื่อ"'); return; }
    setParsed(names.map((name, i) => ({ id: `import-${i}`, name, rank: 'P' as Rank })));
    setStep('confirm');
  };

  const updateRank = (id: string, rank: Rank) => {
    setParsed(prev => prev.map(p => p.id === id ? { ...p, rank } : p));
  };
  const updateName = (id: string, name: string) => {
    setParsed(prev => prev.map(p => p.id === id ? { ...p, name } : p));
  };
  const removeParsed = (id: string) => {
    setParsed(prev => prev.filter(p => p.id !== id));
  };

  const handleImport = () => {
    const valid = parsed.filter(p => p.name.trim().length > 0);
    onImport(valid.map(p => ({ name: p.name.trim(), rank: p.rank })));
    setText('');
    setParsed([]);
    setStep('paste');
    onClose();
  };

  const handleClose = () => {
    setText(''); setParsed([]); setStep('paste');
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4" onClick={handleClose}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-on-surface/50 backdrop-blur-sm" />
      <motion.div initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl relative z-10 flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center gap-4 p-6 border-b border-on-surface/5 shrink-0">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
            <FileText size={22} className="text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="font-headline font-black text-xl">นำเข้าจากไลน์</h2>
            <p className="text-xs text-on-surface/40">
              {step === 'paste' ? 'วางข้อความการลงชื่อจากไลน์' : `พบ ${parsed.length} รายชื่อ — ตั้งระดับมือแล้วนำเข้า`}
            </p>
          </div>
          <button onClick={handleClose} className="p-2 rounded-full hover:bg-background"><X size={20} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
          {step === 'paste' ? (
            <>
              {/* Example */}
              <div className="bg-primary/5 rounded-2xl p-4 text-xs space-y-1">
                <p className="font-black text-primary uppercase tracking-widest text-[10px] mb-2">รูปแบบที่รองรับ</p>
                <p className="text-on-surface/60 font-mono">1 บิ๊ก</p>
                <p className="text-on-surface/60 font-mono">2 นง</p>
                <p className="text-on-surface/60 font-mono">9 พี่ศิ 18.30</p>
                <p className="text-on-surface/40 mt-2">ระบบจะดึงชื่ออัตโนมัติ แก้ไขได้ก่อนนำเข้า</p>
              </div>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder={'วางข้อความตรงนี้...\n\n1 บิ๊ก\n2 นง\n3 หนุ่ม\n4 ตั้ว\n5 สถิต'}
                className="w-full h-72 px-4 py-3 bg-background rounded-2xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                autoFocus
              />
            </>
          ) : (
            <div className="space-y-2">
              {parsed.map((p, idx) => (
                <div key={p.id} className="flex items-center gap-3 bg-background rounded-2xl px-4 py-3">
                  <span className="text-xs font-black text-on-surface/30 w-6 text-center shrink-0">{idx + 1}</span>
                  {/* Name input */}
                  <input
                    value={p.name}
                    onChange={e => updateName(p.id, e.target.value)}
                    className="flex-1 bg-transparent font-bold text-sm focus:outline-none min-w-0"
                  />
                  {/* Rank selector */}
                  <div className="grid grid-cols-5 gap-1 shrink-0 overflow-visible">
                    {RANKS.map(r => (
                      <button key={r} onClick={() => updateRank(p.id, r)}
                        title={RANK_LEVEL_LABELS[r]}
                        className={cn(
                          'w-7 h-7 rounded-lg text-[9px] font-black transition-all border-2 border-transparent',
                          p.rank === r
                            ? RANK_COLORS[r] + ' border-primary shadow-sm scale-110'
                            : 'bg-on-surface/5 text-on-surface/40 hover:bg-on-surface/10'
                        )}>
                        {r}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => removeParsed(p.id)}
                    className="text-on-surface/20 hover:text-error p-1 shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-on-surface/5 flex items-center gap-3 shrink-0">
          {step === 'confirm' && (
            <button onClick={() => setStep('paste')}
              className="px-5 py-3 rounded-2xl font-bold text-sm text-on-surface/60 hover:bg-background transition-colors">
              ← แก้ข้อความ
            </button>
          )}
          <div className="flex-1" />
          <button onClick={handleClose}
            className="px-5 py-3 rounded-2xl font-bold text-sm text-on-surface/60 hover:bg-background transition-colors">
            ยกเลิก
          </button>
          {step === 'paste' ? (
            <button onClick={handleParse} disabled={!text.trim()}
              className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl font-black text-sm disabled:opacity-40 hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-primary/20">
              วิเคราะห์รายชื่อ →
            </button>
          ) : (
            <button onClick={handleImport} disabled={parsed.length === 0}
              className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl font-black text-sm disabled:opacity-40 hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-primary/20">
              <UserPlus size={16} />
              นำเข้า {parsed.length} คน
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { Member, Snack, RANK_COLORS } from '../types';

interface Props {
  member: Member;
  snacks: Snack[];
  onAddSnack: (memberId: string, snack: Snack) => void;
  onClose: () => void;
}

export function POSModal({ member, snacks, onAddSnack, onClose }: Props) {
  const [customPrice, setCustomPrice] = useState('');
  const [customName, setCustomName] = useState('อื่นๆ');

  const handleAddCustom = () => {
    const price = parseFloat(customPrice);
    if (isNaN(price) || price <= 0) return;
    onAddSnack(member.id, {
      id: 'custom-' + Date.now(),
      name: customName || 'อื่นๆ',
      price: price,
      icon: '🛒'
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-on-surface/50 backdrop-blur-sm" />
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-white w-full max-w-sm rounded-[2rem] p-6 relative z-10 shadow-2xl overflow-hidden">
        
        <div className="flex items-center gap-3 mb-6">
          <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center font-black shrink-0', RANK_COLORS[member.rank])}>
            {member.rank}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-headline font-black text-xl truncate">{member.name}</p>
            <p className="text-xs text-on-surface/40 font-bold uppercase tracking-wider">เลือกรายการสินค้า</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-background transition-colors text-on-surface/20 hover:text-on-surface">
            <X size={20} />
          </button>
        </div>

        {/* Custom Price Section */}
        <div className="mb-6 p-4 bg-primary/5 rounded-3xl border-2 border-primary/10">
          <p className="text-[10px] font-black uppercase text-primary/60 mb-3 tracking-widest px-1">กรอกจำนวนเงินเอง</p>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="รายการ (เช่น พันด้าม)"
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
              className="flex-1 min-w-0 bg-white border-none rounded-xl px-3 py-2.5 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none shadow-sm"
            />
            <div className="w-24 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface/30 text-xs font-black">฿</span>
              <input 
                type="number" 
                placeholder="0"
                value={customPrice}
                onChange={e => setCustomPrice(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
                className="w-full pl-6 pr-3 py-2.5 bg-white border-none rounded-xl text-xs font-black focus:ring-2 focus:ring-primary/20 outline-none shadow-sm"
              />
            </div>
            <button 
              onClick={handleAddCustom}
              disabled={!customPrice}
              className="bg-primary text-white p-2.5 rounded-xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:scale-100"
            >
              <Plus size={20} strokeWidth={3} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
          {snacks.map(s => (
            <button key={s.id} onClick={() => { onAddSnack(member.id, s); onClose(); }}
              className="flex flex-col items-start p-4 bg-background rounded-2xl hover:bg-primary/5 active:scale-95 transition-all border-2 border-transparent hover:border-primary/20 group text-left">
              <span className="text-3xl mb-3 group-hover:scale-110 transition-transform origin-left">{s.icon}</span>
              <span className="text-xs font-black block truncate w-full">{s.name}</span>
              <span className="text-[10px] font-black text-secondary mt-0.5">฿{s.price}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

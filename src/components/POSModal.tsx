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
  const [sessionItems, setSessionItems] = useState<Snack[]>([]);

  const handleAdd = (snack: Snack) => {
    onAddSnack(member.id, snack);
    setSessionItems(prev => [snack, ...prev]);
  };

  const handleAddCustom = () => {
    let price = parseFloat(customPrice);
    if (isNaN(price) || price === 0) return;
    
    let finalName = customName;
    if (finalName === 'อื่นๆ') {
      if (price === 10) finalName = 'ค่าน้ำ';
      if (price === -10) finalName = 'ลบค่าน้ำ';
    }

    const snack: Snack = {
      id: 'custom-' + Date.now(),
      name: finalName || 'อื่นๆ',
      price: price,
      icon: price < 0 ? '🔄' : '🛒'
    };

    handleAdd(snack);
    setCustomPrice(''); // Clear for next one
    setCustomName('อื่นๆ');
  };

  const handleQuickWater = (amount: number) => {
    const snack: Snack = {
      id: 'water-' + Date.now(),
      name: amount > 0 ? 'ค่าน้ำ' : 'ลบค่าน้ำ',
      price: amount,
      icon: amount > 0 ? '💧' : '🔄'
    };
    handleAdd(snack);
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-on-surface/50 backdrop-blur-sm" />
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-white w-full max-w-lg rounded-[2rem] p-8 relative z-10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="flex items-center gap-3 mb-4">
          <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center font-black shrink-0', RANK_COLORS[member.rank])}>
            {member.rank}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-headline font-black text-xl truncate">{member.name}</p>
            <p className="text-xs text-on-surface/40 font-bold uppercase tracking-wider">ยอดปัจจุบัน: ฿{member.balance.toFixed(0)}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-background transition-colors text-on-surface/20 hover:text-on-surface">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar pb-4 space-y-4">
          {/* Quick Water Section */}
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => handleQuickWater(10)}
              className="flex items-center justify-center gap-2 bg-blue-500 text-white py-3 rounded-2xl font-black text-sm shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all"
            >
              <Plus size={16} strokeWidth={4} /> บวกค่าน้ำ 10
            </button>
            <button 
              onClick={() => handleQuickWater(-10)}
              className="flex items-center justify-center gap-2 bg-red-500 text-white py-3 rounded-2xl font-black text-sm shadow-lg shadow-red-500/20 hover:scale-105 active:scale-95 transition-all"
            >
              <span className="text-lg leading-none">-</span> ลบค่าน้ำ 10
            </button>
          </div>

          {/* Custom Price Section */}
          <div className="p-4 bg-primary/5 rounded-3xl border-2 border-primary/10">
            <p className="text-[10px] font-black uppercase text-primary/60 mb-3 tracking-widest px-1">กรอกจำนวนเงินเอง</p>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="รายการ"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
                className="flex-1 min-w-0 bg-white border-none rounded-xl px-3 py-2.5 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none shadow-sm"
              />
              <div className="w-20 relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface/30 text-xs font-black">฿</span>
                <input 
                  type="number" 
                  placeholder="0"
                  value={customPrice}
                  onChange={e => setCustomPrice(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
                  className="w-full pl-5 pr-2 py-2.5 bg-white border-none rounded-xl text-xs font-black focus:ring-2 focus:ring-primary/20 outline-none shadow-sm"
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

          <div className="grid grid-cols-2 gap-3">
            {snacks.map(s => (
              <button key={s.id} onClick={() => handleAdd(s)}
                className="flex flex-col items-start p-3 bg-background rounded-2xl hover:bg-primary/5 active:scale-95 transition-all border-2 border-transparent hover:border-primary/20 group text-left">
                <span className="text-2xl mb-1 group-hover:scale-110 transition-transform origin-left">{s.icon}</span>
                <span className="text-[10px] font-black block truncate w-full">{s.name}</span>
                <span className="text-[9px] font-black text-secondary">฿{s.price}</span>
              </button>
            ))}
          </div>

          {/* Recently Added Section */}
          {sessionItems.length > 0 && (
            <div className="pt-4 border-t border-on-surface/5 space-y-2">
              <p className="text-[10px] font-black uppercase text-on-surface/30 tracking-widest px-1">เพิ่มแล้ววันนี้ ({sessionItems.length})</p>
              <div className="space-y-1.5">
                {sessionItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between bg-on-surface/2 px-3 py-2 rounded-xl text-[10px] font-bold">
                    <div className="flex items-center gap-2">
                      <span>{item.icon}</span>
                      <span className="text-on-surface/60">{item.name}</span>
                    </div>
                    <span className={cn("font-black", item.price < 0 ? "text-error" : "text-primary")}>
                      {item.price > 0 ? `+฿${item.price}` : `-฿${Math.abs(item.price)}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <button 
          onClick={onClose}
          className="w-full bg-on-surface text-white py-4 rounded-[1.5rem] font-black text-sm shadow-xl shadow-on-surface/10 hover:scale-[1.02] active:scale-95 transition-all mt-2"
        >
          {sessionItems.length > 0 ? "เรียบร้อย" : "ปิด"}
        </button>
      </motion.div>
    </div>
  );
}

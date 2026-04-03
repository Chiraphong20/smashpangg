import React, { useState } from 'react';
import { X, Plus, Trash2, Check, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Snack } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  snacks: Snack[];
  onSave: (snacks: Snack[]) => void;
}

const EMOJI_OPTIONS = ['💧','⚡','🏸','🍪','🥤','🍜','🍱','🍌','🍊','🧃','☕','🍩','🍫','🌮','🥗'];

export function ManageProductsModal({ open, onClose, snacks, onSave }: Props) {
  const [items, setItems] = useState<Snack[]>(snacks);
  const [editing, setEditing] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newIcon, setNewIcon] = useState('💧');

  const handleSave = () => {
    onSave(items);
    onClose();
  };

  const updateItem = (id: string, field: 'name' | 'price' | 'icon', value: string | number) => {
    setItems(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(s => s.id !== id));
  };

  const addItem = () => {
    if (!newName.trim() || !newPrice) return;
    const newSnack: Snack = {
      id: Math.random().toString(36).substr(2, 9),
      name: newName.trim(),
      price: Number(newPrice),
      icon: newIcon,
    };
    setItems(prev => [...prev, newSnack]);
    setNewName('');
    setNewPrice('');
    setNewIcon('💧');
    setShowAdd(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="absolute inset-0 bg-on-surface/60 backdrop-blur-sm" />
          <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white w-full max-w-md rounded-[2.5rem] p-8 relative z-10 shadow-2xl max-h-[90vh] flex flex-col">
            
            <div className="flex items-center justify-between mb-6 shrink-0">
              <h2 className="font-headline font-black text-2xl tracking-tighter">จัดการสินค้า</h2>
              <button onClick={onClose} className="p-2 hover:bg-background rounded-full transition-colors"><X size={22} /></button>
            </div>

            {/* Product list */}
            <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
              <AnimatePresence>
                {items.map(item => (
                  <motion.div key={item.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                    className="bg-background rounded-2xl p-4">
                    {editing === item.id ? (
                      <div className="space-y-3">
                        {/* Emoji picker */}
                        <div className="flex flex-wrap gap-1.5">
                          {EMOJI_OPTIONS.map(em => (
                            <button key={em} onClick={() => updateItem(item.id, 'icon', em)}
                              className={`text-xl p-1.5 rounded-xl transition-all ${item.icon === em ? 'bg-primary/10 ring-2 ring-primary' : 'hover:bg-on-surface/10'}`}>
                              {em}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            value={item.name}
                            onChange={e => updateItem(item.id, 'name', e.target.value)}
                            className="flex-1 px-3 py-2 bg-white rounded-xl border-none focus:ring-2 focus:ring-primary/20 font-bold text-sm"
                            placeholder="ชื่อสินค้า"
                          />
                          <input
                            type="number"
                            value={item.price}
                            onChange={e => updateItem(item.id, 'price', Number(e.target.value))}
                            className="w-20 px-3 py-2 bg-white rounded-xl border-none focus:ring-2 focus:ring-primary/20 font-bold text-sm"
                            placeholder="฿"
                          />
                          <button onClick={() => setEditing(null)}
                            className="bg-primary text-white p-2 rounded-xl hover:scale-105 transition-transform">
                            <Check size={16} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{item.icon}</span>
                        <div className="flex-1">
                          <p className="font-bold text-sm">{item.name}</p>
                          <p className="text-xs text-on-surface/40 font-bold">฿{item.price}</p>
                        </div>
                        <button onClick={() => setEditing(item.id)}
                          className="text-on-surface/30 hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-primary/10">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => deleteItem(item.id)}
                          className="text-on-surface/30 hover:text-error transition-colors p-1.5 rounded-lg hover:bg-error/10">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Add new product form */}
              <AnimatePresence>
                {showAdd && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="bg-primary/5 border-2 border-dashed border-primary/20 rounded-2xl p-4 space-y-3 overflow-hidden">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">สินค้าใหม่</p>
                    {/* Emoji picker */}
                    <div className="flex flex-wrap gap-1.5">
                      {EMOJI_OPTIONS.map(em => (
                        <button key={em} onClick={() => setNewIcon(em)}
                          className={`text-xl p-1.5 rounded-xl transition-all ${newIcon === em ? 'bg-primary/10 ring-2 ring-primary' : 'hover:bg-on-surface/10'}`}>
                          {em}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        autoFocus
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        className="flex-1 px-3 py-2 bg-white rounded-xl border-none focus:ring-2 focus:ring-primary/20 font-bold text-sm"
                        placeholder="ชื่อสินค้า"
                      />
                      <input
                        type="number"
                        value={newPrice}
                        onChange={e => setNewPrice(e.target.value)}
                        className="w-20 px-3 py-2 bg-white rounded-xl border-none focus:ring-2 focus:ring-primary/20 font-bold text-sm"
                        placeholder="฿"
                      />
                      <button onClick={addItem}
                        className="bg-primary text-white p-2 rounded-xl hover:scale-105 transition-transform">
                        <Check size={16} />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Add button */}
              <button onClick={() => setShowAdd(v => !v)}
                className="w-full py-3 rounded-2xl border-2 border-dashed border-on-surface/15 hover:border-primary/40 text-on-surface/40 hover:text-primary font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
                <Plus size={16} />{showAdd ? 'ซ่อน' : 'เพิ่มสินค้า'}
              </button>
            </div>

            {/* Save button */}
            <button onClick={handleSave}
              className="w-full bg-primary text-white py-4 rounded-2xl font-headline font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all shrink-0">
              บันทึก
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

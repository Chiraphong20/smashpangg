import React from 'react';
import { 
  Settings, 
  History, 
  RefreshCw, 
  TrendingUp, 
  Cloud, 
  Upload, 
  Download, 
  Plus, 
  Trash2 
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Rank } from '../types';

interface Props {
  courtFeePerPerson: number;
  setCourtFeePerPerson: (val: number) => void;
  shuttlePrice: number;
  setShuttlePrice: (val: number) => void;
  onSeedMockHistory: () => void;
  onResetDay: () => void;
  onFactoryReset: () => void;
  rankMemory: Record<string, Rank>;
}

export function SettingsTab({
  courtFeePerPerson, setCourtFeePerPerson,
  shuttlePrice, setShuttlePrice,
  onSeedMockHistory, onResetDay, onFactoryReset,
  rankMemory
}: Props) {
  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-20">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
          <Settings size={24} className="text-primary" />
        </div>
        <div>
          <h2 className="font-headline font-black text-2xl text-on-surface">ตั้งค่าระบบ</h2>
          <p className="text-xs text-on-surface/40 font-bold uppercase tracking-widest">System Configuration & Maintenance</p>
        </div>
      </div>



      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Pricing Section */}
        <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-on-surface/5 space-y-6">
          <h3 className="text-sm font-black uppercase tracking-widest text-on-surface/40 flex items-center gap-2">
            <TrendingUp size={18} className="text-primary" />
            ราคาและค่าบริการ
          </h3>
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface/30 ml-2">ค่าสนามต่อคน (฿)</label>
              <input 
                type="number" 
                value={courtFeePerPerson} 
                onChange={e => setCourtFeePerPerson(Number(e.target.value))}
                className="w-full px-6 py-4 bg-background rounded-2xl font-headline font-black text-3xl focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all border-none" 
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface/30 ml-2">ราคาลูกแบด (฿)</label>
              <input 
                type="number" 
                value={shuttlePrice} 
                onChange={e => setShuttlePrice(Number(e.target.value))}
                className="w-full px-6 py-4 bg-background rounded-2xl font-headline font-black text-3xl focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all border-none" 
              />
            </div>
          </div>
        </section>
      </div>

      {/* System Maintenance Section */}
      <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-on-surface/5 space-y-6">
        <h3 className="text-sm font-black uppercase tracking-widest text-on-surface/40">การจัดการระบบ</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button onClick={onSeedMockHistory} 
            className="flex items-center justify-between p-6 bg-secondary/5 hover:bg-secondary/10 rounded-3xl transition-all group border-none">
            <div className="text-left">
              <p className="text-sm font-black text-secondary uppercase leading-tight">Mock Data</p>
              <p className="text-[9px] text-on-surface/40 font-bold italic">สร้างข้อมูลจำลอง</p>
            </div>
            <Plus size={20} className="text-secondary group-hover:scale-125 transition-all" />
          </button>
          <button onClick={onResetDay} 
            className="flex items-center justify-between p-6 bg-error/5 hover:bg-error/10 rounded-3xl transition-all group border-none">
            <div className="text-left">
              <p className="text-sm font-black text-error uppercase leading-tight">Reset Day</p>
              <p className="text-[9px] text-on-surface/40 font-bold italic">เริ่มวันใหม่/ล้างกระดาน</p>
            </div>
            <RefreshCw size={20} className="text-error group-hover:rotate-180 transition-all duration-500" />
          </button>
          <button onClick={onFactoryReset} 
            className="flex items-center justify-between p-6 bg-error/5 hover:bg-error/10 rounded-3xl transition-all group border-none">
            <div className="text-left">
              <p className="text-sm font-black text-error uppercase leading-tight">Factory Reset</p>
              <p className="text-[9px] text-on-surface/40 font-bold italic">ลบข้อมูลทั้งหมดถาวร</p>
            </div>
            <Trash2 size={20} className="text-error group-hover:scale-125 transition-all" />
          </button>
        </div>
      </section>
    </div>
  );
}

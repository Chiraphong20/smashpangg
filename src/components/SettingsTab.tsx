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
  googleSheetUrl: string;
  setGoogleSheetUrl: (val: string) => void;
  onSync: () => void;
  isSyncing: boolean;
  isAutoSync: boolean;
  setIsAutoSync: (val: boolean) => void;
  onPushCloud: () => void;
  onPullCloud: () => void;
  onSeedMockHistory: () => void;
  onResetDay: () => void;
  onFactoryReset: () => void;
  rankMemory: Record<string, Rank>;
}

export function SettingsTab({
  courtFeePerPerson, setCourtFeePerPerson,
  shuttlePrice, setShuttlePrice,
  googleSheetUrl, setGoogleSheetUrl,
  onSync, isSyncing,
  isAutoSync, setIsAutoSync,
  onPushCloud, onPullCloud,
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

      {/* Real-time Sync Toggle */}
      <section className="bg-primary/5 rounded-[2.5rem] p-8 border border-primary/10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-headline font-black text-primary uppercase flex items-center gap-2">
              <Cloud size={18} />
              ระบบ Real-time Sync (Beta)
            </h3>
            <p className="text-[10px] text-on-surface/60 font-bold max-w-md">
              เปิดใช้งานการซิงค์ข้อมูลอัตโนมัติระหว่างเครื่อง (ซิงค์ทุก 10 วินาที) ต้องเปิดทั้งสองเครื่องเพื่อใช้งาน
            </p>
          </div>
          <button 
            onClick={() => setIsAutoSync(!isAutoSync)}
            className={cn(
              "w-14 h-8 rounded-full relative transition-all duration-300",
              isAutoSync ? "bg-primary" : "bg-on-surface/10"
            )}
          >
            <div className={cn(
              "absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-300 shadow-sm",
              isAutoSync ? "left-7" : "left-1"
            )} />
          </button>
        </div>
        {!googleSheetUrl && (
          <p className="text-[10px] text-error font-black italic">
            * ต้องระบุ Script Web App URL ด้านล่างก่อนถึงจะใช้งานได้
          </p>
        )}
      </section>

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

        {/* Cloud Sync Section */}
        <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-on-surface/5 space-y-6">
          <h3 className="text-sm font-black uppercase tracking-widest text-on-surface/40 flex items-center gap-2">
            <Cloud size={18} className="text-secondary" />
            สำรองข้อมูล Cloud
          </h3>
          <p className="text-xs text-on-surface/40 font-bold leading-relaxed">
            สำรองรายชื่อสมาชิกและระดับมือตบ ({Object.keys(rankMemory).length} รายชื่อ) เพื่อนำไปใช้กับเครื่องอื่นหรือเบราว์เซอร์อื่น
          </p>
          <div className="grid grid-cols-1 gap-3">
            <button onClick={onPushCloud} disabled={isSyncing}
              className="flex items-center justify-between p-5 bg-primary/5 hover:bg-primary/10 rounded-2xl transition-all group border-none">
              <div className="text-left">
                <p className="text-sm font-black text-primary uppercase">Backup to Cloud</p>
                <p className="text-[9px] text-on-surface/40 font-bold italic">อัปโหลดขึ้น Google Sheets</p>
              </div>
              <Upload size={20} className="text-primary group-hover:-translate-y-1 transition-all" />
            </button>
            <button onClick={onPullCloud} disabled={isSyncing}
              className="flex items-center justify-between p-5 bg-green-500/5 hover:bg-green-500/10 rounded-2xl transition-all group border-none">
              <div className="text-left">
                <p className="text-sm font-black text-green-600 uppercase">Restore from Cloud</p>
                <p className="text-[9px] text-on-surface/40 font-bold italic">ดาวน์โหลดข้อมูลมาลงเครื่องนี้</p>
              </div>
              <Download size={20} className="text-green-600 group-hover:translate-y-1 transition-all" />
            </button>
          </div>
        </section>
      </div>

      {/* Google Sheets Sync Section */}
      <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-on-surface/5 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-widest text-on-surface/40 flex items-center gap-2">
            <History size={18} className="text-secondary" />
            Google Sheets Synchronization
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-9 space-y-3">
            <label className="text-[10px] font-black text-on-surface/30 ml-2">Script Web App URL</label>
            <input
              type="text"
              value={googleSheetUrl}
              onChange={e => setGoogleSheetUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full px-5 py-4 bg-background rounded-2xl text-sm font-bold border-none focus:ring-4 focus:ring-secondary/10 transition-all"
            />
          </div>
          <div className="md:col-span-3">
            <button
              onClick={onSync}
              disabled={!googleSheetUrl || isSyncing}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-4.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all",
                !googleSheetUrl ? "bg-on-surface/5 text-on-surface/20 cursor-not-allowed" :
                  isSyncing ? "bg-secondary/20 text-secondary animate-pulse" : "bg-secondary text-white shadow-xl shadow-secondary/10 hover:scale-[1.02] active:scale-95"
              )}
            >
              {isSyncing ? <RefreshCw size={18} className="animate-spin" /> : <RefreshCw size={18} />}
              {isSyncing ? "กำลังส่ง..." : "ซิงค์ประวัติ"}
            </button>
          </div>
        </div>
      </section>

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

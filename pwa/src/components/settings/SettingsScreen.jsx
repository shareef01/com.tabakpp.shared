import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Check, Plus, ArrowUp, ArrowDown, Crown, Activity, Zap, Edit2, Trash2 } from 'lucide-react';
import { updateProfile } from 'firebase/auth';
import { auth } from '../../firebase';
import { Card, Input } from '../Common';

const ACCENTS = [
  { n: 'Cyan', v: '#00d2ff' }, { n: 'Lime', v: '#D4FF32' }, { n: 'Emerald', v: '#4ADE80' },
  { n: 'Violet', v: '#A78BFA' }, { n: 'Amber', v: '#FBBF24' }, { n: 'Rose', v: '#FB7185' }
];

const ProtocolListItem = React.memo(({ config, idx, total, onReo, onEdit, onDel }) => (
  <div className="flex flex-row justify-between items-center w-full p-6 md:p-8 bg-[#121316] rounded-[32px] border border-white/[0.05] group hover:border-accent/30 transition-all duration-500 shadow-xl overflow-hidden min-h-[100px] gap-6 font-inter">
    <div className="flex flex-row items-center gap-6 min-w-0 flex-1 text-left overflow-hidden">
      <div className="flex flex-col gap-2 shrink-0 items-center justify-center py-2">
        <button onClick={() => onReo(config.id, 'up')} disabled={idx === 0} className="text-white/60 hover:text-accent disabled:opacity-0 transition-all p-1 active:scale-75"><ArrowUp size={22} strokeWidth={3} /></button>
        <button onClick={() => onReo(config.id, 'down')} disabled={idx === total - 1} className="text-white/60 hover:text-accent disabled:opacity-0 transition-all p-1 active:scale-75"><ArrowDown size={22} strokeWidth={3} /></button>
      </div>
      <div className="w-14 h-14 md:w-16 md:h-16 bg-white/[0.03] border border-white/5 rounded-[18px] flex items-center justify-center text-accent/60 group-hover:text-accent transition-all shrink-0 shadow-inner">
        {config.type.startsWith('JOINT') ? <Crown size={28} /> : (config.type === 'SIMPLE' ? <Activity size={28} /> : <Zap size={28} />)}
      </div>
      <div className="flex flex-col gap-0.5 min-w-0 flex-1 overflow-hidden">
        <span className="text-xl md:text-2xl font-[900] tracking-tight uppercase group-hover:text-white transition-colors truncate leading-tight font-inter">{config.name}</span>
        <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em] font-inter opacity-60 truncate font-inter">Limit: {config.limit}</span>
      </div>
    </div>
    <div className="flex flex-row items-center gap-4 shrink-0 ml-2">
      <button onClick={() => onEdit(config)} className="w-11 h-11 rounded-[14px] bg-white/[0.1] border border-white/[0.05] flex items-center justify-center text-white/60 hover:text-accent active:scale-90 shadow-md transition-all"><Edit2 size={18} /></button>
      <button onClick={onDel} className="w-11 h-11 rounded-[14px] bg-white/[0.1] border border-white/[0.05] flex items-center justify-center text-white/60 hover:text-danger active:scale-90 shadow-md transition-all"><Trash2 size={18} /></button>
    </div>
  </div>
));

const cn = (...classes) => classes.filter(Boolean).join(' ');

export const SettingsScreen = ({ configs, user, settings, onAdd, onReo, onEditP, onUpd, onDel }) => {
  const [n, setN] = useState(user?.displayName || '');
  const [la, setLa] = useState(settings.accent);

  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-12 max-w-3xl mx-auto font-inter text-left font-inter">
       <Card className="p-12 bg-white/[0.02] border border-white/[0.03] rounded-[56px] shadow-2xl font-inter">
         <div className="flex flex-col items-center gap-10 font-inter">
           <div className="w-40 h-40 rounded-[48px] bg-accent/5 border-2 border-accent/20 flex items-center justify-center overflow-hidden shadow-2xl font-inter">
             <User size={64} className="text-accent" strokeWidth={3} />
           </div>
           <div className="w-full space-y-10 font-inter">
             <Input label="Display Name" value={n} onChange={setN} isDark />
             <button
               onClick={() => updateProfile(auth.currentUser, { displayName: n })}
               className="w-full h-20 bg-white text-zinc-950 font-black uppercase tracking-[0.5em] rounded-[28px] active:scale-95 transition-all font-inter"
             >
               Update Profile
             </button>
           </div>
         </div>
       </Card>

       <Card className="p-12 bg-white/[0.02] border border-white/[0.03] rounded-[56px] shadow-2xl font-inter">
          <div className="space-y-10 font-inter">
            <div className="px-2 text-left font-inter">
              <h3 className="text-[10px] font-black uppercase tracking-[0.8em] text-white/50 mb-2 font-inter">Appearance</h3>
              <span className="text-3xl font-[1000] tracking-tighter uppercase font-inter font-black">Accent Spectrum</span>
            </div>
            <div className="grid grid-cols-3 gap-6 font-inter">
              {ACCENTS.map(x => (
                <button
                  key={x.v}
                  onClick={() => setLa(x.v)}
                  className={cn("h-16 rounded-[24px] border-2 transition-all duration-500 relative flex items-center justify-center font-inter", la === x.v ? "border-white scale-105 shadow-2xl" : "border-white/[0.05] opacity-40 hover:opacity-100")}
                  style={{ backgroundColor: x.v }}
                >
                  {la === x.v && <Check size={24} className="text-white drop-shadow-md" strokeWidth={4} />}
                </button>
              ))}
            </div>
            <button
              onClick={() => onUpd({ accent: la })}
              className="w-full h-20 bg-white/[0.1] border border-white/5 text-white font-[1000] uppercase tracking-[0.5em] rounded-[28px] active:scale-95 transition-all shadow-xl hover:bg-white/[0.15] font-inter"
            >
              Save Color
            </button>
          </div>
       </Card>

       <Card className="p-12 bg-white/[0.02] border border-white/[0.03] rounded-[56px] shadow-2xl font-inter">
          <div className="flex items-center justify-between gap-8 mb-10 px-2 font-inter">
             <div className="space-y-2 text-left font-inter min-w-0 flex-1">
                <h3 className="text-[10px] font-black uppercase tracking-[0.8em] text-white/50 font-inter">Management</h3>
                <span className="text-3xl font-[1000] tracking-tighter uppercase font-inter font-black block truncate">Your Counters</span>
             </div>
             <button onClick={onAdd} className="p-5 bg-accent text-zinc-950 rounded-[24px] shadow-2xl active:scale-90 transition-all font-inter shrink-0">
               <Plus size={32} />
             </button>
          </div>
          <div className="space-y-6 font-inter">
            {configs.sort((a,b)=>a.order-b.order).map((c, idx) => (
              <ProtocolListItem
                key={c.id}
                config={c}
                idx={idx}
                total={configs.length}
                onReo={onReo}
                onEdit={onEditP}
                onDel={() => onDel(c.id)}
              />
            ))}
          </div>
       </Card>
    </motion.div>
  );
};

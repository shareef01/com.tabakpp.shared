import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Check, Plus, Minus } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { UI } from '../Common';
import { cn } from '../../utils/utils';

export const EditOverlay = ({ log, configs, onClose, user }) => {
  const [counts, setCounts] = useState(log.counts || {});

  const handleApply = async () => {
    try {
      await updateDoc(doc(db, 'users', user.uid, 'logs', log.logDate), { counts });
      onClose();
    } catch (e) {
      alert(e.message);
    }
  };

  const adjust = (id, delta) => {
    setCounts(prev => ({
      ...prev,
      [id]: Math.max(0, (prev[id] || 0) + delta)
    }));
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/80 backdrop-blur-2xl font-inter overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-[#121318] border border-white/10 rounded-[48px] w-full max-w-[500px] p-10 lg:p-12 shadow-2xl relative"
      >
        <div className="flex justify-between items-center mb-10">
          <div className="space-y-1">
            <h3 className="text-2xl font-[1000] tracking-tighter uppercase text-white">Adjust Registry</h3>
            <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block">
              Entry for {new Date(log.logDate).toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric'}).toUpperCase()}
            </span>
          </div>
          <button onClick={onClose} className="p-3 rounded-full hover:bg-white/5 transition-all text-neutral-500 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-6">
          {configs.map(c => (
            <div key={c.id} className="flex items-center justify-between p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
              <span className="text-sm font-bold text-white uppercase tracking-tight">{c.name}</span>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => adjust(c.id, -1)}
                  className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-neutral-500 hover:text-white transition-all"
                >
                  <Minus size={16} strokeWidth={3} />
                </button>
                <span className="text-xl font-[1000] tabular-nums text-white w-8 text-center">
                  {counts[c.id] || 0}
                </span>
                <button
                  onClick={() => adjust(c.id, 1)}
                  className="w-10 h-10 rounded-lg bg-accent text-zinc-950 flex items-center justify-center transition-all"
                >
                  <Plus size={16} strokeWidth={4} />
                </button>
              </div>
            </div>
          ))}

          <button
            onClick={handleApply}
            className="w-full h-18 bg-white text-zinc-950 font-[1000] uppercase tracking-[0.4em] rounded-2xl shadow-2xl active:scale-[0.98] transition-all text-[11px] mt-6 flex items-center justify-center gap-3"
          >
            <Check size={18} strokeWidth={3} />
            Commit Overrides
          </button>
        </div>
      </motion.div>
    </div>
  );
};

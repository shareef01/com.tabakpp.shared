import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { Input, UI } from '../Common';
import { cn } from '../../utils/utils';

export const ProtocolFormOverlay = ({ isOpen, onClose, onApply, title, initialData }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [limit, setLimit] = useState(initialData?.limit || 20);
  const [type, setType] = useState(initialData?.type || 'CIGARETTE');

  const TYPES = [
    { id: 'CIGARETTE', label: 'Cigarette' },
    { id: 'SIMPLE', label: 'Simple Ring' },
    { id: 'JOINT_KING', label: 'King Joint' },
    { id: 'JOINT_QUEEN', label: 'Queen Joint' },
    { id: 'GENERIC', label: 'Generic Bar' }
  ];

  const handleSubmit = () => {
    if (!name) return;
    onApply({ name, limit: parseInt(limit), type });
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
          <h3 className="text-2xl font-[1000] tracking-tighter uppercase text-white">{title}</h3>
          <button onClick={onClose} className="p-3 rounded-full hover:bg-white/5 transition-all text-neutral-500 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-8">
          <Input label="Counter Name" value={name} onChange={setName} isDark placeholder="e.g. Zigarettes" />

          <div className="flex flex-col gap-2">
            <span className={UI.LABEL}>Daily Limit</span>
            <input
              type="number"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className={UI.INPUT}
            />
          </div>

          <div className="flex flex-col gap-4">
            <span className={UI.LABEL}>Visualization Variant</span>
            <div className="grid grid-cols-2 gap-3">
              {TYPES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className={cn(
                    "p-4 rounded-2xl border text-[11px] font-bold uppercase tracking-widest transition-all",
                    type === t.id ? "bg-accent border-accent text-zinc-950 shadow-lg" : "bg-white/5 border-white/5 text-neutral-400 hover:border-white/10"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSubmit}
            className="w-full h-18 bg-white text-zinc-950 font-[1000] uppercase tracking-[0.4em] rounded-2xl shadow-2xl active:scale-[0.98] transition-all text-[11px] mt-4 flex items-center justify-center gap-3"
          >
            <Check size={18} strokeWidth={3} />
            Apply Changes
          </button>
        </div>
      </motion.div>
    </div>
  );
};

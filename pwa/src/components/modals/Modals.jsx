import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut } from 'lucide-react';

export const LogoutModal = ({ isOpen, onClose, onConfirm }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-8 bg-black/85 backdrop-blur-2xl font-inter">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 100 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 100 }}
          className="bg-[#121318] border border-white/10 rounded-[64px] w-full max-w-[440px] p-16 flex flex-col shadow-2xl relative overflow-hidden text-center"
        >
           <div className="absolute inset-0 border border-white/[0.03] rounded-[64px] pointer-events-none" />
           <div className="relative z-10 flex flex-col items-center space-y-10">
              <div className="w-24 h-24 rounded-[32px] bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shadow-2xl">
                 <LogOut size={40} strokeWidth={2.5} />
              </div>
              <div className="space-y-4">
                 <h3 className="text-4xl font-[1000] uppercase tracking-tighter leading-none">Terminate Session?</h3>
                 <p className="text-white/60 text-xs font-black uppercase tracking-widest leading-relaxed">
                   You will be required to re-authenticate to access your registry.
                 </p>
              </div>
              <div className="flex flex-col w-full gap-5">
                 <button
                   onClick={onConfirm}
                   className="w-full h-20 bg-rose-500 text-zinc-950 font-[1000] uppercase tracking-[0.4em] rounded-[28px] shadow-2xl active:scale-95 transition-all"
                 >
                   Terminate
                 </button>
                 <button
                   onClick={onClose}
                   className="w-full h-20 bg-white/[0.05] border border-white/[0.08] text-white/70 font-[1000] uppercase tracking-[0.4em] rounded-[28px] hover:bg-white/[0.08] transition-all"
                 >
                   Keep Syncing
                 </button>
              </div>
           </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

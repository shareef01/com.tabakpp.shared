import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { User, Check, Plus, ArrowUp, ArrowDown, Crown, Activity, Zap, Edit2, Trash2, Camera, Loader2 } from 'lucide-react';
import { updateProfile } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, storage } from '../../firebase';
import { Card, Input } from '../Common';
import { cn } from '../../utils/utils';

const ACCENTS = [
  { n: 'Cyan', v: '#00d2ff' }, { n: 'Lime', v: '#D4FF32' }, { n: 'Emerald', v: '#4ADE80' },
  { n: 'Violet', v: '#A78BFA' }, { n: 'Amber', v: '#FBBF24' }, { n: 'Rose', v: '#FB7185' }
];

/**
 * Optimized Protocol Item
 * Designed to look like a premium table row with muted actions.
 */
const ProtocolListItem = React.memo(({ config, idx, total, onReo, onEdit, onDel }) => (
  <div className="flex flex-row items-center w-full p-4 bg-black/30 rounded-2xl border border-white/5 group hover:border-white/10 transition-all duration-300 gap-4">
    {/* Drag/Order Handles */}
    <div className="flex flex-col gap-1 shrink-0">
      <button
        onClick={() => onReo(config.id, 'up')}
        disabled={idx === 0}
        className="text-neutral-600 hover:text-accent disabled:opacity-0 transition-colors"
      >
        <ArrowUp size={16} strokeWidth={3} />
      </button>
      <button
        onClick={() => onReo(config.id, 'down')}
        disabled={idx === total - 1}
        className="text-neutral-600 hover:text-accent disabled:opacity-0 transition-colors"
      >
        <ArrowDown size={16} strokeWidth={3} />
      </button>
    </div>

    {/* Icon Representation */}
    <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-accent/80 shrink-0 shadow-inner">
      {config.type.startsWith('JOINT') ? <Crown size={20} /> : (config.type === 'SIMPLE' ? <Activity size={20} /> : <Zap size={20} />)}
    </div>

    {/* Content */}
    <div className="flex flex-col min-w-0 flex-1">
      <span className="text-sm font-bold text-white uppercase tracking-tight truncate leading-tight">
        {config.name}
      </span>
      <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">
        Limit: {config.limit}
      </span>
    </div>

    {/* Actions */}
    <div className="flex items-center gap-1 shrink-0">
      <button
        onClick={() => onEdit(config)}
        className="p-2.5 rounded-lg text-neutral-500 hover:text-white hover:bg-white/10 transition-all"
      >
        <Edit2 size={16} />
      </button>
      <button
        onClick={onDel}
        className="p-2.5 rounded-lg text-neutral-500 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
      >
        <Trash2 size={16} />
      </button>
    </div>
  </div>
));

export const SettingsScreen = ({ configs, user, settings, onAdd, onReo, onEditP, onUpd, onDel }) => {
  const [n, setN] = useState(user?.displayName || '');
  const [la, setLa] = useState(settings.accent);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handlePfpUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const storageRef = ref(storage, `users/${user.uid}/pfp`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await updateProfile(auth.currentUser, { photoURL: url });
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Failed to upload image.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto px-4 lg:px-8 font-inter"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* LEFT COLUMN: Profile & Appearance (col-span-5) */}
        <div className="lg:col-span-5 space-y-8">

          {/* PROFILE CARD */}
          <section className="bg-neutral-900/40 backdrop-blur-xl border border-white/5 rounded-[32px] p-8 lg:p-10 shadow-xl shadow-black/50 relative overflow-hidden">
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-neutral-500 mb-8">
              Display Identity
            </h3>
            <div className="flex flex-col items-center gap-10">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePfpUpload}
                className="hidden"
                accept="image/*"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-32 h-32 rounded-[40px] bg-accent/5 border border-accent/20 flex items-center justify-center shadow-2xl relative group overflow-hidden transition-all hover:border-accent/50"
              >
                {uploading ? (
                  <Loader2 className="animate-spin text-accent" size={32} />
                ) : user?.photoURL ? (
                  <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                ) : (
                  <User size={48} className="text-accent" strokeWidth={2.5} />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera size={24} className="text-white" />
                </div>
              </button>
              <div className="w-full space-y-8">
                <Input label="Display Name" value={n} onChange={setN} isDark />
                <button
                  onClick={() => updateProfile(auth.currentUser, { displayName: n })}
                  className="w-full h-16 bg-white text-zinc-950 font-[1000] uppercase tracking-[0.4em] rounded-2xl active:scale-[0.98] transition-all text-[11px] shadow-2xl"
                >
                  Update Profile
                </button>
              </div>
            </div>
          </section>

          {/* APPEARANCE CARD */}
          <section className="bg-neutral-900/40 backdrop-blur-xl border border-white/5 rounded-[32px] p-8 lg:p-10 shadow-xl shadow-black/50">
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-neutral-500 mb-8">
              Appearance
            </h3>
            <div className="space-y-8">
              <div className="grid grid-cols-3 gap-4">
                {ACCENTS.map(x => (
                  <button
                    key={x.v}
                    onClick={() => setLa(x.v)}
                    className={cn(
                      "h-14 rounded-2xl border-2 transition-all duration-300 relative flex items-center justify-center",
                      la === x.v ? "border-white scale-105 shadow-xl" : "border-white/5 opacity-40 hover:opacity-100"
                    )}
                    style={{ backgroundColor: x.v }}
                  >
                    {la === x.v && <Check size={20} className="text-white drop-shadow-md" strokeWidth={4} />}
                  </button>
                ))}
              </div>
              <button
                onClick={() => onUpd({ accent: la })}
                className="w-full h-16 bg-white/5 border border-white/10 text-white font-[1000] uppercase tracking-[0.4em] rounded-2xl active:scale-[0.98] transition-all text-[11px] hover:bg-white/10"
              >
                Save Theme
              </button>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: Management (col-span-7) */}
        <div className="lg:col-span-7 h-full">
          <section className="bg-neutral-900/40 backdrop-blur-xl border border-white/5 rounded-[32px] p-8 lg:p-10 shadow-xl shadow-black/50 min-h-[600px] flex flex-col">
            <div className="flex items-center justify-between gap-8 mb-10">
               <div className="space-y-1">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-neutral-500">
                    Registry Management
                  </h3>
                  <span className="text-2xl font-[1000] tracking-tighter uppercase text-white block">
                    Your Counters
                  </span>
               </div>
               <button
                onClick={onAdd}
                className="w-12 h-12 bg-accent text-zinc-950 rounded-xl shadow-xl active:scale-90 transition-all flex items-center justify-center hover:rotate-90"
               >
                 <Plus size={24} strokeWidth={3} />
               </button>
            </div>

            <div className="space-y-4 flex-1">
              {configs.length > 0 ? (
                configs.sort((a,b)=>a.order-b.order).map((c, idx) => (
                  <ProtocolListItem
                    key={c.id}
                    config={c}
                    idx={idx}
                    total={configs.length}
                    onReo={onReo}
                    onEdit={onEditP}
                    onDel={() => onDel(c.id)}
                  />
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center py-20 text-neutral-600 space-y-4 border-2 border-dashed border-white/5 rounded-3xl">
                  <Zap size={48} className="opacity-20" />
                  <span className="text-xs font-black uppercase tracking-[0.4em]">No active counters</span>
                </div>
              )}
            </div>

            <div className="mt-10 pt-10 border-t border-white/5">
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-neutral-600 text-center leading-relaxed">
                Changes to counters are synchronized in real-time across all active sessions.
              </p>
            </div>
          </section>
        </div>
      </div>
    </motion.div>
  );
};

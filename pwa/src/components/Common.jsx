import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../utils/utils';

export const Card = ({ children, className, danger }) => (
  <div className={cn(
    "bg-bg-card rounded-card border border-white/5 shadow-2xl p-6 md:p-8",
    danger && "border-danger/20",
    className
  )}>
    {children}
  </div>
);

export const Button = ({ children, onClick, className, variant = 'primary', disabled }) => {
  const variants = {
    primary: "bg-accent text-accent-fg hover:opacity-90",
    secondary: "bg-white/10 text-white hover:bg-white/20 border border-white/10",
    danger: "bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20",
    outline: "bg-transparent border-2 border-text-dim text-text-main hover:border-text-muted"
  };

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "h-14 px-6 rounded-2xl font-black uppercase tracking-wider text-xs flex items-center justify-center transition-all disabled:opacity-50",
        variants[variant],
        className
      )}
    >
      {children}
    </motion.button>
  );
};

export const Input = ({ value, onChange, label, type = "text", placeholder }) => (
  <div className="flex flex-col space-y-2 w-full">
    {label && <span className="text-[10px] font-black text-accent tracking-[0.2em] uppercase ml-1">{label}</span>}
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-16 px-6 rounded-2xl bg-white/[0.03] border border-white/10 text-white focus:border-accent focus:outline-none transition-all placeholder:text-text-dim font-bold"
    />
  </div>
);

export const StaggeredItem = ({ children, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
  >
    {children}
  </motion.div>
);

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../utils/utils';

export const Card = ({ children, className, danger, noPadding }) => (
  <div className={cn(
    "bg-bg-card rounded-card border border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.4)] transition-all duration-500",
    !noPadding && "p-8 md:p-10",
    danger && "border-danger/30 bg-danger/[0.02]",
    className
  )}>
    {children}
  </div>
);

export const Button = ({ children, onClick, className, variant = 'primary', disabled, size = 'md' }) => {
  const variants = {
    primary: "bg-accent text-accent-fg shadow-[0_0_20px_rgba(var(--accent-rgb),0.3)]",
    secondary: "bg-white/[0.05] text-white border border-white/10 hover:bg-white/[0.08]",
    danger: "bg-danger text-white shadow-[0_0_20px_rgba(248,113,113,0.3)]",
    ghost: "bg-transparent text-text-dim hover:text-white hover:bg-white/5",
    outline: "bg-transparent border-2 border-white/10 text-white hover:border-accent hover:text-accent"
  };

  const sizes = {
    sm: "h-10 px-4 text-[9px]",
    md: "h-14 px-8 text-[11px]",
    lg: "h-20 px-10 text-[13px]"
  };

  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-2xl font-black uppercase tracking-[0.2em] flex items-center justify-center transition-all disabled:opacity-50 select-none overflow-hidden relative group",
        variants[variant],
        sizes[size],
        className
      )}
    >
      <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
      <span className="relative z-10 flex items-center">{children}</span>
    </motion.button>
  );
};

export const Input = ({ value, onChange, label, type = "text", placeholder }) => (
  <div className="flex flex-col space-y-3 w-full">
    {label && <span className="text-[10px] font-black text-text-dim tracking-[0.4em] uppercase ml-1">{label}</span>}
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-16 px-8 rounded-2xl bg-white/[0.02] border border-white/10 text-white focus:border-accent/40 focus:bg-white/[0.04] focus:outline-none transition-all placeholder:text-text-dim font-bold shadow-inner"
    />
  </div>
);

export const StaggeredItem = ({ children, index, className }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    className={className}
  >
    {children}
  </motion.div>
);

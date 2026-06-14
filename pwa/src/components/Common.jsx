import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../utils/utils';

/**
 * Optimized Common Components
 * Utilizes React.memo to prevent unnecessary re-renders during high-frequency data updates.
 */

export const Card = React.memo(({ children, className, danger, noPadding }) => (
  <div className={cn(
    "rounded-[32px] border transition-all duration-500 will-change-[border-color,background-color]",
    !noPadding && "p-8 md:p-10",
    danger && "border-danger/30 bg-danger/[0.02]",
    className
  )}>
    {children}
  </div>
));

export const Button = React.memo(({ children, onClick, className, variant = 'primary', disabled, size = 'md', style }) => {
  const variants = {
    primary: "bg-accent text-[#0C0C00] shadow-[0_0_20px_var(--accent-glow)]",
    secondary: "bg-white/[0.05] text-inherit border border-white/10 hover:bg-white/[0.08]",
    danger: "bg-danger text-white shadow-[0_0_20px_rgba(248,113,113,0.3)]",
    ghost: "bg-transparent text-text-dim hover:text-inherit hover:bg-white/5",
    outline: "bg-transparent border-2 border-accent/20 text-inherit hover:border-accent hover:text-accent hover:bg-accent/5"
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
      style={style}
      className={cn(
        "rounded-2xl font-[1000] uppercase tracking-[0.2em] flex items-center justify-center transition-all disabled:opacity-50 select-none overflow-hidden relative group shadow-2xl",
        variants[variant],
        sizes[size],
        className
      )}
    >
      <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500 will-change-transform" />
      <span className="relative z-10 flex items-center">{children}</span>
    </motion.button>
  );
});

export const Input = React.memo(({ value, onChange, label, type = "text", placeholder, isDark, className }) => (
  <div className={cn("flex flex-col w-full", className)}>
    {label && <span className="text-[10px] font-bold text-neutral-500 tracking-[0.3em] uppercase ml-1 mb-2">{label}</span>}
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        "h-14 px-6 rounded-xl border focus:ring-1 focus:ring-accent focus:border-accent outline-none transition-all placeholder:text-neutral-600 font-bold shadow-inner will-change-[border-color,background-color]",
        isDark ? "bg-neutral-900/50 border-neutral-700 text-white focus:bg-neutral-900/80" : "bg-black/[0.02] border-black/10 text-[#1D1D1F] focus:bg-black/[0.04]"
      )}
    />
  </div>
));

export const StaggeredItem = React.memo(({ children, index, className }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    className={cn(className, "will-change-[transform,opacity]")}
  >
    {children}
  </motion.div>
));

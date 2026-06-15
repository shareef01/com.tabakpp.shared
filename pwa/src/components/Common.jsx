import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../utils/utils';

/**
 * UI Constants for Design System Consistency
 */
export const UI = {
  CARD: "bg-neutral-900/40 backdrop-blur-xl border border-white/5 rounded-[32px] shadow-xl shadow-black/50 transition-all duration-500",
  INPUT: "h-14 px-6 rounded-2xl border bg-neutral-900/50 border-neutral-700 text-white focus:ring-1 focus:ring-accent focus:border-accent focus:bg-neutral-900/80 outline-none transition-all placeholder:text-neutral-600 font-bold shadow-inner",
  BUTTON_BASE: "rounded-2xl font-[1000] uppercase tracking-[0.4em] flex items-center justify-center transition-all active:scale-[0.98] disabled:opacity-50 select-none overflow-hidden relative group shadow-2xl",
  LABEL: "text-[10px] font-bold text-neutral-500 tracking-[0.3em] uppercase ml-1"
};

export const Card = React.memo(({ children, className, danger, noPadding }) => (
  <div className={cn(
    UI.CARD,
    !noPadding && "p-8 md:p-10",
    danger && "border-danger/30 bg-danger/[0.02]",
    "will-change-[border-color,background-color]",
    className
  )}>
    {children}
  </div>
));

export const Button = React.memo(({ children, onClick, className, variant = 'primary', disabled, size = 'md', style }) => {
  const variants = {
    primary: "bg-accent text-zinc-950 shadow-[0_0_20px_var(--accent-glow)]",
    secondary: "bg-white/5 text-inherit border border-white/10 hover:bg-white/10",
    danger: "bg-danger text-white shadow-[0_0_20px_rgba(248,113,113,0.3)]",
    ghost: "bg-transparent text-neutral-500 hover:text-white hover:bg-white/5",
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
        UI.BUTTON_BASE,
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
  <div className={cn("flex flex-col gap-2 w-full", className)}>
    {label && <span className={cn(UI.LABEL)}>{label}</span>}
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(UI.INPUT, !isDark && "bg-black/5 border-black/10 text-zinc-950 focus:bg-black/10")}
    />
  </div>
));

export const StaggeredItem = React.memo(({ children, index, className }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    className={cn("will-change-[transform,opacity]", className)}
  >
    {children}
  </motion.div>
));

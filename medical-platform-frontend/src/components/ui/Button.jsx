'use client'
export default function Button({ children, variant = 'primary', size = 'md', className = '', ...props }) {
  const variants = {
    primary:   'bg-blue-600 hover:bg-blue-500 text-white border-transparent shadow-[0_0_15px_rgba(37,99,235,0.2)]',
    secondary: 'bg-slate-800/50 hover:bg-slate-800 text-slate-200 border-slate-700/50',
    ghost:     'hover:bg-slate-800/50 text-slate-400 hover:text-slate-200 border-transparent',
    danger:    'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20',
    success:   'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20',
  }
  const sizes = {
    sm: 'h-7 px-3 text-[12px]',
    md: 'h-8 px-3 text-[13px]',
    lg: 'h-9 px-4 text-[13px]',
  }
  return (
    <button
      className={
        'inline-flex items-center justify-center gap-1.5 rounded-lg border font-medium transition-all duration-200 ease-out active:scale-95 active:brightness-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ' +
        (variants[variant] || variants.primary) + ' ' +
        (sizes[size] || sizes.md) + ' ' +
        className
      }
      {...props}
    >
      {children}
    </button>
  )
}
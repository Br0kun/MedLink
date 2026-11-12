export default function Badge({ children, variant = 'gray' }) {
  const variants = {
    gray:   'bg-slate-800/50 text-slate-300 border border-slate-700/50',
    blue:   'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    green:  'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    teal:   'bg-teal-500/10 text-teal-400 border border-teal-500/20',
    red:    'bg-red-500/10 text-red-400 border border-red-500/20',
    amber:  'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    purple: 'bg-violet-500/10 text-violet-400 border border-violet-500/20',
  }
  return (
    <span className={'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ' + (variants[variant] || variants.gray)}>
      {children}
    </span>
  )
}
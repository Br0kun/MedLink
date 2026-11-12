export default function StatCard({ label, value, trend, icon: Icon, color = 'blue' }) {
  const colors = {
    blue:   'bg-blue-500/10 text-blue-400 border-blue-500/20',
    green:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    purple: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    amber:  'bg-amber-500/10 text-amber-400 border-amber-500/20',
    teal:   'bg-teal-500/10 text-teal-400 border-teal-500/20',
  }
  return (
    <div className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.3)] hover:border-slate-700/50 active:scale-[0.98] active:brightness-95 transition-all duration-300 ease-out cursor-pointer group">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] text-slate-400 uppercase tracking-widest font-medium">{label}</p>
        {Icon && (
          <div className={'w-8 h-8 rounded-xl flex items-center justify-center border group-hover:scale-110 transition-transform duration-300 ' + (colors[color] || colors.blue)}>
            <Icon size={14} strokeWidth={1.5} />
          </div>
        )}
      </div>
      <p className="font-mono tabular-nums text-3xl font-medium text-slate-100 tracking-tight drop-shadow-sm">{value ?? '—'}</p>
      {trend && <p className="text-[11px] text-emerald-400 mt-2 font-medium">{trend}</p>}
    </div>
  )
}
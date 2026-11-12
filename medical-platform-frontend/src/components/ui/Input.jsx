export default function Input({ label, icon: Icon, className = '', ...props }) {
  return (
    <div className="w-full">
      {label && <label className="block text-[12px] font-medium text-slate-400 mb-1.5">{label}</label>}
      <div className="relative">
        {Icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
            <Icon size={14} strokeWidth={1.5} />
          </span>
        )}
        <input
          className={
            'w-full h-9 rounded-lg border border-slate-800/80 bg-slate-900/50 text-[13px] text-slate-200 placeholder:text-slate-600 ' +
            'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 focus:bg-slate-900 ' +
            'transition-all duration-200 ' +
            (Icon ? 'pl-9 pr-3 ' : 'px-3 ') +
            className
          }
          {...props}
        />
      </div>
    </div>
  )
}
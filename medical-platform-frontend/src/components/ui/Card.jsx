export default function Card({ children, className = '', interactive = false }) {
  return (
    <div className={
      'bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 ' +
      (interactive ? 'hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.3)] hover:border-slate-700/50 active:scale-[0.98] active:brightness-95 transition-all duration-300 ease-out cursor-pointer ' : '') +
      className
    }>
      {children}
    </div>
  )
}
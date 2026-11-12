'use client'

// ─── SIMPLE INHALE/EXHALE BREATHING GLOW ─────────────────────────────────────
// Clean, minimal background with a medical/clinical vibe:
//   • No grid lines, no floating particles, no sci-fi patterns.
//   • A single, soft emerald radial glow orb centered exactly in the middle.
//   • Animates smoothly to simulate a natural human breathing cycle (inhale/exhale).
// ─────────────────────────────────────────────────────────────────────────────

export default function MedicalBackground({ theme = 'dark' }) {
  const dark = theme !== 'light'
  
  // Clean clinical green colors
  const green = dark ? '16, 185, 129' : '5, 150, 105'

  return (
    <>
      {/* ── Single Ambient Breathing Glow Orb in the Center ── */}
      <div 
        aria-hidden 
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '75vw',
          height: '75vw',
          maxWidth: '900px',
          maxHeight: '900px',
          zIndex: -8,
          pointerEvents: 'none',
          background: `radial-gradient(circle, rgba(${green}, ${dark ? '0.11' : '0.20'}) 0%, rgba(${green}, 0) 70%)`,
          animation: 'inhaleExhale 7s ease-in-out infinite',
          filter: `blur(${dark ? '50px' : '35px'})`,
          mixBlendMode: dark ? 'normal' : 'multiply',
          willChange: 'opacity, transform',
        }} 
      />

      {/* ── CSS Keyframe for the slow clinical breathing glow ── */}
      <style>{`
        @keyframes inhaleExhale {
          0% {
            opacity: 0.15;
            transform: translate(-50%, -50%) scale(0.85);
          }
          45% {
            opacity: 1.0;
            transform: translate(-50%, -50%) scale(1.06);
          }
          55% {
            opacity: 1.0;
            transform: translate(-50%, -50%) scale(1.06);
          }
          100% {
            opacity: 0.15;
            transform: translate(-50%, -50%) scale(0.85);
          }
        }
      `}</style>
    </>
  )
}

// Elementos gráficos da identidade (SVG leve, sem imagens pesadas):
// raios de sol, estrela de brilho e traço com seta, como no logo e nas peças.

export function Sunburst({ className = '', rays = 9 }: { className?: string; rays?: number }) {
  const items = Array.from({ length: rays }, (_, i) => {
    const a0 = (-90 + (180 / rays) * i) * (Math.PI / 180)
    const a1 = (-90 + (180 / rays) * (i + 0.55)) * (Math.PI / 180)
    const r = 400
    return `M0,0 L${(Math.cos(a0) * r).toFixed(1)},${(Math.sin(a0) * r).toFixed(1)} L${(Math.cos(a1) * r).toFixed(1)},${(Math.sin(a1) * r).toFixed(1)} Z`
  })
  return (
    <svg className={`gfx-sunburst ${className}`} viewBox="0 -400 400 800" aria-hidden="true" focusable="false">
      {items.map((d, i) => <path key={i} d={d} />)}
    </svg>
  )
}

export function Spark({ className = '' }: { className?: string }) {
  return (
    <svg className={`gfx-spark ${className}`} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <path d="M50 0 L58 34 L86 14 L66 42 L100 50 L66 58 L86 86 L58 66 L50 100 L42 66 L14 86 L34 58 L0 50 L34 42 L14 14 L42 34 Z" />
    </svg>
  )
}

export function Swoosh({ className = '' }: { className?: string }) {
  return (
    <svg className={`gfx-swoosh ${className}`} viewBox="0 0 300 40" aria-hidden="true" focusable="false" preserveAspectRatio="none">
      <path d="M4 32 C 90 14, 190 8, 262 16" />
      <path d="M246 4 L 270 17 L 248 30" />
    </svg>
  )
}

export function Rays({ className = '' }: { className?: string }) {
  return (
    <svg className={`gfx-rays ${className}`} viewBox="0 0 60 60" aria-hidden="true" focusable="false">
      <path d="M8 34 L22 40" />
      <path d="M18 14 L28 30" />
      <path d="M38 6 L38 26" />
    </svg>
  )
}

import { useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import './App.css'

type DeckShape = 'rectangle' | 'l-left' | 'l-right'

type Material = {
  id: string
  name: string
  tone: string
  boardWidthMm: number
  boardLengthM: number
  gapMm: number
  priceSqm: number
  subframeSqm: number
  clipUnitPrice: number
  joistSpacingM: number
  boardColor: string
  accentColor: string
  edgeColor: string
}

type Point = {
  x: number
  y: number
}

type MeasurementLine = {
  id: number
  start: Point
  end: Point
}

const materials: Material[] = [
  {
    id: 'graphite',
    name: 'Nordik Graphite',
    tone: 'Charcoal composite',
    boardWidthMm: 138,
    boardLengthM: 4,
    gapMm: 6,
    priceSqm: 84,
    subframeSqm: 31,
    clipUnitPrice: 0.62,
    joistSpacingM: 0.4,
    boardColor: '#4f565d',
    accentColor: '#8e99a7',
    edgeColor: '#2f3439',
  },
  {
    id: 'sienna',
    name: 'Nordik Sienna',
    tone: 'Warm cedar composite',
    boardWidthMm: 145,
    boardLengthM: 4,
    gapMm: 5,
    priceSqm: 91,
    subframeSqm: 33,
    clipUnitPrice: 0.68,
    joistSpacingM: 0.38,
    boardColor: '#8b5a3c',
    accentColor: '#ca9574',
    edgeColor: '#5f3d28',
  },
  {
    id: 'linen',
    name: 'Nordik Linen',
    tone: 'Light sand composite',
    boardWidthMm: 146,
    boardLengthM: 3.6,
    gapMm: 6,
    priceSqm: 95,
    subframeSqm: 35,
    clipUnitPrice: 0.7,
    joistSpacingM: 0.38,
    boardColor: '#cbc3b5',
    accentColor: '#f4ecdf',
    edgeColor: '#9a8f82',
  },
]

const shapeLabels: Record<DeckShape, string> = {
  rectangle: 'Recto',
  'l-left': 'L izquierda',
  'l-right': 'L derecha',
}

const extrasPricing = {
  borderPerMeter: 16,
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatMeters(value: number) {
  return `${value.toFixed(2)} m`
}

function pointDistance(start: Point, end: Point) {
  return Math.hypot(end.x - start.x, end.y - start.y)
}

function topPolygonPoints(shape: DeckShape, width: number, depth: number, notchWidth: number, notchDepth: number) {
  if (shape === 'rectangle') {
    return [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width, y: depth },
      { x: 0, y: depth },
    ]
  }

  if (shape === 'l-left') {
    return [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width, y: depth },
      { x: notchWidth, y: depth },
      { x: notchWidth, y: notchDepth },
      { x: 0, y: notchDepth },
    ]
  }

  return [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: notchDepth },
    { x: width - notchWidth, y: notchDepth },
    { x: width - notchWidth, y: depth },
    { x: 0, y: depth },
  ]
}

function polygonToPath(points: Point[]) {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ') + ' Z'
}

function getBounds(points: Point[]) {
  return points.reduce(
    (acc, point) => ({
      minX: Math.min(acc.minX, point.x),
      maxX: Math.max(acc.maxX, point.x),
      minY: Math.min(acc.minY, point.y),
      maxY: Math.max(acc.maxY, point.y),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    },
  )
}

function App() {
  const [shape, setShape] = useState<DeckShape>('rectangle')
  const [materialId, setMaterialId] = useState('graphite')
  const [width, setWidth] = useState(5.8)
  const [depth, setDepth] = useState(3.6)
  const [notchWidth, setNotchWidth] = useState(2)
  const [notchDepth, setNotchDepth] = useState(1.7)
  const [measurementLines, setMeasurementLines] = useState<MeasurementLine[]>([])
  const [draftLineStart, setDraftLineStart] = useState<Point | null>(null)
  const [draftLineEnd, setDraftLineEnd] = useState<Point | null>(null)
  const [copied, setCopied] = useState(false)
  const svgRef = useRef<SVGSVGElement | null>(null)

  const material = materials.find((entry) => entry.id === materialId) ?? materials[0]
  const resolvedNotchWidth = clamp(notchWidth, 0.8, width - 0.8)
  const resolvedNotchDepth = clamp(notchDepth, 0.8, depth - 0.8)
  const cutoutArea = shape === 'rectangle' ? 0 : resolvedNotchWidth * resolvedNotchDepth
  const grossArea = width * depth
  const netArea = grossArea - cutoutArea
  const perimeter = shape === 'rectangle' ? 2 * (width + depth) : 2 * (width + depth)
  const wasteFactor = 1.08
  const boardLinearMeters = (netArea / (material.boardWidthMm / 1000)) * wasteFactor
  const boardUnits = Math.ceil(boardLinearMeters / material.boardLengthM)
  const joistLinearMeters = Math.ceil((netArea / material.joistSpacingM) * 1.08)
  const clipUnits = Math.ceil(netArea / ((material.boardWidthMm / 1000) * material.joistSpacingM))
  const boardCost = netArea * material.priceSqm
  const frameCost = netArea * material.subframeSqm
  const clipCost = clipUnits * material.clipUnitPrice
  const borderCost = perimeter * extrasPricing.borderPerMeter
  const totalCost = boardCost + frameCost + clipCost + borderCost

  const planGeometry = useMemo(() => {
    const points = topPolygonPoints(shape, width, depth, resolvedNotchWidth, resolvedNotchDepth)
    const bounds = getBounds(points)
    const padding = 1.1
    const viewBox = {
      x: bounds.minX - padding,
      y: bounds.minY - padding,
      width: bounds.maxX - bounds.minX + padding * 2,
      height: bounds.maxY - bounds.minY + padding * 2,
    }

    const boardGuideLines = Array.from({ length: Math.max(8, Math.ceil(width / 0.18)) }, (_, index) => {
      const x = (index + 1) * (width / (Math.max(8, Math.ceil(width / 0.18)) + 1))
      return {
        x1: x,
        y1: -0.4,
        x2: x,
        y2: depth + 0.4,
      }
    })

    return {
      points,
      path: polygonToPath(points),
      viewBox,
      boardGuideLines,
      bounds,
    }
  }, [depth, resolvedNotchDepth, resolvedNotchWidth, shape, width])

  function getSvgPoint(event: ReactPointerEvent<SVGSVGElement>) {
    const svg = svgRef.current
    if (!svg) {
      return null
    }

    const point = svg.createSVGPoint()
    point.x = event.clientX
    point.y = event.clientY
    const matrix = svg.getScreenCTM()

    if (!matrix) {
      return null
    }

    const transformedPoint = point.matrixTransform(matrix.inverse())
    return {
      x: transformedPoint.x,
      y: transformedPoint.y,
    }
  }

  function handleBoardPointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (!draftLineStart) {
      return
    }

    const point = getSvgPoint(event)
    if (!point) {
      return
    }

    setDraftLineEnd(point)
  }

  function handleBoardClick(event: ReactPointerEvent<SVGSVGElement>) {
    const point = getSvgPoint(event)
    if (!point) {
      return
    }

    if (!draftLineStart) {
      setDraftLineStart(point)
      setDraftLineEnd(point)
      return
    }

    setMeasurementLines((current) => [
      ...current,
      {
        id: Date.now(),
        start: draftLineStart,
        end: point,
      },
    ])
    setDraftLineStart(null)
    setDraftLineEnd(null)
  }

  async function handleCopySummary() {
    const lines = [
      'Nordik Configurator',
      `Forma: ${shapeLabels[shape]}`,
      `Medidas base: ${width.toFixed(2)}m x ${depth.toFixed(2)}m`,
      shape === 'rectangle'
        ? null
        : `Recorte: ${resolvedNotchWidth.toFixed(2)}m x ${resolvedNotchDepth.toFixed(2)}m`,
      `Material: ${material.name}`,
      `Superficie: ${netArea.toFixed(2)} m2`,
      `Perimetro: ${perimeter.toFixed(2)} m`,
      `Tablas: ${boardUnits} unidades`,
      `Joists: ${joistLinearMeters} lm`,
      `Clips: ${clipUnits}`,
      `Total estimado: ${formatCurrency(totalCost)}`,
    ].filter(Boolean)

    await navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  const liveLine =
    draftLineStart && draftLineEnd
      ? {
          start: draftLineStart,
          end: draftLineEnd,
        }
      : null

  return (
    <main className="internal-shell">
      <aside className="panel controls-panel">
        <div className="panel-heading">
          <span className="panel-label">Interno</span>
          <h1>Deck planner</h1>
        </div>

        <section className="section-block">
          <span className="field-label">Material</span>
          <div className="material-stack">
            {materials.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className={entry.id === materialId ? 'material-row active' : 'material-row'}
                onClick={() => setMaterialId(entry.id)}
              >
                <span
                  className="material-swatch"
                  style={{ background: `linear-gradient(135deg, ${entry.accentColor}, ${entry.boardColor})` }}
                />
                <span className="material-copy">
                  <strong>{entry.name}</strong>
                  <small>{entry.tone}</small>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="section-block">
          <span className="field-label">Forma</span>
          <div className="segmented">
            {Object.entries(shapeLabels).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={shape === value ? 'active' : ''}
                onClick={() => setShape(value as DeckShape)}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="section-block compact-grid">
          <label>
            <span className="field-label">Ancho</span>
            <input
              type="number"
              min="2.4"
              max="9.2"
              step="0.1"
              value={width}
              onChange={(event) => setWidth(Number(event.target.value))}
            />
          </label>
          <label>
            <span className="field-label">Profundidad</span>
            <input
              type="number"
              min="2"
              max="6.5"
              step="0.1"
              value={depth}
              onChange={(event) => setDepth(Number(event.target.value))}
            />
          </label>
          {shape !== 'rectangle' && (
            <>
              <label>
                <span className="field-label">Recorte ancho</span>
                <input
                  type="number"
                  min="0.8"
                  max={Math.max(1.2, width - 0.8)}
                  step="0.1"
                  value={resolvedNotchWidth}
                  onChange={(event) => setNotchWidth(Number(event.target.value))}
                />
              </label>
              <label>
                <span className="field-label">Recorte prof.</span>
                <input
                  type="number"
                  min="0.8"
                  max={Math.max(1.2, depth - 0.8)}
                  step="0.1"
                  value={resolvedNotchDepth}
                  onChange={(event) => setNotchDepth(Number(event.target.value))}
                />
              </label>
            </>
          )}
        </section>

        <section className="section-block">
          <span className="field-label">Medicion manual</span>
          <div className="action-row">
            <button type="button" className="secondary-action" onClick={() => setMeasurementLines([])}>
              Limpiar lineas
            </button>
            <button type="button" className="secondary-action" onClick={() => {
              setDraftLineStart(null)
              setDraftLineEnd(null)
            }}>
              Cancelar trazo
            </button>
          </div>
          <p className="helper-text">
            Hace click en un punto del plano y despues en otro para trazar una distancia.
          </p>
        </section>
      </aside>

      <section className="panel board-panel">
        <div className="panel-heading inline-heading">
          <div>
            <span className="panel-label">Plano</span>
            <h2>{material.name}</h2>
          </div>
          <div className="board-status">
            <span>{formatMeters(width)}</span>
            <span>{formatMeters(depth)}</span>
          </div>
        </div>

        <div className="plan-board">
          <svg
            ref={svgRef}
            className="plan-svg"
            viewBox={`${planGeometry.viewBox.x} ${planGeometry.viewBox.y} ${planGeometry.viewBox.width} ${planGeometry.viewBox.height}`}
            role="img"
            aria-label="Plano del deck"
            onPointerMove={handleBoardPointerMove}
            onClick={handleBoardClick}
          >
            <defs>
              <pattern id="board-pattern" width="0.22" height="0.22" patternUnits="userSpaceOnUse">
                <rect width="0.22" height="0.22" fill={material.boardColor} />
                <rect x="0.18" width="0.02" height="0.22" fill={material.edgeColor} opacity="0.45" />
              </pattern>
              <clipPath id="deck-mask">
                <path d={planGeometry.path} />
              </clipPath>
            </defs>

            <rect
              x={planGeometry.viewBox.x}
              y={planGeometry.viewBox.y}
              width={planGeometry.viewBox.width}
              height={planGeometry.viewBox.height}
              className="grid-backdrop"
            />

            <path d={planGeometry.path} fill="url(#board-pattern)" stroke={material.accentColor} strokeWidth="0.06" />

            <g clipPath="url(#deck-mask)" opacity="0.52">
              {planGeometry.boardGuideLines.map((line, index) => (
                <line
                  key={index}
                  x1={line.x1}
                  y1={line.y1}
                  x2={line.x2}
                  y2={line.y2}
                  stroke="rgba(255,255,255,0.18)"
                  strokeWidth="0.03"
                />
              ))}
            </g>

            <g className="dimension-line">
              <line x1={0} y1={-0.55} x2={width} y2={-0.55} />
              <line x1={0} y1={-0.35} x2={0} y2={0} />
              <line x1={width} y1={-0.35} x2={width} y2={0} />
              <text x={width / 2} y={-0.7} textAnchor="middle">
                {formatMeters(width)}
              </text>
            </g>

            <g className="dimension-line">
              <line x1={width + 0.55} y1={0} x2={width + 0.55} y2={depth} />
              <line x1={width} y1={0} x2={width + 0.35} y2={0} />
              <line x1={width} y1={depth} x2={width + 0.35} y2={depth} />
              <text x={width + 0.72} y={depth / 2} textAnchor="middle" transform={`rotate(90 ${width + 0.72} ${depth / 2})`}>
                {formatMeters(depth)}
              </text>
            </g>

            {measurementLines.map((line) => {
              const midX = (line.start.x + line.end.x) / 2
              const midY = (line.start.y + line.end.y) / 2
              return (
                <g key={line.id} className="measurement-group">
                  <line x1={line.start.x} y1={line.start.y} x2={line.end.x} y2={line.end.y} className="measurement-segment" />
                  <circle cx={line.start.x} cy={line.start.y} r="0.08" className="measurement-node" />
                  <circle cx={line.end.x} cy={line.end.y} r="0.08" className="measurement-node" />
                  <text x={midX} y={midY - 0.12} textAnchor="middle" className="measurement-label">
                    {formatMeters(pointDistance(line.start, line.end))}
                  </text>
                </g>
              )
            })}

            {liveLine && (
              <g className="measurement-group draft">
                <line x1={liveLine.start.x} y1={liveLine.start.y} x2={liveLine.end.x} y2={liveLine.end.y} className="measurement-segment" />
                <circle cx={liveLine.start.x} cy={liveLine.start.y} r="0.08" className="measurement-node" />
                <circle cx={liveLine.end.x} cy={liveLine.end.y} r="0.08" className="measurement-node" />
                <text
                  x={(liveLine.start.x + liveLine.end.x) / 2}
                  y={(liveLine.start.y + liveLine.end.y) / 2 - 0.12}
                  textAnchor="middle"
                  className="measurement-label"
                >
                  {formatMeters(pointDistance(liveLine.start, liveLine.end))}
                </text>
              </g>
            )}
          </svg>
        </div>

        <div className="measurement-strip">
          {measurementLines.length === 0 ? (
            <span>Sin lineas medidas</span>
          ) : (
            measurementLines.map((line, index) => (
              <span key={line.id}>
                L{index + 1}: {formatMeters(pointDistance(line.start, line.end))}
              </span>
            ))
          )}
        </div>
      </section>

      <aside className="panel result-panel">
        <div className="panel-heading">
          <span className="panel-label">Resultado final</span>
          <h2>Resumen</h2>
        </div>

        <div className="result-stack">
          <article className="result-card total-card">
            <span>Total estimado</span>
            <strong>{formatCurrency(totalCost)}</strong>
          </article>

          <article className="result-card">
            <span>Superficie util</span>
            <strong>{netArea.toFixed(2)} m2</strong>
          </article>

          <article className="result-card">
            <span>Perimetro</span>
            <strong>{perimeter.toFixed(2)} m</strong>
          </article>

          <article className="result-card">
            <span>Tablas</span>
            <strong>{boardUnits} un.</strong>
            <small>{boardLinearMeters.toFixed(1)} lm</small>
          </article>

          <article className="result-card">
            <span>Joists</span>
            <strong>{joistLinearMeters} lm</strong>
          </article>

          <article className="result-card">
            <span>Clips</span>
            <strong>{clipUnits}</strong>
          </article>
        </div>

        <div className="cost-breakdown">
          <div className="cost-row">
            <span>Decking</span>
            <strong>{formatCurrency(boardCost)}</strong>
          </div>
          <div className="cost-row">
            <span>Subestructura</span>
            <strong>{formatCurrency(frameCost)}</strong>
          </div>
          <div className="cost-row">
            <span>Clips</span>
            <strong>{formatCurrency(clipCost)}</strong>
          </div>
          <div className="cost-row">
            <span>Terminacion borde</span>
            <strong>{formatCurrency(borderCost)}</strong>
          </div>
        </div>

        <button type="button" className="primary-action" onClick={handleCopySummary}>
          {copied ? 'Resumen copiado' : 'Copiar resultado'}
        </button>
      </aside>
    </main>
  )
}

export default App

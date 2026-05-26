import { useState } from 'react'
import './App.css'

type DeckShape = 'rectangle' | 'l-left' | 'l-right'
type BoardPattern = 'straight' | 'diagonal' | 'chevron'

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
    accentColor: '#9ca7b5',
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
    accentColor: '#d4a17f',
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
    boardColor: '#cac1b2',
    accentColor: '#f2ebdd',
    edgeColor: '#998d7e',
  },
]

const shapeLabels: Record<DeckShape, string> = {
  rectangle: 'Rectangular',
  'l-left': 'L shape left',
  'l-right': 'L shape right',
}

const patternLabels: Record<BoardPattern, string> = {
  straight: 'Straight laid',
  diagonal: 'Diagonal',
  chevron: 'Chevron',
}

const extrasPricing = {
  lightingPerStep: 86,
  skirtingPerMeter: 16,
  stairFlight: 620,
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

function isoProject([x, y]: [number, number]) {
  const isoX = (x - y) * 62
  const isoY = (x + y) * 30
  return [isoX, isoY] as const
}

function topPolygonPoints(shape: DeckShape, width: number, depth: number, notchWidth: number, notchDepth: number) {
  if (shape === 'rectangle') {
    return [
      [0, 0],
      [width, 0],
      [width, depth],
      [0, depth],
    ] as Array<[number, number]>
  }

  if (shape === 'l-left') {
    return [
      [0, 0],
      [width, 0],
      [width, depth],
      [notchWidth, depth],
      [notchWidth, notchDepth],
      [0, notchDepth],
    ] as Array<[number, number]>
  }

  return [
    [0, 0],
    [width, 0],
    [width, notchDepth],
    [width - notchWidth, notchDepth],
    [width - notchWidth, depth],
    [0, depth],
  ] as Array<[number, number]>
}

function polygonToPath(points: Array<[number, number]>) {
  return points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${x},${y}`).join(' ') + ' Z'
}

function App() {
  const [shape, setShape] = useState<DeckShape>('rectangle')
  const [pattern, setPattern] = useState<BoardPattern>('straight')
  const [materialId, setMaterialId] = useState('graphite')
  const [width, setWidth] = useState(5.8)
  const [depth, setDepth] = useState(3.6)
  const [notchWidth, setNotchWidth] = useState(2)
  const [notchDepth, setNotchDepth] = useState(1.7)
  const [steps, setSteps] = useState(1)
  const [lighting, setLighting] = useState(true)
  const [skirting, setSkirting] = useState(true)
  const [stairs, setStairs] = useState(false)
  const [copied, setCopied] = useState(false)

  const material = materials.find((entry) => entry.id === materialId) ?? materials[0]
  const resolvedNotchWidth = clamp(notchWidth, 0.8, width - 0.8)
  const resolvedNotchDepth = clamp(notchDepth, 0.8, depth - 0.8)
  const cutoutArea = shape === 'rectangle' ? 0 : resolvedNotchWidth * resolvedNotchDepth
  const grossArea = width * depth
  const netArea = grossArea - cutoutArea

  const perimeter =
    shape === 'rectangle'
      ? 2 * (width + depth)
      : 2 * (width + depth)

  const wasteFactor =
    pattern === 'straight' ? 1.08 : pattern === 'diagonal' ? 1.14 : 1.17
  const boardCoverWidthM = (material.boardWidthMm + material.gapMm) / 1000
  const boardLinearMeters = (netArea / (material.boardWidthMm / 1000)) * wasteFactor
  const boardUnits = Math.ceil(boardLinearMeters / material.boardLengthM)
  const joistLinearMeters = Math.ceil((netArea / material.joistSpacingM) * 1.08)
  const clipUnits = Math.ceil(netArea / ((material.boardWidthMm / 1000) * material.joistSpacingM))

  const boardCost = netArea * material.priceSqm
  const frameCost = netArea * material.subframeSqm
  const clipCost = clipUnits * material.clipUnitPrice
  const skirtingCost = skirting ? perimeter * extrasPricing.skirtingPerMeter : 0
  const lightingCost = lighting ? steps * extrasPricing.lightingPerStep : 0
  const stairCost = stairs ? extrasPricing.stairFlight : 0
  const totalCost = boardCost + frameCost + clipCost + skirtingCost + lightingCost + stairCost

  const topPoints = topPolygonPoints(shape, width, depth, resolvedNotchWidth, resolvedNotchDepth)
  const projectedTop = topPoints.map(isoProject)
  const minX = Math.min(...projectedTop.map(([x]) => x))
  const maxX = Math.max(...projectedTop.map(([x]) => x))
  const minY = Math.min(...projectedTop.map(([, y]) => y))
  const maxY = Math.max(...projectedTop.map(([, y]) => y))
  const heightOffset = 42
  const normalizedTop = projectedTop.map(([x, y]) => [x - minX + 60, y - minY + 50] as [number, number])
  const loweredTop = normalizedTop.map(([x, y]) => [x, y + heightOffset] as [number, number])

  const topFacePath = polygonToPath(normalizedTop)
  const frontFacePath = polygonToPath([
    normalizedTop[projectedTop.length - 1],
    normalizedTop[projectedTop.length - 2],
    loweredTop[projectedTop.length - 2],
    loweredTop[projectedTop.length - 1],
  ])
  const sideFacePath = polygonToPath([
    normalizedTop[1],
    normalizedTop[2],
    loweredTop[2],
    loweredTop[1],
  ])

  const boardGuideLines = Array.from({ length: Math.max(8, Math.floor(netArea * 1.2)) }, (_, index) => {
    const progress = index / Math.max(1, Math.floor(netArea * 1.2))
    const widthSpan = maxX - minX + 80
    const left = 15 + progress * widthSpan

    if (pattern === 'straight') {
      return {
        x1: left,
        y1: 32,
        x2: left - 82,
        y2: maxY - minY + 124,
      }
    }

    if (pattern === 'diagonal') {
      return {
        x1: left - 20,
        y1: 20,
        x2: left + 64,
        y2: maxY - minY + 128,
      }
    }

    const offset = index % 2 === 0 ? -28 : 28
    return {
      x1: left + offset,
      y1: 18,
      x2: left - offset,
      y2: maxY - minY + 132,
    }
  })

  async function handleCopySummary() {
    const lines = [
      `Nordik Configurator`,
      `Shape: ${shapeLabels[shape]}`,
      `Dimensions: ${width.toFixed(1)}m x ${depth.toFixed(1)}m`,
      shape === 'rectangle'
        ? null
        : `Cutout: ${resolvedNotchWidth.toFixed(1)}m x ${resolvedNotchDepth.toFixed(1)}m`,
      `Material: ${material.name}`,
      `Pattern: ${patternLabels[pattern]}`,
      `Deck area: ${netArea.toFixed(1)} sqm`,
      `Boards: ${boardUnits} units (${material.boardLengthM}m)`,
      `Joists: ${joistLinearMeters} lm`,
      `Clips: ${clipUnits}`,
      `Estimated total: ${formatCurrency(totalCost)}`,
    ].filter(Boolean)

    await navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Nordik exterior systems</p>
          <h1>Deck configurator MVP with live geometry, quantities and estimate.</h1>
          <p className="hero-text">
            This prototype reproduces the core planner flow: define layout,
            choose finish, inspect the deck visually and obtain a buildable
            summary in real time.
          </p>
        </div>

        <div className="hero-stats">
          <article>
            <span>Area</span>
            <strong>{netArea.toFixed(1)} sqm</strong>
          </article>
          <article>
            <span>Boards</span>
            <strong>{boardUnits}</strong>
          </article>
          <article>
            <span>Estimate</span>
            <strong>{formatCurrency(totalCost)}</strong>
          </article>
        </div>
      </section>

      <section className="workspace">
        <aside className="controls-panel">
          <div className="panel-header">
            <p className="section-kicker">Configuration</p>
            <h2>Build the deck</h2>
          </div>

          <div className="control-group">
            <label>Shape</label>
            <div className="segmented">
              {Object.entries(shapeLabels).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={value === shape ? 'active' : ''}
                  onClick={() => setShape(value as DeckShape)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="two-col-grid">
            <label>
              Width
              <input
                type="range"
                min="2.4"
                max="9.2"
                step="0.1"
                value={width}
                onChange={(event) => setWidth(Number(event.target.value))}
              />
              <span>{width.toFixed(1)} m</span>
            </label>
            <label>
              Depth
              <input
                type="range"
                min="2"
                max="6.5"
                step="0.1"
                value={depth}
                onChange={(event) => setDepth(Number(event.target.value))}
              />
              <span>{depth.toFixed(1)} m</span>
            </label>
          </div>

          {shape !== 'rectangle' && (
            <div className="two-col-grid">
              <label>
                Cutout width
                <input
                  type="range"
                  min="0.8"
                  max={Math.max(1.2, width - 0.8)}
                  step="0.1"
                  value={resolvedNotchWidth}
                  onChange={(event) => setNotchWidth(Number(event.target.value))}
                />
                <span>{resolvedNotchWidth.toFixed(1)} m</span>
              </label>
              <label>
                Cutout depth
                <input
                  type="range"
                  min="0.8"
                  max={Math.max(1.2, depth - 0.8)}
                  step="0.1"
                  value={resolvedNotchDepth}
                  onChange={(event) => setNotchDepth(Number(event.target.value))}
                />
                <span>{resolvedNotchDepth.toFixed(1)} m</span>
              </label>
            </div>
          )}

          <div className="control-group">
            <label>Material</label>
            <div className="material-list">
              {materials.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className={entry.id === materialId ? 'material-card active' : 'material-card'}
                  onClick={() => setMaterialId(entry.id)}
                >
                  <span
                    className="swatch"
                    style={{ background: `linear-gradient(135deg, ${entry.accentColor}, ${entry.boardColor})` }}
                  />
                  <strong>{entry.name}</strong>
                  <small>{entry.tone}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="control-group">
            <label>Board pattern</label>
            <div className="segmented">
              {Object.entries(patternLabels).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={value === pattern ? 'active' : ''}
                  onClick={() => setPattern(value as BoardPattern)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="control-group">
            <label>Accessories</label>
            <div className="toggle-list">
              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={lighting}
                  onChange={(event) => setLighting(event.target.checked)}
                />
                <span>Step lighting</span>
              </label>
              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={skirting}
                  onChange={(event) => setSkirting(event.target.checked)}
                />
                <span>Perimeter skirting</span>
              </label>
              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={stairs}
                  onChange={(event) => setStairs(event.target.checked)}
                />
                <span>Single stair flight</span>
              </label>
            </div>
          </div>

          <label className="stepper">
            Entry steps
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={steps}
              onChange={(event) => setSteps(Number(event.target.value))}
            />
            <span>{steps} step(s)</span>
          </label>
        </aside>

        <section className="preview-panel">
          <div className="panel-header">
            <p className="section-kicker">Preview</p>
            <h2>{material.name}</h2>
          </div>

          <div className="visual-stage">
            <div className="stage-glow" />
            <svg
              className="deck-svg"
              viewBox={`0 0 ${Math.max(420, maxX - minX + 180)} ${Math.max(320, maxY - minY + 210)}`}
              role="img"
              aria-label="Isometric deck preview"
            >
              <defs>
                <linearGradient id="top-face" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={material.accentColor} />
                  <stop offset="100%" stopColor={material.boardColor} />
                </linearGradient>
                <linearGradient id="front-face" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={material.boardColor} />
                  <stop offset="100%" stopColor={material.edgeColor} />
                </linearGradient>
              </defs>

              <path d={frontFacePath} fill="url(#front-face)" opacity="0.92" />
              <path d={sideFacePath} fill={material.edgeColor} opacity="0.96" />
              <path d={topFacePath} fill="url(#top-face)" stroke="rgba(255,255,255,0.25)" strokeWidth="2" />

              <clipPath id="deck-clip">
                <path d={topFacePath} />
              </clipPath>

              <g clipPath="url(#deck-clip)" opacity="0.72">
                {boardGuideLines.map((line, index) => (
                  <line
                    key={`${pattern}-${index}`}
                    {...line}
                    stroke={index % 4 === 0 ? 'rgba(255,255,255,0.32)' : 'rgba(26,26,26,0.22)'}
                    strokeWidth={index % 5 === 0 ? 4 : 2}
                    strokeLinecap="round"
                  />
                ))}
              </g>

              {lighting &&
                Array.from({ length: steps }, (_, index) => (
                  <circle
                    key={index}
                    cx={92 + index * 26}
                    cy={maxY - minY + 150}
                    r="6"
                    fill="#ffcf70"
                    opacity="0.9"
                  />
                ))}
            </svg>
          </div>

          <div className="summary-grid">
            <article>
              <span>Layout</span>
              <strong>{shapeLabels[shape]}</strong>
              <small>
                {width.toFixed(1)}m x {depth.toFixed(1)}m
              </small>
            </article>
            <article>
              <span>Pattern</span>
              <strong>{patternLabels[pattern]}</strong>
              <small>Waste factor {Math.round((wasteFactor - 1) * 100)}%</small>
            </article>
            <article>
              <span>Coverage</span>
              <strong>{boardCoverWidthM.toFixed(3)} m</strong>
              <small>Board + gap module</small>
            </article>
            <article>
              <span>Perimeter</span>
              <strong>{perimeter.toFixed(1)} lm</strong>
              <small>For trims and skirting</small>
            </article>
          </div>
        </section>

        <aside className="estimate-panel">
          <div className="panel-header">
            <p className="section-kicker">Takeoff</p>
            <h2>Quantity + price</h2>
          </div>

          <div className="estimate-card">
            <div className="metric-row">
              <span>Deck area</span>
              <strong>{netArea.toFixed(1)} sqm</strong>
            </div>
            <div className="metric-row">
              <span>Boards</span>
              <strong>{boardUnits} units</strong>
            </div>
            <div className="metric-row">
              <span>Board linear meters</span>
              <strong>{boardLinearMeters.toFixed(1)} lm</strong>
            </div>
            <div className="metric-row">
              <span>Joists</span>
              <strong>{joistLinearMeters} lm</strong>
            </div>
            <div className="metric-row">
              <span>Hidden clips</span>
              <strong>{clipUnits}</strong>
            </div>
          </div>

          <div className="estimate-card cost-card">
            <div className="metric-row">
              <span>Boards</span>
              <strong>{formatCurrency(boardCost)}</strong>
            </div>
            <div className="metric-row">
              <span>Subframe</span>
              <strong>{formatCurrency(frameCost)}</strong>
            </div>
            <div className="metric-row">
              <span>Clips</span>
              <strong>{formatCurrency(clipCost)}</strong>
            </div>
            <div className="metric-row">
              <span>Skirting</span>
              <strong>{formatCurrency(skirtingCost)}</strong>
            </div>
            <div className="metric-row">
              <span>Lighting</span>
              <strong>{formatCurrency(lightingCost)}</strong>
            </div>
            <div className="metric-row">
              <span>Stairs</span>
              <strong>{formatCurrency(stairCost)}</strong>
            </div>
            <div className="metric-row total">
              <span>Total estimate</span>
              <strong>{formatCurrency(totalCost)}</strong>
            </div>
          </div>

          <button type="button" className="primary-action" onClick={handleCopySummary}>
            {copied ? 'Summary copied' : 'Copy quote summary'}
          </button>
        </aside>
      </section>
    </main>
  )
}

export default App

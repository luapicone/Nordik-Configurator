import { useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import './App.css'

type Material = {
  id: string
  name: string
  tone: string
  boardColor: string
  accentColor: string
  edgeColor: string
}

type Point = {
  x: number
  y: number
}

const VIEWBOX = {
  x: 0,
  y: 0,
  width: 100,
  height: 70,
}

const materials: Material[] = [
  {
    id: 'graphite',
    name: 'Nordik Graphite',
    tone: 'Charcoal composite',
    boardColor: '#4f565d',
    accentColor: '#8e99a7',
    edgeColor: '#2f3439',
  },
  {
    id: 'sienna',
    name: 'Nordik Sienna',
    tone: 'Warm cedar composite',
    boardColor: '#8b5a3c',
    accentColor: '#ca9574',
    edgeColor: '#5f3d28',
  },
  {
    id: 'linen',
    name: 'Nordik Linen',
    tone: 'Light sand composite',
    boardColor: '#cbc3b5',
    accentColor: '#f4ecdf',
    edgeColor: '#9a8f82',
  },
]

function pointDistance(start: Point, end: Point) {
  return Math.hypot(end.x - start.x, end.y - start.y)
}

function formatMeters(value: number) {
  return `${value.toFixed(2)} m`
}

function polygonPath(points: Point[]) {
  if (points.length === 0) {
    return ''
  }

  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ') + ' Z'
}

function polylinePath(points: Point[]) {
  if (points.length === 0) {
    return ''
  }

  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
}

function App() {
  const [outlinePoints, setOutlinePoints] = useState<Point[]>([])
  const [isClosed, setIsClosed] = useState(false)
  const [pointerPoint, setPointerPoint] = useState<Point | null>(null)
  const [materialId, setMaterialId] = useState<string | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)

  const material = materials.find((entry) => entry.id === materialId) ?? null

  const edgeLabels = useMemo(() => {
    if (outlinePoints.length < 2) {
      return []
    }

    const labels = outlinePoints.slice(1).map((point, index) => {
      const start = outlinePoints[index]
      const end = point
      return {
        id: `${index}-${index + 1}`,
        value: pointDistance(start, end),
        x: (start.x + end.x) / 2,
        y: (start.y + end.y) / 2,
      }
    })

    if (isClosed && outlinePoints.length >= 3) {
      const start = outlinePoints[outlinePoints.length - 1]
      const end = outlinePoints[0]
      labels.push({
        id: 'closing-edge',
        value: pointDistance(start, end),
        x: (start.x + end.x) / 2,
        y: (start.y + end.y) / 2,
      })
    }

    return labels
  }, [isClosed, outlinePoints])

  const livePath = useMemo(() => {
    if (outlinePoints.length === 0) {
      return ''
    }

    const draftPoints = pointerPoint && !isClosed ? [...outlinePoints, pointerPoint] : outlinePoints
    return polylinePath(draftPoints)
  }, [isClosed, outlinePoints, pointerPoint])

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

    const transformed = point.matrixTransform(matrix.inverse())

    return {
      x: Number(transformed.x.toFixed(2)),
      y: Number(transformed.y.toFixed(2)),
    }
  }

  function handleBoardMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (isClosed || outlinePoints.length === 0) {
      return
    }

    const point = getSvgPoint(event)
    if (!point) {
      return
    }

    setPointerPoint(point)
  }

  function handleBoardClick(event: ReactPointerEvent<SVGSVGElement>) {
    if (isClosed) {
      return
    }

    const point = getSvgPoint(event)
    if (!point) {
      return
    }

    setOutlinePoints((current) => [...current, point])
  }

  function handleUndoPoint() {
    setOutlinePoints((current) => current.slice(0, -1))
  }

  function handleResetShape() {
    setOutlinePoints([])
    setPointerPoint(null)
    setIsClosed(false)
    setMaterialId(null)
  }

  function handleCloseShape() {
    if (outlinePoints.length < 3) {
      return
    }

    setIsClosed(true)
    setPointerPoint(null)
  }

  return (
    <main className="internal-shell">
      <aside className="panel controls-panel">
        <div className="panel-heading">
          <span className="panel-label">Interno</span>
          <h1>Deck planner</h1>
        </div>

        <section className="section-block">
          <span className="field-label">Flujo</span>
          <div className="status-card">
            {!isClosed ? (
              <>
                <strong>1. Trazá la forma</strong>
                <p>Hacé click en el plano para marcar cada vértice. Cuando termines, cerrá la forma.</p>
              </>
            ) : material ? (
              <>
                <strong>Forma cerrada + material aplicado</strong>
                <p>Ya se está mostrando el deck con el material seleccionado.</p>
              </>
            ) : (
              <>
                <strong>2. Elegí el material</strong>
                <p>La forma ya está definida. Seleccioná un material para ver el deck terminado.</p>
              </>
            )}
          </div>
        </section>

        <section className="section-block">
          <span className="field-label">Acciones</span>
          <div className="action-stack">
            <button type="button" className="secondary-action" onClick={handleUndoPoint} disabled={outlinePoints.length === 0 || isClosed}>
              Borrar último punto
            </button>
            <button type="button" className="secondary-action" onClick={handleCloseShape} disabled={outlinePoints.length < 3 || isClosed}>
              Cerrar forma
            </button>
            <button type="button" className="secondary-action" onClick={handleResetShape}>
              Reiniciar
            </button>
          </div>
        </section>

        <section className="section-block">
          <span className="field-label">Material</span>
          <div className="material-stack">
            {materials.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className={entry.id === materialId ? 'material-row active' : 'material-row'}
                disabled={!isClosed}
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
      </aside>

      <section className="panel board-panel">
        <div className="panel-heading inline-heading">
          <div>
            <span className="panel-label">Plano</span>
            <h2>{material ? material.name : 'Sin material aplicado'}</h2>
          </div>
          <div className="board-status">
            <span>{outlinePoints.length} puntos</span>
            <span>{isClosed ? 'forma cerrada' : 'forma abierta'}</span>
          </div>
        </div>

        <div className="plan-board">
          <svg
            ref={svgRef}
            className="plan-svg"
            viewBox={`${VIEWBOX.x} ${VIEWBOX.y} ${VIEWBOX.width} ${VIEWBOX.height}`}
            role="img"
            aria-label="Plano del deck"
            onPointerMove={handleBoardMove}
            onClick={handleBoardClick}
          >
            <defs>
              <pattern id="empty-grid" width="4" height="4" patternUnits="userSpaceOnUse">
                <path d="M 4 0 L 0 0 0 4" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.2" />
              </pattern>
              {material && (
                <pattern id="board-pattern" width="3.4" height="3.4" patternUnits="userSpaceOnUse">
                  <rect width="3.4" height="3.4" fill={material.boardColor} />
                  <rect x="2.7" width="0.34" height="3.4" fill={material.edgeColor} opacity="0.48" />
                </pattern>
              )}
            </defs>

            <rect x={0} y={0} width={VIEWBOX.width} height={VIEWBOX.height} fill="url(#empty-grid)" />

            {isClosed && outlinePoints.length >= 3 && (
              <path
                d={polygonPath(outlinePoints)}
                fill={material ? 'url(#board-pattern)' : 'rgba(255,255,255,0.04)'}
                stroke={material ? material.accentColor : 'rgba(255,255,255,0.52)'}
                strokeWidth="0.45"
              />
            )}

            {outlinePoints.length > 0 && !isClosed && (
              <path d={livePath} fill="none" stroke="#ffcf70" strokeWidth="0.45" strokeDasharray="1.6 1.1" />
            )}

            {outlinePoints.map((point, index) => (
              <g key={`${point.x}-${point.y}-${index}`}>
                <circle cx={point.x} cy={point.y} r="0.8" className="outline-node" />
                <text x={point.x + 1.4} y={point.y - 1.2} className="node-label">
                  P{index + 1}
                </text>
              </g>
            ))}

            {edgeLabels.map((edge) => (
              <text key={edge.id} x={edge.x} y={edge.y - 1.1} textAnchor="middle" className="measurement-label">
                {formatMeters(edge.value)}
              </text>
            ))}
          </svg>
        </div>
      </section>
    </main>
  )
}

export default App

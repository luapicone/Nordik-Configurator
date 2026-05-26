# Nordik Configurator

MVP web configurator for composite decks, built in React + Vite.

## Included in this version

- Live deck configuration by shape:
  - rectangular
  - L left
  - L right
- Parametric dimensions with cutout controls for L layouts
- Material presets with different board widths, colors and pricing
- Board pattern selection:
  - straight
  - diagonal
  - chevron
- Isometric visual preview
- Automatic takeoff:
  - deck area
  - board units
  - board linear meters
  - joist linear meters
  - hidden clips
- Live price estimate with accessories:
  - skirting
  - lighting
  - stairs
- Quote summary copy action

## Scope note

This is a serious functional MVP, not yet a full commercial-grade planner like a mature proprietary configurator.

What is still missing for a full product:

- true 3D camera controls
- exact CAD-grade geometry rules
- product catalog from backend
- persistent projects and user accounts
- PDF proposal generation
- CRM / ecommerce integration
- exact structural engineering validation

## Development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

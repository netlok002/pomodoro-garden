// Geometry for the round picker wheels, drawn in a 200x200 SVG.
// Angles are in degrees, clockwise from 12 o'clock.

export const WHEEL_CENTER = 100
export const WHEEL_RADIUS = 90

export function pointOnCircle(angleDeg: number, radius: number) {
  const angleRad = (Math.PI / 180) * angleDeg
  return {
    x: WHEEL_CENTER + radius * Math.sin(angleRad),
    y: WHEEL_CENTER - radius * Math.cos(angleRad),
  }
}

export function wedgePath(startAngle: number, endAngle: number, innerRadius = 0): string {
  const outerStart = pointOnCircle(startAngle, WHEEL_RADIUS)
  const outerEnd = pointOnCircle(endAngle, WHEEL_RADIUS)
  if (innerRadius === 0) {
    return `M ${WHEEL_CENTER},${WHEEL_CENTER} L ${outerStart.x},${outerStart.y} A ${WHEEL_RADIUS},${WHEEL_RADIUS} 0 0,1 ${outerEnd.x},${outerEnd.y} Z`
  }
  // A ring slice, leaving a hole in the middle for a centre button.
  const innerStart = pointOnCircle(startAngle, innerRadius)
  const innerEnd = pointOnCircle(endAngle, innerRadius)
  return `M ${innerStart.x},${innerStart.y} L ${outerStart.x},${outerStart.y} A ${WHEEL_RADIUS},${WHEEL_RADIUS} 0 0,1 ${outerEnd.x},${outerEnd.y} L ${innerEnd.x},${innerEnd.y} A ${innerRadius},${innerRadius} 0 0,0 ${innerStart.x},${innerStart.y} Z`
}

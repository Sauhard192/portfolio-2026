// Increase these values for a stronger bulge. Zero restores a flat grid.
export const GRID_LENS_STRENGTH = { 
  desktop: 0.04, 
  tablet: 0.05, 
  mobile: 0.03 
}

export function gridLensStrength(width: number) {
  return width <= 640 ? GRID_LENS_STRENGTH.mobile
    : width <= 1024 ? GRID_LENS_STRENGTH.tablet : GRID_LENS_STRENGTH.desktop
}

// Must match the shader's screen-to-source mapping, including edge refraction.
export function gridLensSourcePoint(x: number, y: number, width: number, height: number) {
  const edge = width <= 600 ? 100 : 80
  const distance = Math.min(y, height - y)
  const t = Math.max(0, Math.min(1, distance / edge))
  const edgeStrength = 1 - t * t * (3 - 2 * t)
  const direction = y < height / 2 ? 1 : -1
  x += (x / width - 0.5) * 5 * edgeStrength
  y += direction * 20 * edgeStrength ** 4
  const nx = x / width * 2 - 1
  const ny = y / height * 2 - 1
  const factor = 1 + gridLensStrength(width) * (nx * nx + ny * ny)
  return { x: (nx * factor + 1) * width / 2, y: (ny * factor + 1) * height / 2 }
}

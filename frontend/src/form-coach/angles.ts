export interface Point2D {
  x: number;
  y: number;
}

/** Interior angle ABC, in degrees [0, 180]. Null means no usable measurement. */
export function jointAngle(
  a?: Point2D | null,
  b?: Point2D | null,
  c?: Point2D | null,
): number | null {
  if (!a || !b || !c || ![a.x, a.y, b.x, b.y, c.x, c.y].every(Number.isFinite))
    return null;
  const ux = a.x - b.x,
    uy = a.y - b.y;
  const vx = c.x - b.x,
    vy = c.y - b.y;
  const un = Math.hypot(ux, uy),
    vn = Math.hypot(vx, vy);
  if (!Number.isFinite(un) || !Number.isFinite(vn) || un < 1e-10 || vn < 1e-10)
    return null;
  const cosine = (ux / un) * (vx / vn) + (uy / un) * (vy / vn);
  const angle = (Math.acos(Math.max(-1, Math.min(1, cosine))) * 180) / Math.PI;
  return Number.isFinite(angle) ? angle : null;
}

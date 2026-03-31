import { Vector2 } from './Vector2.js';

export const GRAVITY = 260; // stronger gravity, maxSpeed cap prevents runaway speed

export function integrate(position, velocity, dt) {
  return position.add(velocity.scale(dt));
}

export function applyGravity(velocity, dt) {
  return new Vector2(velocity.x, velocity.y + GRAVITY * dt);
}

export function clampSpeed(velocity, maxSpeed) {
  const spd = velocity.magnitude;
  return spd > maxSpeed ? velocity.scale(maxSpeed / spd) : velocity;
}

const MIN_BOUNCE_SPEED = 160; // minimum outward speed — prevents floor-skimming
// Minimum upward speed specifically on floor contact, derived from gravity
// so balls always arc back to a visible height regardless of incoming speed.
const MIN_FLOOR_BOUNCE    = 200; // px/s upward after floor contact
const MIN_BALL_SEPARATION =  80; // minimum separation speed after ball-ball collision

export function bounceOffWalls(body, arena, restitution = 1.0) {
  const { radius } = body;
  const minX = arena.x + radius, maxX = arena.x + arena.width  - radius;
  const minY = arena.y + radius, maxY = arena.y + arena.height - radius;

  let { x, y }         = body.position;
  let { x: vx, y: vy } = body.velocity;

  let bounced = false;
  if (x < minX) { x = minX; vx =  Math.max(Math.abs(vx) * restitution, MIN_BOUNCE_SPEED); bounced = true; }
  if (x > maxX) { x = maxX; vx = -Math.max(Math.abs(vx) * restitution, MIN_BOUNCE_SPEED); bounced = true; }
  // Blight pass through the top wall (fall from staging into arena)
  if (!body.isBlight) {
    if (y < minY) { y = minY; vy = Math.max(Math.abs(vy) * restitution, MIN_BOUNCE_SPEED); bounced = true; }
  }
  if (y > maxY) { y = maxY; vy = -Math.max(Math.abs(vy) * restitution, MIN_FLOOR_BOUNCE); bounced = true; }

  body.position = new Vector2(x, y);
  body.velocity = new Vector2(vx, vy);
  if (bounced) body._bouncedThisFrame = true;
}

export function circlesOverlap(a, b) {
  return a.position.distanceTo(b.position) < (a.radius + b.radius);
}

export function resolveCircleCollision(a, b, restitution = 1) {
  const delta   = b.position.sub(a.position);
  const dist    = delta.magnitude;
  const overlap = (a.radius + b.radius) - dist;
  if (overlap <= 0) return;

  if (dist === 0) {
    const angle = Math.random() * Math.PI * 2;
    a.position = a.position.sub(new Vector2(Math.cos(angle), Math.sin(angle)).scale(a.radius));
    b.position = b.position.add(new Vector2(Math.cos(angle), Math.sin(angle)).scale(b.radius));
    return;
  }

  const normal = delta.scale(1 / dist);

  // Separate positions fully
  const sep  = normal.scale(overlap / 2 + 0.5);
  a.position = a.position.sub(sep);
  b.position = b.position.add(sep);

  const relVel    = a.velocity.sub(b.velocity);
  const velAlongN = relVel.dot(normal);

  // Compute impulse — but enforce a minimum outward separation speed.
  // This prevents two slow-moving balls (e.g. both falling under gravity)
  // from barely bouncing and getting re-merged the next frame.
  const targetVelAlongN = Math.min(velAlongN, -MIN_BALL_SEPARATION);
  const impulseAmt = (velAlongN - targetVelAlongN) * restitution;
  const resistA = a.knockbackResist ?? 1.0;
  const resistB = b.knockbackResist ?? 1.0;
  a.velocity = a.velocity.sub(normal.scale(impulseAmt * resistA));
  b.velocity = b.velocity.add(normal.scale(impulseAmt * resistB));
}

/**
 * Minimum distance from point P to segment (p1→p2).
 * Returns { dist, t } where t is the parameter [0,1] of the closest point.
 */
export function segmentToPointDistance(p1, p2, point) {
  const d    = p2.sub(p1);
  const len2 = d.dot(d);
  if (len2 === 0) return { dist: p1.distanceTo(point), t: 0 };
  const t    = Math.max(0, Math.min(1, point.sub(p1).dot(d) / len2));
  return { dist: p1.add(d.scale(t)).distanceTo(point), t };
}

export function segmentDistance(a1, a2, b1, b2) {
  const d1 = a2.sub(a1), d2 = b2.sub(b1), r = a1.sub(b1);
  const a = d1.dot(d1), e = d2.dot(d2), f = d2.dot(r);
  let s, t;
  if (a <= 1e-10 && e <= 1e-10) return r.magnitude;
  if (a <= 1e-10) { s = 0; t = clamp(f / e, 0, 1); }
  else {
    const c = d1.dot(r);
    if (e <= 1e-10) { t = 0; s = clamp(-c / a, 0, 1); }
    else {
      const b = d1.dot(d2), denom = a * e - b * b;
      s = denom !== 0 ? clamp((b * f - c * e) / denom, 0, 1) : 0;
      t = (b * s + f) / e;
      if (t < 0)      { t = 0; s = clamp(-c / a, 0, 1); }
      else if (t > 1) { t = 1; s = clamp((b - c) / a, 0, 1); }
    }
  }
  return a1.add(d1.scale(s)).distanceTo(b1.add(d2.scale(t)));
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

export function resolveAllCollisions(alive, passes = 5) {
  for (let pass = 0; pass < passes; pass++) {
    for (let i = 0; i < alive.length; i++) {
      for (let j = i + 1; j < alive.length; j++) {
        resolveCircleCollision(alive[i], alive[j]);
      }
    }
  }
}
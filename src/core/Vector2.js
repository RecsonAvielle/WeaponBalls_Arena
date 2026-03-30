/**
 * Vector2.js
 * Immutable-style 2D vector math.
 * Every method returns a new Vector2 so operations can be chained cleanly.
 */
export class Vector2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  add(v)      { return new Vector2(this.x + v.x, this.y + v.y); }
  sub(v)      { return new Vector2(this.x - v.x, this.y - v.y); }
  scale(s)    { return new Vector2(this.x * s,   this.y * s);   }
  dot(v)      { return this.x * v.x + this.y * v.y;             }

  get magnitude()   { return Math.sqrt(this.x ** 2 + this.y ** 2); }
  get normalized()  {
    const m = this.magnitude;
    return m === 0 ? new Vector2() : this.scale(1 / m);
  }

  /** Distance to another vector */
  distanceTo(v) { return this.sub(v).magnitude; }

  /** Reflect this vector off a surface defined by its normal */
  reflect(normal) {
    return this.sub(normal.scale(2 * this.dot(normal)));
  }

  clone() { return new Vector2(this.x, this.y); }

  toString() { return `Vector2(${this.x.toFixed(2)}, ${this.y.toFixed(2)})`; }
}

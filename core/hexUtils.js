/**
 * Hexagonal grid utilities using axial coordinates (q, r)
 */

export class HexPosition {
    constructor(q, r) {
        this.q = q;
        this.r = r;
    }

    add(other) {
        return new HexPosition(this.q + other.q, this.r + other.r);
    }

    subtract(other) {
        return new HexPosition(this.q - other.q, this.r - other.r);
    }

    equals(other) {
        return this.q === other.q && this.r === other.r;
    }

    toKey() {
        return `${this.q},${this.r}`;
    }

    static fromKey(key) {
        const [q, r] = key.split(',').map(Number);
        return new HexPosition(q, r);
    }

    distance(other) {
        // Hex distance using cube coordinates
        const dq = this.q - other.q;
        const dr = this.r - other.r;
        const ds = (-this.q - this.r) - (-other.q - other.r);
        return (Math.abs(dq) + Math.abs(dr) + Math.abs(ds)) / 2;
    }
}

/**
 * Convert axial hex coordinates to pixel coordinates
 * Uses pointy-top hexagon orientation
 */
export function axialToPixel(pos, hexRadius, centerX, centerY) {
    const x = hexRadius * (Math.sqrt(3) * pos.q + Math.sqrt(3) / 2 * pos.r) + centerX;
    const y = hexRadius * (1.5 * pos.r) + centerY;
    return { x, y };
}

/**
 * Convert pixel coordinates to axial hex coordinates
 */
export function pixelToAxial(x, y, hexRadius, centerX, centerY) {
    const relX = x - centerX;
    const relY = y - centerY;

    const q = (Math.sqrt(3) / 3 * relX - 1 / 3 * relY) / hexRadius;
    const r = (2 / 3 * relY) / hexRadius;

    return hexRound(q, r);
}

/**
 * Round fractional hex coordinates to nearest hex
 */
export function hexRound(q, r) {
    const s = -q - r;

    let rq = Math.round(q);
    let rr = Math.round(r);
    let rs = Math.round(s);

    const qDiff = Math.abs(rq - q);
    const rDiff = Math.abs(rr - r);
    const sDiff = Math.abs(rs - s);

    if (qDiff > rDiff && qDiff > sDiff) {
        rq = -rr - rs;
    } else if (rDiff > sDiff) {
        rr = -rq - rs;
    }

    return new HexPosition(rq, rr);
}

/**
 * Generate all hex positions within a given radius
 * Returns ~91 tiles for radius 6
 */
export function generateHexGrid(radius) {
    const tiles = [];

    for (let q = -radius; q <= radius; q++) {
        const r1 = Math.max(-radius, -q - radius);
        const r2 = Math.min(radius, -q + radius);

        for (let r = r1; r <= r2; r++) {
            tiles.push(new HexPosition(q, r));
        }
    }

    return tiles;
}

/**
 * Check if a hex position is within the grid bounds
 */
export function isWithinGrid(pos, radius) {
    const s = -pos.q - pos.r;
    return Math.abs(pos.q) <= radius &&
           Math.abs(pos.r) <= radius &&
           Math.abs(s) <= radius;
}

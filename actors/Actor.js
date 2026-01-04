/**
 * Base class for all game entities with a position
 */

export class Actor {
    constructor(position) {
        this.position = position;  // HexPosition
        this.isVisible = true;
    }
}

import { Actor } from './Actor.js';

/**
 * Hexagonal tile on the game board
 */

export class Tile extends Actor {
    constructor(position) {
        super(position);
        this.isActive = true;
        this.warningStartTime = null;

        // Spawn animation
        this.isSpawning = true;
        this.spawnStartTime = 0;
        this.spawnDelay = 0;
        this.spawnDuration = 800; // milliseconds

        // Idle jiggle animation
        this.jigglePhase = Math.random() * Math.PI * 2; // Random start phase
        this.jiggleSpeed = 1.5 + Math.random() * 1.0; // Random speed (1.5-2.5, increased from 0.8-1.2)
        this.shouldJiggle = Math.random() < 0.25; // 25% of tiles jiggle (increased from 15%)

        // Weight/sink animation
        this.sinkAmount = 0;
        this.targetSink = 0;

        // Shattering animation
        this.isShattering = false;
        this.shatterStartTime = 0;
        this.shatterDuration = 400; // milliseconds
        this.shatterPieces = [];
    }

    get isWarning() {
        return this.warningStartTime !== null;
    }

    startSpawnAnimation(delay) {
        this.spawnDelay = delay;
        this.spawnStartTime = performance.now();
    }

    getSpawnProgress() {
        if (!this.isSpawning) return 1;

        const elapsed = performance.now() - this.spawnStartTime - this.spawnDelay;
        if (elapsed < 0) return 0; // Still waiting for delay

        const progress = Math.min(elapsed / this.spawnDuration, 1);

        if (progress >= 1) {
            this.isSpawning = false;
        }

        return progress;
    }

    startWarning() {
        this.warningStartTime = performance.now();
    }

    startShatter() {
        this.isShattering = true;
        this.shatterStartTime = performance.now();
        this.warningStartTime = null;

        // Create shatter pieces (6 triangular pieces radiating from center)
        this.shatterPieces = [];
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 2;
            // Each piece gets a random velocity
            const speed = 50 + Math.random() * 50; // pixels per second
            const angleVariation = (Math.random() - 0.5) * 0.5; // Add some randomness to angle
            const finalAngle = angle + angleVariation;

            this.shatterPieces.push({
                angle: angle, // Original angle for rendering the piece
                vx: Math.cos(finalAngle) * speed,
                vy: Math.sin(finalAngle) * speed,
                rotation: 0,
                rotationSpeed: (Math.random() - 0.5) * 8 // radians per second
            });
        }
    }

    fall() {
        this.isActive = false;
        this.isShattering = false;
        this.warningStartTime = null;
    }

    getShatterProgress() {
        if (!this.isShattering) return 0;
        const elapsed = performance.now() - this.shatterStartTime;
        const progress = Math.min(elapsed / this.shatterDuration, 1);

        if (progress >= 1) {
            this.fall();
        }

        return progress;
    }

    updateShatter(deltaTime) {
        if (!this.isShattering) return;

        const dt = deltaTime / 1000;
        for (const piece of this.shatterPieces) {
            // Apply gravity
            piece.vy += 200 * dt; // gravity acceleration
            piece.rotation += piece.rotationSpeed * dt;
        }
    }

    updateJiggle(deltaTime) {
        // Update jiggle phase
        this.jigglePhase += deltaTime / 1000 * this.jiggleSpeed;
    }

    getJiggleOffset() {
        if (!this.shouldJiggle || this.isSpawning || this.isWarning) {
            return { x: 0, y: 0, rotation: 0 };
        }

        const amplitude = 3; // pixels (increased from 0.5)
        const rotationAmplitude = 0.08; // radians (~4.5 degrees, increased from 0.01)

        return {
            x: Math.sin(this.jigglePhase) * amplitude,
            y: Math.cos(this.jigglePhase * 1.3) * amplitude * 0.5,
            rotation: Math.sin(this.jigglePhase * 0.7) * rotationAmplitude
        };
    }

    updateSink(hasPlayer, deltaTime) {
        // Set target based on whether player is on tile
        this.targetSink = hasPlayer ? 3 : 0; // 3 pixels sink

        // Smoothly interpolate to target
        const lerpSpeed = 8; // Higher = faster
        const dt = deltaTime / 1000;
        this.sinkAmount += (this.targetSink - this.sinkAmount) * lerpSpeed * dt;
    }
}

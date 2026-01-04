import { Actor } from './Actor.js';
import { axialToPixel } from '../core/hexUtils.js';
import { GameConfig } from '../core/config.js';

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

    render(ctx, centerX, centerY) {
        const pixel = axialToPixel(
            this.position,
            GameConfig.HEX_SIZE,
            centerX,
            centerY
        );

        // Shattering animation
        if (this.isShattering) {
            const progress = this.getShatterProgress();
            const alpha = 1 - progress;

            ctx.save();
            ctx.globalAlpha = alpha;

            // Draw each shatter piece
            for (let i = 0; i < this.shatterPieces.length; i++) {
                const piece = this.shatterPieces[i];
                const nextAngle = ((i + 1) % 6) * (Math.PI / 3) - Math.PI / 2;

                // Calculate piece position based on velocity and time
                const offsetX = piece.vx * progress * (this.shatterDuration / 1000);
                const offsetY = piece.vy * progress * (this.shatterDuration / 1000);

                ctx.save();
                ctx.translate(pixel.x + offsetX, pixel.y + offsetY);
                ctx.rotate(piece.rotation);

                // Draw triangular piece
                ctx.beginPath();
                ctx.moveTo(0, 0); // Center
                const radius = GameConfig.HEX_SIZE - 2;
                ctx.lineTo(
                    Math.cos(piece.angle) * radius,
                    Math.sin(piece.angle) * radius
                );
                ctx.lineTo(
                    Math.cos(nextAngle) * radius,
                    Math.sin(nextAngle) * radius
                );
                ctx.closePath();

                ctx.fillStyle = GameConfig.TILE_COLOR;
                ctx.fill();
                ctx.strokeStyle = GameConfig.TILE_BORDER;
                ctx.lineWidth = 2;
                ctx.stroke();

                ctx.restore();
            }

            ctx.restore();
            return;
        }

        if (!this.isActive) return;

        let fillColor = GameConfig.TILE_COLOR;

        if (this.isWarning) {
            // Pulsing yellow warning
            const elapsed = performance.now() - this.warningStartTime;
            const pulse = Math.sin(elapsed / 100) * 0.3 + 0.7;
            fillColor = `rgba(241, 196, 15, ${pulse})`;
        }

        // Spawn animation
        if (this.isSpawning) {
            const progress = this.getSpawnProgress();
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);

            ctx.save();

            // Start from above the screen
            const startY = -200;
            const currentY = startY + (pixel.y - startY) * eased;

            // Scale and fade in
            const scale = 0.3 + eased * 0.7;
            const alpha = eased;

            ctx.globalAlpha = alpha;
            ctx.translate(pixel.x, currentY);
            ctx.scale(scale, scale);

            this.drawHexagon(ctx, 0, 0, GameConfig.HEX_SIZE - 2, fillColor);

            ctx.restore();
        } else {
            // Apply idle animations (jiggle and sink)
            const jiggle = this.getJiggleOffset();
            const sinkY = this.sinkAmount;

            ctx.save();
            ctx.translate(pixel.x + jiggle.x, pixel.y + jiggle.y + sinkY);
            ctx.rotate(jiggle.rotation);

            this.drawHexagon(ctx, 0, 0, GameConfig.HEX_SIZE - 2, fillColor);

            ctx.restore();
        }
    }

    drawHexagon(ctx, x, y, radius, fillColor) {
        ctx.beginPath();

        for (let i = 0; i < 6; i++) {
            // Pointy-top hexagon
            const angle = (Math.PI / 3) * i - Math.PI / 2;
            const px = x + radius * Math.cos(angle);
            const py = y + radius * Math.sin(angle);

            if (i === 0) {
                ctx.moveTo(px, py);
            } else {
                ctx.lineTo(px, py);
            }
        }

        ctx.closePath();

        ctx.fillStyle = fillColor;
        ctx.fill();

        ctx.strokeStyle = GameConfig.TILE_BORDER;
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

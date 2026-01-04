/**
 * Player entity with pixel-based position for smooth movement
 */

export class Player {
    constructor(index, config, startX, startY) {
        this.index = index;
        this.name = config.name;
        this.color = config.color;
        this.keys = config.keys;

        // Pixel position (for smooth movement)
        this.x = startX;
        this.y = startY;

        // Velocity for momentum
        this.vx = 0;
        this.vy = 0;

        // Squash/stretch animation
        this.scaleX = 1;
        this.scaleY = 1;

        // Amoeba wobble animation
        this.wobblePhases = [
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2
        ];
        this.wobbleSpeed = 2.0;

        // Eye tracking
        this.eyeOffsetX = 0;
        this.eyeOffsetY = 0;
        this.targetEyeX = 0;
        this.targetEyeY = 0;

        // Falling animation
        this.isFalling = false;
        this.fallStartTime = 0;
        this.fallDuration = 800; // milliseconds

        // Spawn animation
        this.isSpawning = true;
        this.spawnStartTime = 0;
        this.spawnDuration = 500; // milliseconds

        this.isAlive = true;
        this.survivalTime = 0;
    }

    startSpawnAnimation() {
        this.isSpawning = true;
        this.spawnStartTime = performance.now();
    }

    getSpawnProgress() {
        if (!this.isSpawning) return 1;

        const elapsed = performance.now() - this.spawnStartTime;
        const progress = Math.min(elapsed / this.spawnDuration, 1);

        if (progress >= 1) {
            this.isSpawning = false;
        }

        return progress;
    }

    startFalling() {
        this.isFalling = true;
        this.fallStartTime = performance.now();
    }

    getFallProgress() {
        if (!this.isFalling) return 0;
        const elapsed = performance.now() - this.fallStartTime;
        return Math.min(elapsed / this.fallDuration, 1);
    }

    updateWobble(deltaTime) {
        // Update all wobble phases
        const dt = deltaTime / 1000 * this.wobbleSpeed;
        for (let i = 0; i < this.wobblePhases.length; i++) {
            this.wobblePhases[i] += dt;
        }
    }

    updateEye(deltaTime) {
        // Calculate target eye position based on velocity
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const maxEyeOffset = 8; // pixels (increased from 4)

        if (speed > 10) {
            // Normalize velocity and scale to eye offset
            const magnitude = Math.min(speed / 150, 1); // Max at speed 150 (reduced from 200 for more sensitivity)
            this.targetEyeX = (this.vx / speed) * maxEyeOffset * magnitude;
            this.targetEyeY = (this.vy / speed) * maxEyeOffset * magnitude;
        } else {
            // Return to center when not moving
            this.targetEyeX = 0;
            this.targetEyeY = 0;
        }

        // Smoothly interpolate eye position
        const lerpSpeed = 10; // Increased from 8 for snappier response
        const dt = deltaTime / 1000;
        this.eyeOffsetX += (this.targetEyeX - this.eyeOffsetX) * lerpSpeed * dt;
        this.eyeOffsetY += (this.targetEyeY - this.eyeOffsetY) * lerpSpeed * dt;
    }

    getWobblePoints(numPoints, radius) {
        // Generate amoeba-like points around the circle
        const points = [];
        for (let i = 0; i < numPoints; i++) {
            const angle = (Math.PI * 2 * i) / numPoints;

            // Multiple sine waves for organic wobble
            const wobble1 = Math.sin(this.wobblePhases[0] + i * 0.5) * 0.15;
            const wobble2 = Math.sin(this.wobblePhases[1] * 1.3 + i * 0.8) * 0.1;
            const wobble3 = Math.sin(this.wobblePhases[2] * 0.7 + i * 1.2) * 0.08;

            const wobbleFactor = 1 + wobble1 + wobble2 + wobble3;
            const wobbledRadius = radius * wobbleFactor;

            points.push({
                x: Math.cos(angle) * wobbledRadius,
                y: Math.sin(angle) * wobbledRadius
            });
        }
        return points;
    }
}

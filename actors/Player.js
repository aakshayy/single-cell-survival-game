import { GameConfig } from '../core/config.js';

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

    render(ctx) {
        // Skip fully dead players (not falling)
        if (!this.isAlive && !this.isFalling) return;

        ctx.save();

        // Animation variables
        let alpha = 1;
        let scale = 1;
        let yOffset = 0;

        // Spawn animation
        if (this.isSpawning) {
            const progress = this.getSpawnProgress();
            // Bounce in with overshoot
            const eased = progress < 0.5
                ? 2 * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;

            const overshoot = Math.sin(progress * Math.PI) * 0.3;
            scale = eased + overshoot;
            alpha = eased;
            yOffset = -(1 - eased) * 50; // Start slightly above
        }

        // Falling animation (overrides spawn)
        if (this.isFalling) {
            const progress = this.getFallProgress();
            // Ease-in for falling
            const easedProgress = progress * progress;

            alpha = 1 - easedProgress;
            scale = 1 - easedProgress * 0.5; // Shrink as falling
            yOffset = easedProgress * 100; // Fall down
        }

        ctx.globalAlpha = alpha;
        ctx.translate(this.x, this.y + yOffset);

        // Apply squash and stretch (if not spawning)
        const finalScaleX = this.isSpawning ? scale : this.scaleX * scale;
        const finalScaleY = this.isSpawning ? scale : this.scaleY * scale;
        ctx.scale(finalScaleX, finalScaleY);

        // Draw amoeba body with wobble
        const wobblePoints = this.getWobblePoints(16, GameConfig.PLAYER_RADIUS);

        // Create gradient for 3D effect
        const gradient = ctx.createRadialGradient(
            -5, -5, 2,
            0, 0, GameConfig.PLAYER_RADIUS
        );
        gradient.addColorStop(0, this.lightenColor(this.color, 40));
        gradient.addColorStop(0.5, this.color);
        gradient.addColorStop(1, this.darkenColor(this.color, 30));

        // Draw smooth amoeba shape
        ctx.beginPath();
        ctx.moveTo(wobblePoints[0].x, wobblePoints[0].y);

        for (let i = 0; i < wobblePoints.length; i++) {
            const current = wobblePoints[i];
            const next = wobblePoints[(i + 1) % wobblePoints.length];

            // Use quadratic curves for smooth organic shape
            const cpX = (current.x + next.x) / 2;
            const cpY = (current.y + next.y) / 2;
            ctx.quadraticCurveTo(current.x, current.y, cpX, cpY);
        }

        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw eye
        const eyeX = this.eyeOffsetX;
        const eyeY = this.eyeOffsetY - 2; // Slightly above center

        // Eye white
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fill();

        // Pupil (moves in direction of movement)
        const pupilOffsetX = this.eyeOffsetX * 0.5;
        const pupilOffsetY = this.eyeOffsetY * 0.5;
        ctx.beginPath();
        ctx.arc(eyeX + pupilOffsetX, eyeY + pupilOffsetY, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#000';
        ctx.fill();

        ctx.restore();
    }

    lightenColor(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, (num >> 16) + amt);
        const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
        const B = Math.min(255, (num & 0x0000FF) + amt);
        return `rgb(${R}, ${G}, ${B})`;
    }

    darkenColor(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, (num >> 16) - amt);
        const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
        const B = Math.max(0, (num & 0x0000FF) - amt);
        return `rgb(${R}, ${G}, ${B})`;
    }
}

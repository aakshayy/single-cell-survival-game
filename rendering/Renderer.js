import { GameConfig, MatchPhase } from '../core/config.js';
import { axialToPixel } from '../core/hexUtils.js';

/**
 * Canvas rendering for the game
 */

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Make canvas fill the entire window
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        // Animation state
        this.warningPhase = 0;
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        this.centerX = this.canvas.width / 2;
        this.centerY = this.canvas.height / 2;
    }

    render(gameState) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.drawBackground();
        this.drawTiles(gameState);
        this.drawPlayers(gameState);
        this.drawUI(gameState);

        // Draw game over screen if match is over
        if (gameState.matchPhase === MatchPhase.GameOver) {
            this.renderGameOver(gameState.alivePlayers[0] || null);
        }
    }

    drawBackground() {
        this.ctx.fillStyle = GameConfig.BACKGROUND_COLOR;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawTiles(gameState) {
        // Don't draw tiles if board hasn't been initialized yet
        if (gameState.board.size === 0) return;

        for (const [posKey, tile] of gameState.board) {
            const pixel = axialToPixel(
                tile.position,
                GameConfig.HEX_SIZE,
                this.centerX,
                this.centerY
            );

            // Shattering animation
            if (tile.isShattering) {
                const progress = tile.getShatterProgress();
                const alpha = 1 - progress;

                this.ctx.save();
                this.ctx.globalAlpha = alpha;

                // Draw each shatter piece
                for (let i = 0; i < tile.shatterPieces.length; i++) {
                    const piece = tile.shatterPieces[i];
                    const nextAngle = ((i + 1) % 6) * (Math.PI / 3) - Math.PI / 2;

                    // Calculate piece position based on velocity and time
                    const offsetX = piece.vx * progress * (tile.shatterDuration / 1000);
                    const offsetY = piece.vy * progress * (tile.shatterDuration / 1000);

                    this.ctx.save();
                    this.ctx.translate(pixel.x + offsetX, pixel.y + offsetY);
                    this.ctx.rotate(piece.rotation);

                    // Draw triangular piece
                    this.ctx.beginPath();
                    this.ctx.moveTo(0, 0); // Center
                    const radius = GameConfig.HEX_SIZE - 2;
                    this.ctx.lineTo(
                        Math.cos(piece.angle) * radius,
                        Math.sin(piece.angle) * radius
                    );
                    this.ctx.lineTo(
                        Math.cos(nextAngle) * radius,
                        Math.sin(nextAngle) * radius
                    );
                    this.ctx.closePath();

                    this.ctx.fillStyle = GameConfig.TILE_COLOR;
                    this.ctx.fill();
                    this.ctx.strokeStyle = GameConfig.TILE_BORDER;
                    this.ctx.lineWidth = 2;
                    this.ctx.stroke();

                    this.ctx.restore();
                }

                this.ctx.restore();
                continue;
            }

            if (!tile.isActive) continue;

            let fillColor = GameConfig.TILE_COLOR;

            if (tile.isWarning) {
                // Pulsing yellow warning
                const elapsed = performance.now() - tile.warningStartTime;
                const pulse = Math.sin(elapsed / 100) * 0.3 + 0.7;
                fillColor = `rgba(241, 196, 15, ${pulse})`;
            }

            // Spawn animation
            if (tile.isSpawning) {
                const progress = tile.getSpawnProgress();
                // Ease out cubic
                const eased = 1 - Math.pow(1 - progress, 3);

                this.ctx.save();

                // Start from above the screen
                const startY = -200;
                const currentY = startY + (pixel.y - startY) * eased;

                // Scale and fade in
                const scale = 0.3 + eased * 0.7;
                const alpha = eased;

                this.ctx.globalAlpha = alpha;
                this.ctx.translate(pixel.x, currentY);
                this.ctx.scale(scale, scale);

                this.drawHexagon(0, 0, GameConfig.HEX_SIZE - 2, fillColor);

                this.ctx.restore();
            } else {
                // Apply idle animations (jiggle and sink)
                const jiggle = tile.getJiggleOffset();
                const sinkY = tile.sinkAmount;

                this.ctx.save();
                this.ctx.translate(pixel.x + jiggle.x, pixel.y + jiggle.y + sinkY);
                this.ctx.rotate(jiggle.rotation);

                this.drawHexagon(0, 0, GameConfig.HEX_SIZE - 2, fillColor);

                this.ctx.restore();
            }
        }
    }

    drawHexagon(x, y, radius, fillColor) {
        this.ctx.beginPath();

        for (let i = 0; i < 6; i++) {
            // Pointy-top hexagon
            const angle = (Math.PI / 3) * i - Math.PI / 2;
            const px = x + radius * Math.cos(angle);
            const py = y + radius * Math.sin(angle);

            if (i === 0) {
                this.ctx.moveTo(px, py);
            } else {
                this.ctx.lineTo(px, py);
            }
        }

        this.ctx.closePath();

        this.ctx.fillStyle = fillColor;
        this.ctx.fill();

        this.ctx.strokeStyle = GameConfig.TILE_BORDER;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }

    drawPlayers(gameState) {
        // Don't draw players until board is initialized
        if (gameState.board.size === 0) return;

        for (const player of gameState.players) {
            // Skip fully dead players (not falling)
            if (!player.isAlive && !player.isFalling) continue;

            this.ctx.save();

            // Animation variables
            let alpha = 1;
            let scale = 1;
            let yOffset = 0;

            // Spawn animation
            if (player.isSpawning) {
                const progress = player.getSpawnProgress();
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
            if (player.isFalling) {
                const progress = player.getFallProgress();
                // Ease-in for falling
                const easedProgress = progress * progress;

                alpha = 1 - easedProgress;
                scale = 1 - easedProgress * 0.5; // Shrink as falling
                yOffset = easedProgress * 100; // Fall down
            }

            this.ctx.globalAlpha = alpha;
            this.ctx.translate(player.x, player.y + yOffset);

            // Apply squash and stretch (if not spawning)
            const finalScaleX = player.isSpawning ? scale : player.scaleX * scale;
            const finalScaleY = player.isSpawning ? scale : player.scaleY * scale;
            this.ctx.scale(finalScaleX, finalScaleY);

            // Draw amoeba body with wobble
            const wobblePoints = player.getWobblePoints(16, GameConfig.PLAYER_RADIUS);

            // Create gradient for 3D effect
            const gradient = this.ctx.createRadialGradient(
                -5, -5, 2,
                0, 0, GameConfig.PLAYER_RADIUS
            );
            gradient.addColorStop(0, this.lightenColor(player.color, 40));
            gradient.addColorStop(0.5, player.color);
            gradient.addColorStop(1, this.darkenColor(player.color, 30));

            // Draw smooth amoeba shape
            this.ctx.beginPath();
            this.ctx.moveTo(wobblePoints[0].x, wobblePoints[0].y);

            for (let i = 0; i < wobblePoints.length; i++) {
                const current = wobblePoints[i];
                const next = wobblePoints[(i + 1) % wobblePoints.length];

                // Use quadratic curves for smooth organic shape
                const cpX = (current.x + next.x) / 2;
                const cpY = (current.y + next.y) / 2;
                this.ctx.quadraticCurveTo(current.x, current.y, cpX, cpY);
            }

            this.ctx.closePath();
            this.ctx.fillStyle = gradient;
            this.ctx.fill();

            // Draw eye
            const eyeX = player.eyeOffsetX;
            const eyeY = player.eyeOffsetY - 2; // Slightly above center

            // Eye white
            this.ctx.beginPath();
            this.ctx.arc(eyeX, eyeY, 5, 0, Math.PI * 2);
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            this.ctx.fill();

            // Pupil (moves in direction of movement)
            const pupilOffsetX = player.eyeOffsetX * 0.5; // Increased from 0.4 for more pupil movement
            const pupilOffsetY = player.eyeOffsetY * 0.5;
            this.ctx.beginPath();
            this.ctx.arc(eyeX + pupilOffsetX, eyeY + pupilOffsetY, 2.5, 0, Math.PI * 2);
            this.ctx.fillStyle = '#000';
            this.ctx.fill();

            this.ctx.restore();
        }
    }

    drawUI(gameState) {
        const padding = 30;

        // Player 1 controls (left side)
        if (gameState.players[0]) {
            const p1 = gameState.players[0];
            this.ctx.fillStyle = p1.color;
            this.ctx.font = 'bold 20px Arial';
            this.ctx.fillText('W', padding, padding + 20);
            this.ctx.fillText('A', padding, padding + 45);
            this.ctx.fillText('S', padding, padding + 70);
            this.ctx.fillText('D', padding, padding + 95);

            // Status
            if (!p1.isAlive) {
                this.ctx.fillStyle = '#666';
                this.ctx.font = '16px Arial';
                this.ctx.fillText(`OUT (${(p1.survivalTime / 1000).toFixed(1)}s)`, padding, padding + 130);
            }
        }

        // Player 2 controls (right side)
        if (gameState.players[1]) {
            const p2 = gameState.players[1];
            this.ctx.fillStyle = p2.color;
            this.ctx.font = 'bold 20px Arial';
            this.ctx.textAlign = 'right';
            this.ctx.fillText('↑', this.canvas.width - padding, padding + 20);
            this.ctx.fillText('←', this.canvas.width - padding, padding + 45);
            this.ctx.fillText('↓', this.canvas.width - padding, padding + 70);
            this.ctx.fillText('→', this.canvas.width - padding, padding + 95);

            // Status
            if (!p2.isAlive) {
                this.ctx.fillStyle = '#666';
                this.ctx.font = '16px Arial';
                this.ctx.fillText(`OUT (${(p2.survivalTime / 1000).toFixed(1)}s)`, this.canvas.width - padding, padding + 130);
            }
            this.ctx.textAlign = 'left';
        }

        // Phase-specific UI
        if (gameState.matchPhase === MatchPhase.WaitingToStart) {
            // Draw large title
            this.ctx.font = 'bold 72px Arial';
            this.ctx.fillStyle = 'white';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('SINGLE CELL SURVIVAL', this.centerX, this.centerY - 40);

            // Draw subtitle with smaller font
            this.ctx.font = '24px Arial';
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            this.ctx.fillText('Press SPACE to Start', this.centerX, this.centerY + 20);
            this.ctx.textAlign = 'left';
        }
    }

    drawCenteredText(text, color, fontSize) {
        this.ctx.font = `bold ${fontSize}px Arial`;
        this.ctx.fillStyle = color;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(text, this.centerX, this.centerY);
        this.ctx.textAlign = 'left';
    }

    renderGameOver(winner) {
        // Draw semi-transparent overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Winner text
        const winText = winner ? `${winner.name} WINS!` : 'DRAW!';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.fillStyle = winner?.color || 'white';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(winText, this.centerX, this.centerY);

        // Restart prompt
        this.ctx.font = '20px Arial';
        this.ctx.fillStyle = 'white';
        this.ctx.fillText('Press R to Restart', this.centerX, this.centerY + 50);
        this.ctx.textAlign = 'left';
    }

    // Color utility methods
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

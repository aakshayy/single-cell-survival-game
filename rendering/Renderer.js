import { GameConfig, MatchPhase } from '../core/config.js';

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
        if (gameState.board.size === 0) return;

        for (const [posKey, tile] of gameState.board) {
            tile.render(this.ctx, this.centerX, this.centerY);
        }
    }

    drawPlayers(gameState) {
        if (gameState.board.size === 0) return;

        for (const player of gameState.players) {
            player.render(this.ctx);
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
}

import { GameConfig, MatchPhase } from '../core/config.js';

/**
 * Handles keyboard input for multiple players with smooth movement
 */

export class InputHandler {
    constructor(gameState) {
        this.gameState = gameState;
        this.heldKeys = new Set();

        this.bindEvents();
    }

    bindEvents() {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
    }

    handleKeyDown(e) {
        // Prevent default for game keys
        if (this.isGameKey(e.code)) {
            e.preventDefault();
        }

        this.heldKeys.add(e.code);
    }

    handleKeyUp(e) {
        this.heldKeys.delete(e.code);
    }

    isGameKey(code) {
        const gameKeys = [
            'KeyW', 'KeyA', 'KeyS', 'KeyD',
            'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
            'Space', 'KeyR'
        ];
        return gameKeys.includes(code);
    }

    isKeyHeld(code) {
        return this.heldKeys.has(code);
    }

    updatePlayers(deltaTime) {
        if (this.gameState.matchPhase !== MatchPhase.InProgress) return;

        for (const player of this.gameState.alivePlayers) {
            this.updatePlayerMovement(player, deltaTime);
        }
    }

    updatePlayerMovement(player, deltaTime) {
        // Don't move if falling
        if (player.isFalling) return;

        let inputX = 0;
        let inputY = 0;

        // Check which movement keys are held for this player
        if (this.heldKeys.has(player.keys.up)) inputY -= 1;
        if (this.heldKeys.has(player.keys.down)) inputY += 1;
        if (this.heldKeys.has(player.keys.left)) inputX -= 1;
        if (this.heldKeys.has(player.keys.right)) inputX += 1;

        // Normalize diagonal input
        if (inputX !== 0 && inputY !== 0) {
            inputX *= 0.707;
            inputY *= 0.707;
        }

        // Apply acceleration/deceleration with momentum
        const acceleration = 1200; // pixels/s^2
        const deceleration = 800; // pixels/s^2
        const maxSpeed = GameConfig.PLAYER_SPEED;
        const dt = deltaTime / 1000;

        if (inputX !== 0) {
            player.vx += inputX * acceleration * dt;
        } else {
            // Decelerate
            if (player.vx > 0) {
                player.vx = Math.max(0, player.vx - deceleration * dt);
            } else if (player.vx < 0) {
                player.vx = Math.min(0, player.vx + deceleration * dt);
            }
        }

        if (inputY !== 0) {
            player.vy += inputY * acceleration * dt;
        } else {
            // Decelerate
            if (player.vy > 0) {
                player.vy = Math.max(0, player.vy - deceleration * dt);
            } else if (player.vy < 0) {
                player.vy = Math.min(0, player.vy + deceleration * dt);
            }
        }

        // Clamp to max speed
        const speed = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
        if (speed > maxSpeed) {
            player.vx = (player.vx / speed) * maxSpeed;
            player.vy = (player.vy / speed) * maxSpeed;
        }

        // Calculate new position
        const newX = player.x + player.vx * dt;
        const newY = player.y + player.vy * dt;

        // Squash and stretch based on velocity
        const velocityMagnitude = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
        const stretchFactor = Math.min(velocityMagnitude / maxSpeed, 1) * 0.2;

        if (velocityMagnitude > 10) {
            // Stretch in direction of movement
            const angle = Math.atan2(player.vy, player.vx);
            player.scaleX = 1 + Math.abs(Math.cos(angle)) * stretchFactor;
            player.scaleY = 1 + Math.abs(Math.sin(angle)) * stretchFactor;
        } else {
            // Return to normal
            player.scaleX = 1;
            player.scaleY = 1;
        }

        // Check if new position is on a valid tile - if not, player falls!
        if (!this.gameState.isTileActive(newX, newY)) {
            player.startFalling();
            this.gameState.eliminatePlayer(player);
            return;
        }

        player.x = newX;
        player.y = newY;
    }
}

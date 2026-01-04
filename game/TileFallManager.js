import { GameConfig } from '../core/config.js';

/**
 * Manages the random falling of tiles during gameplay
 */

export class TileFallManager {
    constructor(gameState) {
        this.gameState = gameState;
        this.fallInterval = GameConfig.TILE_FALL_INTERVAL;
        this.pendingFalls = new Map();  // posKey → timeoutId
        this.nextFallTimeout = null;
        this.isRunning = false;
    }

    start() {
        this.isRunning = true;
        this.fallInterval = GameConfig.TILE_FALL_INTERVAL;
        this.scheduleNextFall();
    }

    stop() {
        this.isRunning = false;

        if (this.nextFallTimeout) {
            clearTimeout(this.nextFallTimeout);
            this.nextFallTimeout = null;
        }

        this.pendingFalls.forEach(timeoutId => clearTimeout(timeoutId));
        this.pendingFalls.clear();
    }

    scheduleNextFall() {
        if (!this.isRunning) return;

        this.nextFallTimeout = setTimeout(() => {
            this.selectRandomTile();
            this.accelerateFallRate();
            this.scheduleNextFall();
        }, this.fallInterval);
    }

    selectRandomTile() {
        // Get active tiles that are not already in warning state
        const activeTiles = [];
        const tilesWithPlayers = [];

        for (const [posKey, tile] of this.gameState.board) {
            if (tile.isActive && !tile.isWarning) {
                activeTiles.push(posKey);

                // Check if any player is on this tile
                const playersOnTile = this.gameState.checkPlayersOnTile(posKey);
                if (playersOnTile.length > 0) {
                    tilesWithPlayers.push(posKey);
                }
            }
        }

        if (activeTiles.length === 0) return;

        let posKey;

        // 20% chance to target a tile with a player on it (if any exist)
        if (tilesWithPlayers.length > 0 && Math.random() < 0.2) {
            const randomIndex = Math.floor(Math.random() * tilesWithPlayers.length);
            posKey = tilesWithPlayers[randomIndex];
        } else {
            // Random selection from all active tiles
            const randomIndex = Math.floor(Math.random() * activeTiles.length);
            posKey = activeTiles[randomIndex];
        }

        // Start warning phase
        this.gameState.markTileWarning(posKey);

        // Schedule actual fall after warning duration
        const timeoutId = setTimeout(() => {
            this.executeFall(posKey);
        }, GameConfig.TILE_WARNING_DURATION);

        this.pendingFalls.set(posKey, timeoutId);
    }

    executeFall(posKey) {
        this.pendingFalls.delete(posKey);

        // Check for players on this tile and eliminate them
        const playersOnTile = this.gameState.checkPlayersOnTile(posKey);

        for (const player of playersOnTile) {
            player.startFalling();
            this.gameState.eliminatePlayer(player);
        }

        // Remove the tile
        this.gameState.removeTile(posKey);
    }

    accelerateFallRate() {
        this.fallInterval = Math.max(
            GameConfig.MIN_FALL_INTERVAL,
            this.fallInterval - GameConfig.FALL_ACCELERATION
        );
    }
}

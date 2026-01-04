import { EventEmitter } from '../core/types.js';
import { MatchPhase, GameConfig, PlayerConfig } from '../core/config.js';
import { generateHexGrid, axialToPixel, pixelToAxial, HexPosition } from '../core/hexUtils.js';
import { Tile } from '../actors/Tile.js';
import { Player } from '../actors/Player.js';

/**
 * Central game state container
 */

export class GameState {
    constructor() {
        this.board = new Map();          // posKey → Tile
        this.players = [];
        this.alivePlayers = [];
        this.matchPhase = MatchPhase.WaitingToStart;
        this.gameStartTime = 0;
        this.events = new EventEmitter();

        // Canvas center (set during initialization)
        this.centerX = 0;
        this.centerY = 0;
    }

    initializeBoard(centerX, centerY) {
        this.centerX = centerX;
        this.centerY = centerY;
        this.board.clear();

        const positions = generateHexGrid(GameConfig.GRID_RADIUS);

        // Create tiles with staggered spawn animations
        for (let i = 0; i < positions.length; i++) {
            const pos = positions[i];
            const tile = new Tile(pos);

            // Random delay based on distance from center + randomness
            const distance = pos.distance(new HexPosition(0, 0));
            const baseDelay = distance * 50; // 50ms per ring
            const randomDelay = Math.random() * 200; // Up to 200ms random

            tile.startSpawnAnimation(baseDelay + randomDelay);
            this.board.set(pos.toKey(), tile);
        }
    }

    initializePlayers(playerConfigs) {
        this.players = [];

        for (let i = 0; i < playerConfigs.length; i++) {
            const config = playerConfigs[i];
            const startPos = new HexPosition(config.startQ, config.startR);
            const pixel = axialToPixel(startPos, GameConfig.HEX_SIZE, this.centerX, this.centerY);

            const player = new Player(i, config, pixel.x, pixel.y);
            this.players.push(player);
        }

        this.alivePlayers = [...this.players];
    }

    startPlayerSpawnAnimations() {
        for (const player of this.players) {
            player.startSpawnAnimation();
        }
    }

    areAllTilesSpawned() {
        for (const [_, tile] of this.board) {
            if (tile.isSpawning) return false;
        }
        return true;
    }

    areAllPlayersSpawned() {
        for (const player of this.players) {
            if (player.isSpawning) return false;
        }
        return true;
    }

    getPlayerCurrentTile(player) {
        const hexPos = pixelToAxial(
            player.x,
            player.y,
            GameConfig.HEX_SIZE,
            this.centerX,
            this.centerY
        );
        return this.board.get(hexPos.toKey());
    }

    isTileActive(x, y) {
        const hexPos = pixelToAxial(x, y, GameConfig.HEX_SIZE, this.centerX, this.centerY);
        const tile = this.board.get(hexPos.toKey());
        return tile && tile.isActive;
    }

    markTileWarning(posKey) {
        const tile = this.board.get(posKey);
        if (tile && tile.isActive) {
            tile.startWarning();
            this.events.emit('tileWarning', posKey);
        }
    }

    removeTile(posKey) {
        const tile = this.board.get(posKey);
        if (tile) {
            tile.startShatter();
            this.events.emit('tileFallen', posKey);
        }
    }

    eliminatePlayer(player) {
        player.isAlive = false;
        player.survivalTime = performance.now() - this.gameStartTime;
        this.alivePlayers = this.alivePlayers.filter(p => p !== player);
        this.events.emit('playerEliminated', player);

        // Delay game over until falling animation completes
        if (this.alivePlayers.length <= 1) {
            setTimeout(() => {
                // Double-check still at end game (in case of restart)
                if (this.alivePlayers.length <= 1 && this.matchPhase === MatchPhase.InProgress) {
                    this.matchPhase = MatchPhase.GameOver;
                    this.events.emit('gameOver', this.alivePlayers[0] || null);
                }
            }, player.fallDuration);
        }
    }

    checkPlayersOnTile(posKey) {
        const tile = this.board.get(posKey);
        if (!tile) return [];

        const hexPos = HexPosition.fromKey(posKey);
        const tilePixel = axialToPixel(hexPos, GameConfig.HEX_SIZE, this.centerX, this.centerY);

        return this.alivePlayers.filter(player => {
            const playerHex = pixelToAxial(
                player.x,
                player.y,
                GameConfig.HEX_SIZE,
                this.centerX,
                this.centerY
            );
            return playerHex.toKey() === posKey;
        });
    }

    reset() {
        this.board.clear();
        this.players = [];
        this.alivePlayers = [];
        this.matchPhase = MatchPhase.WaitingToStart;
        this.gameStartTime = 0;
        this.events.clear();
    }
}

import { MatchPhase, PlayerConfig } from '../core/config.js';
import { GameState } from './GameState.js';
import { InputHandler } from './InputHandler.js';
import { TileFallManager } from './TileFallManager.js';
import { Renderer } from '../rendering/Renderer.js';
import { SoundManager } from '../audio/SoundManager.js';

/**
 * Main game controller - handles game flow, loop, and component coordination
 */

export class GameMode {
    constructor(canvas) {
        this.canvas = canvas;
        this.renderer = new Renderer(canvas);
        this.soundManager = new SoundManager();
        this.soundManager.initialize();

        this.gameState = null;
        this.inputHandler = null;
        this.tileFallManager = null;

        this.animationFrameId = null;
        this.lastFrameTime = 0;
        this.playersSpawnStarted = false;

        this.boundGameLoop = this.gameLoop.bind(this);
    }

    initialize(playerCount = 2) {
        // Create new game state
        this.gameState = new GameState();
        // Store player count for later initialization
        this.playerCount = playerCount;

        // Don't initialize board or players yet - wait for SPACE
        // Create handlers (they'll work once players are initialized)
        this.inputHandler = new InputHandler(this.gameState);
        this.tileFallManager = new TileFallManager(this.gameState);

        // Subscribe to events
        this.subscribeToEvents();

        // Start rendering loop and wait for SPACE
        this.startGameLoop();
        this.bindStartKey();
    }

    checkSpawnProgress() {
        const checkInterval = setInterval(() => {
            // Check if all tiles are spawned
            if (this.gameState.areAllTilesSpawned() && !this.playersSpawnStarted) {
                this.playersSpawnStarted = true;
                // NOW initialize players on the spawned tiles
                this.gameState.initializePlayers(PlayerConfig.slice(0, this.playerCount));
                this.gameState.startPlayerSpawnAnimations();
                // Play spawn sound for players
                for (let i = 0; i < this.playerCount; i++) {
                    setTimeout(() => this.soundManager.play('playerSpawn'), i * 100);
                }
            }

            // Check if all players are spawned
            if (this.playersSpawnStarted && this.gameState.areAllPlayersSpawned()) {
                clearInterval(checkInterval);
                this.onSpawnComplete();
            }
        }, 50);
    }

    onSpawnComplete() {
        // All animations complete, now start the game
        this.startGame();
    }

    bindStartKey() {
        const handleStart = (e) => {
            if (e.code === 'Space' && this.gameState.matchPhase === MatchPhase.WaitingToStart) {
                e.preventDefault();
                document.removeEventListener('keydown', handleStart);
                this.startTileSpawn();
            }
        };
        document.addEventListener('keydown', handleStart);
    }

    startTileSpawn() {
        // Change phase to spawning (this removes the "Press SPACE" text)
        this.gameState.matchPhase = MatchPhase.Spawning;

        // Initialize the board now
        this.gameState.initializeBoard(this.renderer.centerX, this.renderer.centerY);

        // Check for when tiles finish spawning, then spawn players
        this.checkSpawnProgress();
    }

    subscribeToEvents() {
        this.gameState.events.subscribe('playerEliminated', (player) => {
            console.log(`${player.name} eliminated! Survived ${(player.survivalTime / 1000).toFixed(1)}s`);
            this.soundManager.play('playerEliminated');
        });

        this.gameState.events.subscribe('gameOver', (winner) => {
            this.handleGameOver(winner);
            this.soundManager.play('gameOver');
        });

        this.gameState.events.subscribe('tileWarning', () => {
            this.soundManager.play('tileWarning');
        });

        this.gameState.events.subscribe('tileFallen', () => {
            this.soundManager.play('tileShatter');
        });
    }

    startGame() {
        this.gameState.matchPhase = MatchPhase.InProgress;
        this.gameState.gameStartTime = performance.now();

        this.tileFallManager.start();
        this.soundManager.startBackgroundMusic();
        this.startGameLoop();
    }

    startGameLoop() {
        this.lastFrameTime = performance.now();
        this.animationFrameId = requestAnimationFrame(this.boundGameLoop);
    }

    gameLoop(timestamp) {
        const deltaTime = timestamp - this.lastFrameTime;
        this.lastFrameTime = timestamp;

        // Update game state
        this.update(deltaTime);

        // Render
        this.renderer.render(this.gameState);

        // Continue loop (always running for animations)
        this.animationFrameId = requestAnimationFrame(this.boundGameLoop);
    }

    update(deltaTime) {
        // Update player positions based on input (only when game is in progress)
        if (this.gameState.matchPhase === MatchPhase.InProgress) {
            this.inputHandler.updatePlayers(deltaTime);
        }

        // Update player animations (wobble and eye)
        this.updatePlayerAnimations(deltaTime);

        // Update tile animations (always update for jiggle effect)
        this.updateTileAnimations(deltaTime);
    }

    updatePlayerAnimations(deltaTime) {
        for (const player of this.gameState.players) {
            player.updateWobble(deltaTime);
            player.updateEye(deltaTime);
        }
    }

    updateTileAnimations(deltaTime) {
        // Get tiles that have players on them
        const tilesWithPlayers = new Set();
        for (const player of this.gameState.alivePlayers) {
            const tile = this.gameState.getPlayerCurrentTile(player);
            if (tile) {
                tilesWithPlayers.add(tile);
            }
        }

        // Update all tiles (including shattering ones)
        for (const [_, tile] of this.gameState.board) {
            // Update shattering animation
            if (tile.isShattering) {
                tile.updateShatter(deltaTime);
                tile.getShatterProgress(); // This will call fall() when done
                continue; // Skip other updates for shattering tiles
            }

            if (!tile.isActive) continue;

            // Update jiggle animation (works in all phases)
            tile.updateJiggle(deltaTime);

            // Update sink animation based on whether player is on it
            tile.updateSink(tilesWithPlayers.has(tile), deltaTime);
        }
    }

    stopGameLoop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    handleGameOver() {
        this.tileFallManager.stop();
        this.soundManager.stopBackgroundMusic();

        // Continue the game loop for end screen rendering
        // The game over screen will be rendered in the normal render loop

        // Listen for restart
        this.bindRestartKey();
    }

    bindRestartKey() {
        const handleRestart = (e) => {
            if (e.code === 'KeyR') {
                e.preventDefault();
                document.removeEventListener('keydown', handleRestart);
                this.restart();
            }
        };
        document.addEventListener('keydown', handleRestart);
    }

    restart() {
        this.playersSpawnStarted = false;
        // Don't stop the game loop - it will continue for the new game
        this.gameState.reset();
        this.initialize(this.playerCount);
    }
}

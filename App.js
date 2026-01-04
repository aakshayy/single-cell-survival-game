import { GameMode } from './game/GameMode.js';

/**
 * Single Cell Survival - Entry Point
 *
 * A browser-based survival game where players control amoebas on a
 * hexagonal grid. Tiles randomly fall, and the last cell standing wins.
 */

function initGame() {
    const canvas = document.getElementById('game-canvas');

    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }

    const game = new GameMode(canvas);
    game.initialize(2);  // 2 players

    console.log('Single Cell Survival initialized!');
    console.log('Player 1 (Red): WASD');
    console.log('Player 2 (Blue): Arrow Keys');
    console.log('Press SPACE to start!');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    initGame();
}

/**
 * Game configuration constants
 */

export const GameConfig = Object.freeze({
    // Grid settings
    GRID_RADIUS: 6,
    HEX_SIZE: 40,

    // Canvas
    CANVAS_SIZE: 700,

    // Timing (milliseconds)
    TILE_FALL_INTERVAL: 800,        // Time between selecting new tiles
    TILE_WARNING_DURATION: 600,     // Flash duration before fall
    MIN_FALL_INTERVAL: 300,         // Fastest rate
    FALL_ACCELERATION: 20,           // Reduce interval by this amount

    // Player settings
    PLAYER_RADIUS: 15,
    PLAYER_SPEED: 200,  // pixels per second

    // Colors
    TILE_COLOR: '#2d3436',
    TILE_BORDER: '#555555',
    WARNING_COLOR: '#f1c40f',
    BACKGROUND_COLOR: '#0d0d1a',
});

export const PlayerConfig = [
    {
        name: 'Player 1',
        color: '#e74c3c',
        keys: {
            up: 'KeyW',
            down: 'KeyS',
            left: 'KeyA',
            right: 'KeyD',
        },
        startQ: 0,
        startR: -5,
    },
    {
        name: 'Player 2',
        color: '#3498db',
        keys: {
            up: 'ArrowUp',
            down: 'ArrowDown',
            left: 'ArrowLeft',
            right: 'ArrowRight',
        },
        startQ: 0,
        startR: 5,
    },
];

export const MatchPhase = Object.freeze({
    WaitingToStart: 'WaitingToStart',
    Spawning: 'Spawning',
    InProgress: 'InProgress',
    GameOver: 'GameOver',
});

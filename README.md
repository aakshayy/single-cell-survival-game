# Single Cell Survival Game

A multiplayer browser-based survival game where players navigate a hexagonal grid, avoiding falling tiles to be the last one standing.

## 🎮 Play the Game

**[Play Demo on GitHub Pages](https://[YOUR_USERNAME].github.io/single-cell-survival-game/)**

## Features

- Two-player local multiplayer
- Hexagonal grid-based gameplay
- Dynamic tile-falling mechanics
- Responsive controls (WASD for Player 1, Arrow keys for Player 2)
- Canvas-based rendering

## How to Play

1. Open the game in your browser
2. **Player 1** uses WASD keys to move
3. **Player 2** uses Arrow keys to move
4. Avoid falling tiles and be the last player standing!

## Local Development

To run the game locally:

1. Clone this repository
```bash
git clone https://github.com/[YOUR_USERNAME]/single-cell-survival-game.git
cd single-cell-survival-game
```

2. Open `index.html` in your browser, or use a local server:
```bash
# Using Python 3
python -m http.server 8000

# Using Node.js http-server
npx http-server
```

3. Navigate to `http://localhost:8000` in your browser

## Project Structure

```
single-cell-survival-game/
├── index.html           # Main HTML file
├── App.js              # Application entry point
├── styles.css          # Game styles
├── actors/             # Game entities (Player, Tile, Actor)
├── core/               # Core utilities (hexUtils, types, config)
├── game/               # Game logic (GameState, InputHandler, etc.)
├── rendering/          # Rendering system
└── audio/              # Sound management
```

## Technologies

- Vanilla JavaScript (ES6 Modules)
- HTML5 Canvas API
- CSS3

## License

MIT License - feel free to use this project for learning or creating your own games!

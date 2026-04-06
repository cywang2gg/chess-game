# React Chess Game

A simple React chess game with basic threat detection.

## Prerequisites

- Node.js installed
- `npm` installed

## How to Run

1. `cd chess-game`
2. `npm install`
3. `npm start`

## Logic

- The project uses `chess.js` for move validation and game state.
- `src/logic/chessEngine.js` exports `checkThreats`, which scans the board to see if any of the player's pieces are currently attacked by the opponent.
- In `src/components/ChessBoard.js`, the `onDrop` handler updates the game state and sets the `warnings` state if any pieces are under attack.

import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from '../src/App';

// Mock lazy loaded components
jest.mock('../src/games/ChessGame', () => () => <div>Chess Game</div>);
jest.mock('../src/games/ChineseChess', () => () => <div>Chinese Chess</div>);
jest.mock('../src/games/Sudoku', () => () => <div>Sudoku</div>);
jest.mock('../src/games/Gomoku', () => () => <div>Gomoku</div>);

describe('App', () => {
  test('renders without crashing', () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );
  });
});

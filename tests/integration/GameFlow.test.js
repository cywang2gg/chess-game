import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import GameMenu from '../src/components/GameMenu';
import App from '../src/App';

describe('Integration Tests', () => {
  describe('Game Selection Flow', () => {
    test('game cards are clickable and link to correct routes', () => {
      render(
        <BrowserRouter>
          <GameMenu />
        </BrowserRouter>
      );
      
      // Check that game links exist
      const chessLink = screen.getByText('西洋棋').closest('a');
      const chineseChessLink = screen.getByText('中國象棋').closest('a');
      const sudokuLink = screen.getByText('數獨').closest('a');
      const gomokuLink = screen.getByText('五子棋').closest('a');
      
      expect(chessLink).toHaveAttribute('href', '/chess');
      expect(chineseChessLink).toHaveAttribute('href', '/chinese-chess');
      expect(sudokuLink).toHaveAttribute('href', '/sudoku');
      expect(gomokuLink).toHaveAttribute('href', '/gomoku');
    });
    
    test('start game buttons exist on each card', () => {
      render(
        <BrowserRouter>
          <GameMenu />
        </BrowserRouter>
      );
      
      const startButtons = screen.getAllByText('▶ 開始遊戲');
      expect(startButtons.length).toBe(4);
    });
  });
  
  describe('Routing', () => {
    test('invalid routes redirect to home', () => {
      // This would require testing with React Router
      // Placeholder for route redirect tests
    });
    
    test('lazy loading works for all games', () => {
      // Placeholder for lazy loading tests
    });
  });
  
  describe('Responsive Design', () => {
    test('iPad detection works', () => {
      // Placeholder for device detection tests
    });
    
    test('tablet styles are applied correctly', () => {
      // Placeholder for responsive style tests
    });
  });
});
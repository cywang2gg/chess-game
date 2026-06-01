import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import GameMenu from '../src/components/GameMenu';

describe('GameMenu', () => {
  test('renders game menu title', () => {
    render(
      <BrowserRouter>
        <GameMenu />
      </BrowserRouter>
    );
    
    expect(screen.getByText('🎮 Game Hub')).toBeInTheDocument();
  });

  test('renders all four games', () => {
    render(
      <BrowserRouter>
        <GameMenu />
      </BrowserRouter>
    );
    
    expect(screen.getByText('西洋棋')).toBeInTheDocument();
    expect(screen.getByText('中國象棋')).toBeInTheDocument();
    expect(screen.getByText('數獨')).toBeInTheDocument();
    expect(screen.getByText('五子棋')).toBeInTheDocument();
  });

  test('renders game descriptions', () => {
    render(
      <BrowserRouter>
        <GameMenu />
      </BrowserRouter>
    );
    
    expect(screen.getByText(/經典西洋棋對戰/)).toBeInTheDocument();
    expect(screen.getByText(/傳統中國象棋/)).toBeInTheDocument();
    expect(screen.getByText(/經典數獨遊戲/)).toBeInTheDocument();
    expect(screen.getByText(/黑白五子連珠/)).toBeInTheDocument();
  });
});
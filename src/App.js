import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import GameMenu from './components/GameMenu';

// Lazy load games for performance
const ChessGame = lazy(() => import('./games/ChessGame'));
const ChineseChess = lazy(() => import('./games/ChineseChess'));
const Sudoku = lazy(() => import('./games/Sudoku'));
const Gomoku = lazy(() => import('./games/Gomoku'));

// Loading fallback component
const LoadingFallback = () => (
  <div style={{
    height: '100vh',
    width: '100vw',
    backgroundColor: '#0f172a',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    color: '#f8fafc',
    fontFamily: 'system-ui, sans-serif'
  }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '48px', marginBottom: '20px' }}>🎮</div>
      <div style={{ fontSize: '24px', color: '#94a3b8' }}>Loading game...</div>
    </div>
  </div>
);

function App() {
  return (
    <BrowserRouter basename="/chess-game">
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<GameMenu />} />
          <Route path="/chess" element={<ChessGame />} />
          <Route path="/chinese-chess" element={<ChineseChess />} />
          <Route path="/sudoku" element={<Sudoku />} />
          <Route path="/gomoku" element={<Gomoku />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
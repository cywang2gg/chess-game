import React, { useState, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import { SUGGESTION_COLORS } from '../logic/chessEngine';

export default function ChessBoard({ game, onMove, warnings, sceneColor, suggestions = [] }) {
  const [optionSquares, setOptionSquares] = useState({});
  const [boardWidth, setBoardWidth] = useState(600);

  // 定義主題色系
  const themes = {
    blue: {
      dark: '#475569',
      light: '#cbd5e1',
      threat: 'rgba(59, 130, 246, 0.7)', // Blue
      moveDot: 'rgba(255,255,255,.2)'
    },
    yellow: {
      dark: '#b58863',
      light: '#f0d9b5',
      threat: 'rgba(245, 158, 11, 0.8)', // Amber/Orange
      moveDot: 'rgba(0,0,0,.15)'
    }
  };

  const currentTheme = themes[sceneColor] || themes.blue;

  useEffect(() => {
    function handleResize() {
      const height = window.innerHeight;
      const width = window.innerWidth;
      const size = Math.min(height - 120, width - 420); 
      setBoardWidth(size);
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    updateBoardStyles();
  }, [warnings, game, sceneColor, suggestions]);

  function updateBoardStyles(clickedSquare = null) {
    const newStyles = {};

    // 1. 建議棋路高亮 (最高優先)
    if (suggestions.length > 0) {
      suggestions.forEach((s) => {
        const color = SUGGESTION_COLORS[s.type];
        // 來源格 - 背景高亮
        newStyles[s.from] = {
          ...newStyles[s.from],
          background: color.bg,
          boxShadow: `inset 0 0 0 3px ${color.border}`,
        };
        // 目標格 - 線條指示
        newStyles[s.to] = {
          ...newStyles[s.to],
          background: `radial-gradient(circle, ${color.bg} 60%, transparent 70%)`,
        };
      });
    }

    // 2. 防守風險 (紅色不變)
    if (warnings.defensive) {
      warnings.defensive.forEach((square) => {
        newStyles[square] = {
          ...newStyles[square],
          background: 'rgba(239, 68, 68, 0.4)', 
        };
      });
    }

    // 3. 進攻機會 (隨主題變色)
    if (warnings.offensive) {
      warnings.offensive.forEach((square) => {
        newStyles[square] = {
          ...newStyles[square],
          boxShadow: `inset 0 0 0 6px ${currentTheme.threat}`,
        };
      });
    }

    // 4. 移動點
    if (clickedSquare) {
      const moves = game.moves({ square: clickedSquare, verbose: true });
      moves.forEach((move) => {
        newStyles[move.to] = {
          ...newStyles[move.to],
          background:
            game.get(move.to) && game.get(move.to).color !== game.get(clickedSquare).color
              ? `radial-gradient(circle, ${currentTheme.moveDot} 85%, transparent 90%)`
              : `radial-gradient(circle, ${currentTheme.moveDot} 25%, transparent 30%)`,
          borderRadius: '50%',
        };
      });
    }

    setOptionSquares(newStyles);
  }

  function onSquareClick(square) {
    updateBoardStyles(square);
  }

  function onDrop(sourceSquare, targetSquare) {
    const piece = game.get(sourceSquare);
    const move = { from: sourceSquare, to: targetSquare };
    if (piece && piece.type === 'p') {
      const rank = parseInt(targetSquare[1]);
      if ((piece.color === 'w' && rank === 8) || (piece.color === 'b' && rank === 1)) {
        move.promotion = 'q';
      }
    }
    const result = onMove(move);
    if (result) {
        setOptionSquares({});
        return true;
    }
    return false;
  }

  return (
    <div style={{ width: boardWidth, transition: 'width 0.3s ease' }}>
        <Chessboard 
            position={game.fen()} 
            onPieceDrop={onDrop} 
            onSquareClick={onSquareClick}
            customSquareStyles={optionSquares}
            boardWidth={boardWidth}
            customDarkSquareStyle={{ backgroundColor: currentTheme.dark, transition: '0.3s' }}
            customLightSquareStyle={{ backgroundColor: currentTheme.light, transition: '0.3s' }}
            animationDuration={300}
        />
        
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>
          <span>🛡️ DEFENSE: {warnings.defensive?.length || 0}</span>
          <span>⚔️ OFFENSE: {warnings.offensive?.length || 0}</span>
        </div>
    </div>
  );
}

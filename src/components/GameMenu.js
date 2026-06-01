import React, { useState } from 'react';
import { Link } from 'react-router-dom';

// Game data
const GAMES = [
  {
    id: 'chess',
    name: '西洋棋',
    nameEn: 'Chess',
    icon: '♔',
    description: '經典西洋棋對戰，支援 AI 對手與難度調整',
    features: ['AI 對戰', '難度 1-5', '棋路建議', 'iPad 優化'],
    gradient: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)',
    accentColor: '#3b82f6'
  },
  {
    id: 'chinese-chess',
    name: '中國象棋',
    nameEn: 'Chinese Chess',
    icon: '將',
    description: '傳統中國象棋，紅黑對弈，支援 AI 與多種難度',
    features: ['AI 對戰', '難度 1-5', '悔棋功能', 'iPad 優化'],
    gradient: 'linear-gradient(135deg, #7f1d1d 0%, #b91c1c 100%)',
    accentColor: '#ef4444'
  },
  {
    id: 'sudoku',
    name: '數獨',
    nameEn: 'Sudoku',
    icon: '9',
    description: '經典數獨遊戲，多種難度等級，訓練邏輯思維',
    features: ['難度 簡單~專家', '提示功能', '自動檢查', '計時挑戰'],
    gradient: 'linear-gradient(135deg, #064e3b 0%, #059669 100%)',
    accentColor: '#10b981'
  },
  {
    id: 'gomoku',
    name: '五子棋',
    nameEn: 'Gomoku',
    icon: '●',
    description: '黑白五子連珠對戰，Alpha-Beta 搜索 AI，支援深度 3 搜索',
    features: ['Alpha-Beta AI', '難度 1-5', '置換表優化', 'iPad 優化'],
    gradient: 'linear-gradient(135deg, #1e1e1e 0%, #3f3f3f 100%)',
    accentColor: '#8b5cf6'
  }
];

// iPad detection
const isIPad = () => {
  return /iPad|Macintosh|Silk/i.test(navigator.userAgent) && 'ontouchend' in document;
};

const getDeviceType = () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const iPad = isIPad();
  
  return {
    isIPad: iPad,
    isTablet: iPad || (width >= 768 && width <= 1024),
    isMobile: width < 768,
    screenWidth: width
  };
};

function GameMenu() {
  const [deviceType] = useState(getDeviceType());
  const isTablet = deviceType.isTablet;

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      backgroundColor: '#0f172a',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'system-ui, sans-serif',
      color: '#f8fafc'
    }}>
      {/* Header */}
      <header style={{
        padding: isTablet ? '40px 30px' : '20px',
        textAlign: 'center',
        borderBottom: '1px solid #1e293b'
      }}>
        <h1 style={{
          fontSize: isTablet ? '48px' : '32px',
          fontWeight: '800',
          color: '#f8fafc',
          marginBottom: '10px',
          letterSpacing: '2px'
        }}>
          🎮 Game Hub
        </h1>
        <p style={{
          fontSize: isTablet ? '18px' : '14px',
          color: '#94a3b8',
          marginBottom: '15px'
        }}>
          精選益智遊戲，挑戰你的智慧
        </p>
        {/* 版本資訊 - 頁首顯示 */}
        <div style={{
          backgroundColor: '#1e293b',
          padding: isTablet ? '12px 20px' : '8px 15px',
          borderRadius: '12px',
          display: 'inline-block',
          marginTop: '10px'
        }}>
          <div style={{
            fontSize: isTablet ? '16px' : '12px',
            color: '#22c55e',
            fontWeight: 'bold',
            marginBottom: '4px'
          }}>
            📅 最後更新：2026-06-02 • v0.3
          </div>
          <div style={{
            fontSize: isTablet ? '14px' : '11px',
            color: '#94a3b8'
          }}>
            五子棋 AI：Alpha-Beta 搜索（深度 3）+ 置換表優化
          </div>
        </div>
      </header>

      {/* Game Grid */}
      <main style={{
        flex: 1,
        padding: isTablet ? '30px' : '20px',
        display: 'grid',
        gridTemplateColumns: isTablet ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: isTablet ? '24px' : '16px',
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {GAMES.map(game => (
          <Link
            key={game.id}
            to={`/${game.id}`}
            style={{
              textDecoration: 'none',
              display: 'block'
            }}
          >
            <div style={{
              background: game.gradient,
              borderRadius: '20px',
              padding: isTablet ? '30px' : '20px',
              minHeight: isTablet ? '280px' : '220px',
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              border: `2px solid transparent`,
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Icon */}
              <div style={{
                fontSize: isTablet ? '64px' : '48px',
                marginBottom: '15px',
                filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))'
              }}>
                {game.icon}
              </div>

              {/* Name */}
              <h2 style={{
                fontSize: isTablet ? '28px' : '22px',
                fontWeight: '700',
                color: '#fff',
                marginBottom: '8px'
              }}>
                {game.name}
              </h2>

              {/* English Name */}
              <div style={{
                fontSize: isTablet ? '14px' : '12px',
                color: '#cbd5e1',
                marginBottom: '12px',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                {game.nameEn}
              </div>

              {/* Description */}
              <p style={{
                fontSize: isTablet ? '16px' : '13px',
                color: '#e2e8f0',
                marginBottom: '15px',
                lineHeight: '1.5'
              }}>
                {game.description}
              </p>

              {/* Features */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                {game.features.map(feature => (
                  <span key={feature} style={{
                    fontSize: isTablet ? '12px' : '10px',
                    padding: isTablet ? '6px 12px' : '4px 8px',
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    borderRadius: '12px',
                    color: '#fff'
                  }}>
                    {feature}
                  </span>
                ))}
              </div>

              {/* Play Button Indicator */}
              <div style={{
                position: 'absolute',
                bottom: isTablet ? '25px' : '15px',
                right: isTablet ? '25px' : '15px',
                backgroundColor: game.accentColor,
                color: '#fff',
                padding: isTablet ? '12px 20px' : '8px 14px',
                borderRadius: '12px',
                fontSize: isTablet ? '16px' : '12px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                minHeight: isTablet ? '44px' : 'auto'
              }}>
                ▶ 開始遊戲
              </div>
            </div>
          </Link>
        ))}
      </main>

      {/* Footer */}
      <footer style={{
        padding: isTablet ? '20px' : '15px',
        textAlign: 'center',
        borderTop: '1px solid #1e293b',
        color: '#64748b',
        fontSize: isTablet ? '14px' : '11px'
      }}>
        <div>Game Hub v0.3 • Made with React • Optimized for iPad</div>
        <div style={{ marginTop: '8px', color: '#22c55e', fontWeight: 'bold' }}>
          📅 最後更新：2026-06-02
        </div>
        <div style={{ marginTop: '6px', color: '#94a3b8' }}>
          五子棋 AI：Alpha-Beta 搜索（深度 3）+ 置換表優化
        </div>
        <div style={{ marginTop: '8px', color: '#475569' }}>
          西洋棋 • 中國象棋 • 數獨 • 五子棋
        </div>
      </footer>
    </div>
  );
}

export default GameMenu;
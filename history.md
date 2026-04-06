# Project History

## [v1.2.0] - 2026-04-06
### Added
- **Scene Color Switching**: 加入了 Blue (現代藍) 與 Yellow (經典木質) 兩種風格切換。
- **Auto-Resize Board**: 棋盤會根據視窗高度自動縮放。
- **Full View Dashboard**: 將計時器、難度與回合資訊整合至左側側邊欄。
- **Global Layout Reset**: 歸零 body 邊距並鎖定捲軸，實現 Zero Scrollbar 體驗。

### Fixed
- **Drag-and-Drop Offset**: 移除了 ChessBoard 容器上的 CSS Transform，改用 Padding 調整佈局，解決了拖曳棋子時出現的滑鼠偏移問題。
- **Negamax Logic**: 重構 AI 引擎，解決了舊版本在偶數深度會「自殺送子」的邏輯錯誤。
- **Layout Shifting**: 將威脅邊框改為 inset boxShadow，解決了格子偏移 10px 的抖動問題。
- **Invalid Move Crash**: 加入了 try-catch 與 Snap-back，防止非法移動導致程式崩潰。

## [v1.1.0] - 2026-04-06
### Added
- **5 Difficulty Levels**: 實作了 1 到 5 級的難度切換，對應不同搜尋深度。
- **Alpha-Beta Pruning**: 引入剪枝技術，大幅提升搜尋效率。
- **Turn Timer**: 實作了回合計時器。

## [v1.0.0] - Initial Setup
### Added
- 基礎 React 專案建立。
- 整合 `chess.js` 與 `react-chessboard`。
- 實作基本的隨機落子 AI。
- 實作基本的威脅偵測文字提示。

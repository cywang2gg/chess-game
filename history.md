# Project History

## [v1.4.0] - 2026-04-06
### Added
- **Humanized AI Difficulty**: 重新設計難度曲線。Level 1 導入 50% 失誤率，Level 2 導入 20% 失誤率，讓初學者更有成就感。
- **Mobile & iPad Optimization**: 徹底重構 CSS 佈局，解決 iPad Safari 工具列遮擋按鈕的問題。
- **Shrinkable Sidebar**: 側邊欄歷史紀錄區塊現在支援彈性縮放，確保在小螢幕上按鈕不被擠出。

### Fixed
- **Viewport Height Trap**: 將 100vh 修正為 100%，解決行動裝置網址列造成的溢出問題。

## [v1.3.0] - 2026-04-06
### Added
- **Character Battle System**: 黑棋 AI 現在會隨機從哈利波特角色庫中挑選名字。
- **Player Name Prompt**: 遊戲開始前會彈出對話框詢問玩家名稱。
- **Dynamic Turn Indicator**: 在側邊欄新增了會根據回合左右滑動的視覺化指示條。
- **Move History & AI Thinking**: 完成了左側移動紀錄列表與 "Thinking..." 狀態顯示。
- **Game Over Modal**: 實作了美觀的全屏結算彈窗。

### Fixed
- **Drag-and-Drop Offset**: 移除了 ChessBoard 容器上的 CSS Transform，解決了拖曳棋子時的滑鼠偏移問題。

## [v1.2.0] - 2026-04-06
...
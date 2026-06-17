# Project History

## [v0.4.1] - 2026-06-17
### Fixed
- **GitHub Pages SPA Routing**: 新增 404.html 重定向機制，解決五子棋等子頁面 404 問題
  - 使用 SPA GitHub Pages 技術將路徑轉換為查詢參數
  - index.html 處理查詢參數還原為路徑
  - 所有遊戲路由（/chess, /chinese-chess, /sudoku, /gomoku）現在都可以正常訪問

## [v0.4.0] - 2026-06-17
### Improved
- **五子棋 AI 優化**：修正棋型檢測 + VCF算法 + 預搜索威脅
- **活三防守提升**：提升活三防守優先級

## [v0.3.0] - 2026-06-02
### Added
- **Alpha-Beta AI**: 五子棋 AI 導入 Alpha-Beta 搜索 + 置換表優化
- **版本資訊**: 首頁新增更新時間標記

## [v0.2.0] - 2026-05-xx
### Improved
- **AI Enhancement**: 改進中國象棋與五子棋 AI 難度機制

## [v0.1.0] - 2026-05-xx
### Added
- **遊戲選單架構**: 重構為遊戲選單架構
- **中國象棋**: 新增中國象棋遊戲
- **數獨**: 新增數獨遊戲
- **五子棋**: 新增五子棋遊戲
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
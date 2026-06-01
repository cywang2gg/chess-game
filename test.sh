#!/bin/bash
# Game Hub 測試腳本
# 執行方式：./test.sh

set -e

echo "========================================="
echo "  Game Hub 測試腳本"
echo "========================================="
echo ""

# 檢查 Node.js 是否安裝
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安裝"
    exit 1
fi

echo "✅ Node.js 版本：$(node --version)"
echo "✅ npm 版本：$(npm --version)"
echo ""

# 安裝依賴
echo "📦 安裝依賴..."
npm install --silent
echo ""

# 單元測試
echo "========================================="
echo "  單元測試"
echo "========================================="
echo ""

if npm test -- --watchAll=false --coverage --passWithNoTests; then
    echo ""
    echo "✅ 單元測試通過"
else
    echo ""
    echo "❌ 單元測試失敗"
    exit 1
fi

echo ""

# 建構測試
echo "========================================="
echo "  建構測試"
echo "========================================="
echo ""

if npm run build; then
    echo ""
    echo "✅ 建構成功"
    echo "📊 Build size: $(du -sh build | cut -f1)"
else
    echo ""
    echo "❌ 建構失敗"
    exit 1
fi

echo ""
echo "========================================="
echo "  ✅ 所有測試通過"
echo "========================================="

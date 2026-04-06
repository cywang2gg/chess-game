import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// 強制全域樣式歸零，消除捲軸
const style = document.createElement('style');
style.innerHTML = `
  * {
    box-sizing: border-box;
  }
  body, html {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    overflow: hidden; /* 徹底鎖定視窗捲軸 */
    background-color: #0f172a;
  }
  #root {
    width: 100%;
    height: 100%;
  }
`;
document.head.appendChild(style);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { initAnalytics } from './utils/analytics';

// 初始化隐私友好分析（Umami）— 仅当 VITE_UMAMI_WEBSITE_ID 已配置时加载
initAnalytics();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

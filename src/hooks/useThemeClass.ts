import { useEffect } from 'react';
import { useAppStore } from '../stores/appStore';

/**
 * 同步 Zustand 主题状态到 <html> 的 class
 * 用于 Tailwind 暗色模式切换
 */
export function useThemeClass() {
  const theme = useAppStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);
}

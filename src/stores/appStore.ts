import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { storage } from '../utils/storage';

export type Theme = 'light' | 'dark';
export type ToneMode = 'fun' | 'formal';

interface AppState {
  /** 主题模式（亮/暗） */
  theme: Theme;
  /** 人格命名风格（梗名/正式名）P2 */
  toneMode: ToneMode;
  /** 移动端侧边栏 */
  sidebarOpen: boolean;
}

interface AppActions {
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  setToneMode: (mode: ToneMode) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

function getInitialTheme(): Theme {
  const saved = storage.get<Theme>(storage.keys.theme);
  if (saved === 'light' || saved === 'dark') return saved;

  // 跟随系统偏好
  if (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark';
  }
  return 'light';
}

export const useAppStore = create<AppState & AppActions>()(
  immer((set) => ({
    // --- State ---
    theme: getInitialTheme(),
    toneMode: 'fun',
    sidebarOpen: false,

    // --- Actions ---
    toggleTheme: () =>
      set((s) => {
        s.theme = s.theme === 'light' ? 'dark' : 'light';
        storage.set(storage.keys.theme, s.theme);
      }),

    setTheme: (theme) =>
      set((s) => {
        s.theme = theme;
        storage.set(storage.keys.theme, theme);
      }),

    setToneMode: (mode) =>
      set((s) => {
        s.toneMode = mode;
      }),

    toggleSidebar: () =>
      set((s) => {
        s.sidebarOpen = !s.sidebarOpen;
      }),

    setSidebarOpen: (open) =>
      set((s) => {
        s.sidebarOpen = open;
      }),
  })),
);

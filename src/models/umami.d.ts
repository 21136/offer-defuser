/**
 * Umami Analytics 类型声明
 *
 * Umami 加载后会挂载 `window.umami`，提供 track 方法用于自定义事件上报。
 * 脚本未加载时（VITE_UMAMI_WEBSITE_ID 为空），window.umami 为 undefined。
 */

interface UmamiTrack {
  /**
   * 发送自定义事件到 Umami
   * @param event 事件名称（如 'test_complete', 'poster_download'）
   * @param data  可选的附加数据（key-value 对）
   */
  track(event: string, data?: Record<string, string | number>): void;
}

declare global {
  interface Window {
    umami?: UmamiTrack;
  }
}

export {};

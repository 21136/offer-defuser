import type { TrackEvent, TrackEventType, TrackStats } from '../models/tracker';
import { storage } from './storage';
import { trackUmami } from './analytics';

/**
 * 前端轻埋点系统
 *
 * - 所有数据仅存 localStorage，不上传任何内容
 * - Dashboard 标明「本机统计」
 * - 事件以追加方式写入，定期可由 Dashboard 聚合
 * - 同时桥接到 Umami（仅当 VITE_UMAMI_WEBSITE_ID 已配置时生效）
 */

const MAX_EVENTS = 500; // 最多保留 500 条事件

function getEvents(): TrackEvent[] {
  return storage.get<TrackEvent[]>(storage.keys.tracking) ?? [];
}

function saveEvents(events: TrackEvent[]): void {
  // 超出上限时移除最旧的事件
  if (events.length > MAX_EVENTS) {
    events = events.slice(events.length - MAX_EVENTS);
  }
  storage.set(storage.keys.tracking, events);
}

/** 记录一条埋点事件 */
export function track(event: TrackEventType, meta?: Record<string, string>): void {
  const events = getEvents();
  events.push({
    event,
    timestamp: new Date().toISOString(),
    meta,
  });
  saveEvents(events);

  // 桥接到 Umami（隐私友好分析，无 cookie）
  trackUmami(event, meta as Record<string, string | number> | undefined);
}

/** 获取聚合统计数据 */
export function getStats(): TrackStats {
  const events = getEvents();

  const counts: Record<string, number> = {};
  for (const e of events) {
    counts[e.event] = (counts[e.event] ?? 0) + 1;
  }

  return {
    totalTests: counts['test_complete'] ?? 0,
    totalDefuses: counts['defuse_generate'] ?? 0,
    totalPosterDownloads: counts['poster_download'] ?? 0,
    totalLinkCopies: counts['link_copy'] ?? 0,
    totalPageViews: counts['page_view'] ?? 0,
    lastActive: events.length > 0 ? events[events.length - 1].timestamp : null,
  };
}

/** 获取原始事件列表（供 Dashboard 展示） */
export function getEventsList(): TrackEvent[] {
  return getEvents();
}

/** 清除所有埋点数据 */
export function clearTracking(): void {
  storage.remove(storage.keys.tracking);
}

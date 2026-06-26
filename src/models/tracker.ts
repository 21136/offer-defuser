/** 埋点事件类型 */
export type TrackEventType =
  | 'page_view'
  | 'test_start'
  | 'test_complete'
  | 'defuse_generate'
  | 'poster_download'
  | 'link_copy'
  | 'step_reroll';

/** 埋点事件 */
export interface TrackEvent {
  event: TrackEventType;
  timestamp: string;
  meta?: Record<string, string>;
}

/** 埋点聚合统计 */
export interface TrackStats {
  totalTests: number;
  totalDefuses: number;
  totalPosterDownloads: number;
  totalLinkCopies: number;
  totalPageViews: number;
  lastActive: string | null;
}

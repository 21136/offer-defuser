import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStats, getEventsList, track } from '../utils/tracker';
import { storage } from '../utils/storage';
import type { TrackStats, TrackEvent } from '../models/tracker';

export default function DashboardPage() {
  const [stats, setStats] = useState<TrackStats | null>(null);
  const [events, setEvents] = useState<TrackEvent[]>([]);

  useEffect(() => {
    track('page_view', { page: 'dashboard' });
    refreshData();
  }, []);

  const refreshData = () => {
    setStats(getStats());
    setEvents(getEventsList());
  };

  const handleClear = () => {
    if (window.confirm('确定清除所有本机数据（含测试记录、方案、统计）？此操作不可恢复。')) {
      storage.clearAll();
      refreshData();
    }
  };

  return (
    <main id="main-content" className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-8">
      <div className="max-w-lg mx-auto">
        <div className="mb-8">
          <Link
            to="/"
            className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            ← 返回首页
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
            📊 本机数据看板
          </h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 bg-yellow-50 dark:bg-yellow-900/20 inline-block px-2 py-0.5 rounded">
            ⚠️ 本机统计，换设备不共享，不上传任何数据
          </p>
        </div>

        {stats ? (
          <>
            {/* Stats cards */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <StatCard label="完成测试" value={stats.totalTests} emoji="🧠" />
              <StatCard label="生成方案" value={stats.totalDefuses} emoji="🔧" />
              <StatCard
                label="保存海报"
                value={stats.totalPosterDownloads}
                emoji="📸"
              />
              <StatCard label="复制链接" value={stats.totalLinkCopies} emoji="📋" />
            </div>

            {/* Last active */}
            {stats.lastActive && (
              <p className="text-xs text-gray-400 mb-6">
                最近活跃：{new Date(stats.lastActive).toLocaleString('zh-CN')}
              </p>
            )}

            {/* Event log */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 mb-6">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                最近事件
              </h3>
              {events.length === 0 ? (
                <p className="text-sm text-gray-400">暂无数据</p>
              ) : (
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {events
                    .slice(-30)
                    .reverse()
                    .map((e, i) => (
                      <div
                        key={i}
                        className="text-xs text-gray-500 dark:text-gray-400 flex justify-between"
                      >
                        <span>{EVENT_LABELS[e.event] ?? e.event}</span>
                        <span>
                          {new Date(e.timestamp).toLocaleString('zh-CN')}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Clear button */}
            <button
              onClick={handleClear}
              className="w-full py-2.5 text-sm text-red-400 hover:text-red-600 border border-red-200 dark:border-red-800 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
            >
              清除本机数据
            </button>
          </>
        ) : (
          <p className="text-gray-400 text-sm">加载中...</p>
        )}
      </div>
    </main>
  );
}

const EVENT_LABELS: Record<string, string> = {
  page_view: '📄 页面浏览',
  test_start: '🧠 开始测试',
  test_complete: '✅ 测试完成',
  defuse_generate: '🔧 生成方案',
  poster_download: '📸 保存海报',
  link_copy: '📋 复制链接',
  step_reroll: '🔄 换一句',
};

function StatCard({
  label,
  value,
  emoji,
}: {
  label: string;
  value: number;
  emoji: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 text-center">
      <div className="text-2xl mb-1">{emoji}</div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">
        {value}
      </div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  );
}

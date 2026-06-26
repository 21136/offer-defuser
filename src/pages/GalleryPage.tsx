import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../stores/appStore';
import { getDisplayName } from '../utils/displayName';
import { track } from '../utils/tracker';
import type { Persona } from '../models/persona';

interface GalleryPageProps {
  personas: Persona[];
}

export default function GalleryPage({ personas }: GalleryPageProps) {
  const navigate = useNavigate();
  const toneMode = useAppStore((s) => s.toneMode);

  useEffect(() => {
    track('page_view', { page: 'gallery' });
  }, []);

  return (
    <main id="main-content" className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Link
            to="/"
            className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            ← 返回首页
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
            🎭 人格图鉴
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            16 种求职人格一览 · 点击卡片查看详情
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {personas.map((p) => (
            <button
              key={p.id}
              onClick={() => navigate(`/result?p=${p.id}`)}
              className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 text-left hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 cursor-pointer w-full"
            >
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {getDisplayName(p, toneMode)}
                </h3>
                <span className="text-blue-500 text-xs opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                  查看 →
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {p.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                {p.description}
              </p>
            </button>
          ))}
        </div>

        {/* Disclaimer */}
        <p className="mt-8 text-xs text-gray-300 dark:text-gray-600 text-center">
          ⚠️ 本测试基于娱乐化模型，仅供求职心态自嘲与参考，不构成心理或职业咨询。
        </p>
      </div>
    </main>
  );
}

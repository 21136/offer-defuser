import { Link } from 'react-router-dom';
import { useTestStore } from '../stores/testStore';
import { useAppStore } from '../stores/appStore';
import { getDisplayName } from '../utils/displayName';
import { track } from '../utils/tracker';
import { useEffect } from 'react';

export default function HomePage() {
  const hasResult = useTestStore((s) => s.status === 'completed');
  const personaMatch = useTestStore((s) => s.personaMatch);
  const toneMode = useAppStore((s) => s.toneMode);

  useEffect(() => {
    track('page_view', { page: 'home' });
  }, []);

  return (
    <main id="main-content" className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-linear-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950">
      {/* Hero */}
      <div className="text-center max-w-lg mx-auto mb-12">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-3">
          💣 Offer拆弹专家
        </h1>
        <p className="text-lg text-gray-500 dark:text-gray-400">
          测测你的求职内耗人格，生成 8 步可执行拆解方案
        </p>
        {hasResult && personaMatch && (
          <p className="mt-3 text-sm text-blue-600 dark:text-blue-400">
            上次测试结果：
            <Link
              to={`/result?p=${personaMatch.persona.id}`}
              className="underline ml-1"
            >
              {getDisplayName(personaMatch.persona, toneMode)}
            </Link>
          </p>
        )}
      </div>

      {/* Two entrance cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
        {/* Module A: Personality Test */}
        <Link
          to="/test"
          className="group rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200"
        >
          <div className="text-4xl mb-4">🧠</div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            求职人格测试
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            12 题快速测试 · 四维雷达图 · 16 种人格
            {hasResult ? ' · 已测，可重测' : ''}
          </p>
        </Link>

        {/* Module B: Offer Defuser */}
        <Link
          to="/defuser"
          className="group rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 hover:shadow-lg hover:border-green-300 dark:hover:border-green-600 transition-all duration-200"
        >
          <div className="text-4xl mb-4">🔧</div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
            Offer 拆解器
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            输入岗位+截止日 · 生成 8 步可执行方案 · 每步可换一句
          </p>
        </Link>
      </div>

      {/* Footer links */}
      <div className="mt-12 flex gap-6 text-sm text-gray-400 dark:text-gray-500">
        <Link to="/gallery" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          人格图鉴
        </Link>
        <Link to="/dashboard" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          本机统计
        </Link>
      </div>

      {/* Disclaimer */}
      <p className="mt-8 text-xs text-gray-300 dark:text-gray-600 max-w-md text-center">
        ⚠️ 本测试基于娱乐化模型，仅供求职心态自嘲与参考，不构成心理或职业咨询。
      </p>
    </main>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useDefuserStore } from '../stores/defuserStore';
import { useTestStore } from '../stores/testStore';
import { useAppStore } from '../stores/appStore';
import type { Persona } from '../models/persona';
import { P0_CATEGORIES, JOB_CATEGORY_LABELS } from '../models/step';
import { ShareCanvas } from '../components/ShareCanvas';
import { getDisplayName } from '../utils/displayName';
import { track } from '../utils/tracker';

interface DefuserPageProps {
  personas: Persona[];
}

export default function DefuserPage({ personas }: DefuserPageProps) {
  const [searchParams] = useSearchParams();
  const personaFromQuery = searchParams.get('persona');

  const {
    jobName,
    deadline,
    category,
    personaId,
    personaName,
    styleMode,
    currentPlan,
    status,
    setJobInfo,
    setPersona,
    setStyleMode,
    loadStepLibrary,
    doGenerate,
    doRerollStep,
    hydrateForm,
  } = useDefuserStore();

  const hasTestResult = useTestStore((s) => s.status === 'completed');
  const toneMode = useAppStore((s) => s.toneMode);

  const [loading, setLoading] = useState(true);

  // Set persona from query or store
  useEffect(() => {
    if (personaFromQuery) {
      const found = personas.find((p) => p.id === personaFromQuery);
      if (found) {
        setPersona(found.id, getDisplayName(found, useAppStore.getState().toneMode));
      }
    } else if (hasTestResult) {
      const match = useTestStore.getState().personaMatch;
      if (match) {
        setPersona(match.persona.id, getDisplayName(match.persona, useAppStore.getState().toneMode));
      }
    }
  }, [personaFromQuery, hasTestResult, personas, setPersona]);

  // Load step library and restore form
  useEffect(() => {
    track('page_view', { page: 'defuser' });
    hydrateForm();

    const category = useDefuserStore.getState().category;
    loadStepLibraryForCategory(category);
  }, []);

  const loadStepLibraryForCategory = useCallback(
    async (cat: string) => {
      setLoading(true);
      try {
        const mod = await import(`../assets/steps/${cat}.json`);
        loadStepLibrary(mod.default || mod);
      } catch {
        console.warn(`Step library for "${cat}" not found`);
      } finally {
        setLoading(false);
      }
    },
    [loadStepLibrary],
  );

  const handleCategoryChange = (newCat: string) => {
    // Update category in store and reload library
    const state = useDefuserStore.getState();
    setJobInfo(state.jobName, state.deadline, newCat as typeof category);
    loadStepLibraryForCategory(newCat);
  };

  const handleGenerate = () => {
    if (!jobName.trim() || !deadline) return;
    track('defuse_generate', {
      personaId,
      category,
    });
    doGenerate();
  };

  const todayStr = new Date().toISOString().split('T')[0];

  // Determine if we should show the Banner (NO_PERSONA)
  const showBanner = !hasTestResult && !personaFromQuery;
  const persona = personas.find((p) => p.id === personaId);

  return (
    <main id="main-content" className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-8">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/"
            className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            ← 返回首页
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
            🔧 Offer 拆解器
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {hasTestResult || personaFromQuery
              ? `为「${personaName}」定制拆解方案`
              : '输入你的目标岗位，生成 8 步可执行方案'}
          </p>
          {(hasTestResult || personaFromQuery) && (
            <button
              onClick={() =>
                useAppStore.getState().setToneMode(toneMode === 'fun' ? 'formal' : 'fun')
              }
              className="text-xs text-gray-400 hover:text-blue-500 transition-colors mt-1 cursor-pointer"
            >
              {toneMode === 'fun' ? '📛 中性别名' : '🎭 梗名模式'}
            </button>
          )}
        </div>

        {/* Banner for NO_PERSONA users */}
        {showBanner && (
          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl flex items-center justify-between">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              💡 先测人格，拆解更准哦（只需 2 分钟）
            </p>
            <Link
              to="/test"
              className="text-sm font-medium text-yellow-700 dark:text-yellow-300 underline whitespace-nowrap ml-3"
            >
              去测试 →
            </Link>
          </div>
        )}

        {/* Input form */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 mb-6 space-y-4">
          {/* Job name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              目标岗位
            </label>
            <input
              type="text"
              value={jobName}
              onChange={(e) =>
                setJobInfo(e.target.value, deadline, category)
              }
              placeholder="如：字节前端实习"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
            />
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              截止日期
            </label>
            <input
              type="date"
              value={deadline}
              min={todayStr}
              onChange={(e) =>
                setJobInfo(jobName, e.target.value, category)
              }
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              岗位类型
            </label>
            <div className="flex gap-2">
              {P0_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleCategoryChange(cat)}
                  className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all cursor-pointer
                    ${category === cat
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                >
                  {JOB_CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>

          {/* Style toggle + Generate */}
          <div className="space-y-3">
            {/* Style toggle P2 */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">文案风格：</span>
              <button
                onClick={() => setStyleMode('casual')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer
                  ${styleMode === 'casual'
                    ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
              >
                😄 松弛自嘲
              </button>
              <button
                onClick={() => setStyleMode('serious')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer
                  ${styleMode === 'serious'
                    ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
              >
                💼 务实高效
              </button>
            </div>

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={!jobName.trim() || !deadline || loading}
              className="w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              {loading ? '加载素材中...' : '🔨 生成拆解方案'}
            </button>
          </div>
        </div>

        {/* Result: 8 steps */}
        {status === 'ready' && currentPlan && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                你的 8 步拆解方案
              </h2>
              <span className="text-sm text-gray-400">
                距截止 {currentPlan.daysLeft} 天
              </span>
            </div>

            {currentPlan.steps.map((step) => (
              <div
                key={step.position}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-sm font-medium">
                      {step.position}
                    </span>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {step.title}
                    </h3>
                  </div>
                  <button
                    onClick={() => doRerollStep(step.position)}
                    className="text-xs text-gray-400 hover:text-blue-500 transition-colors cursor-pointer px-2 py-1"
                  >
                    🔄 换一句
                  </button>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed ml-10">
                  {step.content}
                </p>
              </div>
            ))}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleGenerate}
                className="flex-1 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              >
                🔄 重新生成
              </button>
              {persona && (
                <div className="flex-1 flex justify-center">
                  <ShareCanvas
                    type="plan"
                    persona={persona}
                    plan={currentPlan ?? undefined}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <p className="mt-8 text-xs text-gray-300 dark:text-gray-600 text-center">
          ⚠️ 本方案基于娱乐化模型生成，仅供求职参考，具体行动请结合自身情况调整。
        </p>
      </div>
    </main>
  );
}

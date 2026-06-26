import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTestStore } from '../stores/testStore';
import { Progress } from '../components/ui/Progress';
import type { Persona } from '../models/persona';
import { track } from '../utils/tracker';

interface TestPageProps {
  personas: Persona[];
}

export default function TestPage({ personas }: TestPageProps) {
  const navigate = useNavigate();
  const {
    questions,
    currentIndex,
    answers,
    status,
    loadQuestions,
    answerQuestion,
    goNext,
    goPrev,
    goTo,
    submitTest,
    resetTest,
    hydrateProgress,
  } = useTestStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load questions on mount
  useEffect(() => {
    track('page_view', { page: 'test' });
    track('test_start');

    // If coming from a completed test (e.g. "重新测试" button), reset first
    const currentStatus = useTestStore.getState().status;
    if (currentStatus === 'completed') {
      resetTest();
    }

    hydrateProgress();

    import('../assets/questions.json')
      .then((m) => {
        const data = (m.default || m) as Array<{
          id: number;
          text: string;
          options: Array<{ text: string; scores: Record<string, number> }>;
        }>;
        loadQuestions(data as import('../models/question').Question[]);
        setLoading(false);
      })
      .catch(() => {
        setError('题目加载失败，请刷新重试');
        setLoading(false);
      });
  }, [loadQuestions]);

  // Redirect to result when test completes
  useEffect(() => {
    if (status === 'completed') {
      const match = useTestStore.getState().personaMatch;
      const vector = useTestStore.getState().scoreVector;
      if (match && vector) {
        const v = `${vector.delay},${vector.apply},${vector.perfect},${vector.interview}`;
        navigate(`/result?p=${match.persona.id}&v=${v}`, { replace: true });
      } else if (match) {
        navigate(`/result?p=${match.persona.id}`, { replace: true });
      }
    }
  }, [status, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 animate-pulse">加载题目中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-red-500">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          刷新页面
        </button>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">暂无题目</p>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const progress = ((currentIndex + 1) / totalQuestions) * 100;
  const isAnswered = answers[currentQuestion.id] !== undefined;
  const isLast = currentIndex === totalQuestions - 1;
  const allAnswered = questions.every((q) => answers[q.id] !== undefined);

  const handleOptionSelect = (optionIndex: number) => {
    answerQuestion(currentQuestion.id, optionIndex);
  };

  const handleSubmit = () => {
    if (allAnswered) {
      submitTest(personas);
    }
  };

  return (
    <main id="main-content" className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-8">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              求职人格测试
            </h1>
            <span className="text-sm text-gray-400">
              {currentIndex + 1} / {totalQuestions}
            </span>
          </div>

          {/* Progress bar */}
          <Progress
            value={progress}
            size="sm"
            aria-label={`测试进度：${currentIndex + 1}/${totalQuestions}`}
          />
        </div>

        {/* Question card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <p className="text-base text-gray-900 dark:text-white leading-relaxed mb-6">
            {currentQuestion.text}
          </p>

          {/* Options */}
          <div className="flex flex-col gap-3">
            {currentQuestion.options.map((opt, idx) => {
              const selected = answers[currentQuestion.id] === idx;
              return (
                <button
                  key={idx}
                  onClick={() => handleOptionSelect(idx)}
                  aria-pressed={selected}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-150 text-sm leading-relaxed cursor-pointer
                    ${selected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/30'
                      : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                >
                  <span className="inline-block w-6 h-6 rounded-full border-2 mr-3 text-center text-xs leading-5 align-middle
                    ${selected
                      ? 'border-blue-500 bg-blue-500 text-white'
                      : 'border-gray-300 dark:border-gray-500'
                    }"
                  >
                    {selected ? '✓' : String.fromCharCode(65 + idx)}
                  </span>
                  {opt.text}
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={goPrev}
            disabled={currentIndex === 0}
            className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 disabled:opacity-30 cursor-pointer disabled:cursor-default hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            ← 上一题
          </button>

          {/* Dot indicators */}
          <div className="flex gap-1.5">
            {questions.map((q, idx) => {
              const answered = answers[q.id] !== undefined;
              const current = idx === currentIndex;
              return (
                <button
                  key={q.id}
                  onClick={() => goTo(idx)}
                  className={`w-2 h-2 rounded-full transition-all cursor-pointer
                    ${current ? 'w-4 bg-blue-500' : ''}
                    ${!current && answered ? 'bg-green-400' : ''}
                    ${!current && !answered ? 'bg-gray-300 dark:bg-gray-600' : ''}
                  `}
                  aria-label={`跳转到第 ${idx + 1} 题`}
                />
              );
            })}
          </div>

          {isLast ? (
            <button
              onClick={handleSubmit}
              disabled={!allAnswered}
              className="px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              查看结果
            </button>
          ) : (
            <button
              onClick={goNext}
              disabled={!isAnswered}
              className="px-4 py-2 text-sm text-blue-600 dark:text-blue-400 disabled:opacity-30 cursor-pointer disabled:cursor-default hover:text-blue-700 transition-colors"
            >
              下一题 →
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

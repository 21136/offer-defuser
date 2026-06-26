import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useShareUrl } from '../hooks/useShareUrl';
import { useTestStore } from '../stores/testStore';
import { useAppStore } from '../stores/appStore';
import { encodeShareUrl, paramsToVector } from '../utils/shareUrl';
import { getDisplayName } from '../utils/displayName';
import { track } from '../utils/tracker';
import { RadarChart } from '../components/RadarChart';
import { ShareCanvas } from '../components/ShareCanvas';
import type { Persona } from '../models/persona';
import type { ScoreVector } from '../models/score';

interface ResultPageProps {
  personas: Persona[];
}

export default function ResultPage({ personas }: ResultPageProps) {
  const navigate = useNavigate();
  const shareParams = useShareUrl();
  const storeMatch = useTestStore((s) => s.personaMatch);
  const storeVector = useTestStore((s) => s.scoreVector);
  const toneMode = useAppStore((s) => s.toneMode);

  const [loading, setLoading] = useState(true);
  const [matchedPersona, setMatchedPersona] = useState<Persona | null>(null);
  const [userVector, setUserVector] = useState<ScoreVector | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    track('page_view', { page: 'result' });
  }, []);

  useEffect(() => {
    // Priority: URL share params > store (from just-completed test) > redirect
    if (shareParams) {
      // From shared URL — sync tone mode if specified
      if (shareParams.tone) {
        useAppStore.getState().setToneMode(shareParams.tone);
      }
      const found = personas.find((p) => p.id === shareParams.p);
      if (found) {
        setMatchedPersona(found);
        if (shareParams.v) {
          setUserVector(paramsToVector(shareParams.v));
        }
      } else {
        // Invalid personaId → redirect home
        navigate('/', { replace: true });
        return;
      }
    } else if (storeMatch) {
      // Just completed the test
      setMatchedPersona(storeMatch.persona);
      setUserVector(storeVector);
    } else {
      // No data at all → redirect home
      navigate('/', { replace: true });
      return;
    }
    setLoading(false);
  }, [shareParams, storeMatch, storeVector, personas, navigate]);

  const handleCopyLink = async () => {
    if (!matchedPersona) return;
    const url = `${window.location.origin}${encodeShareUrl(matchedPersona.id, userVector ?? undefined)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      track('link_copy', { personaId: matchedPersona.id });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for non-HTTPS
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      track('link_copy', { personaId: matchedPersona.id });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 animate-pulse">加载结果中...</p>
      </div>
    );
  }

  if (!matchedPersona) {
    return null;
  }

  const isOwnResult = storeMatch?.persona.id === matchedPersona.id;

  return (
    <main id="main-content" className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-8">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-sm text-gray-400 mb-2">你的求职内耗人格</p>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {getDisplayName(matchedPersona, toneMode)}
          </h1>
          {/* Tone toggle */}
          <button
            onClick={() =>
              useAppStore.getState().setToneMode(toneMode === 'fun' ? 'formal' : 'fun')
            }
            className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-blue-500 transition-colors mt-1 cursor-pointer"
            aria-label={toneMode === 'fun' ? '切换为中性别名' : '切换为梗名'}
          >
            {toneMode === 'fun' ? '📛 中性别名' : '🎭 梗名模式'}
          </button>
          <div className="flex flex-wrap justify-center gap-2">
            {matchedPersona.tags.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Match scores (Top-2 independent) */}
        {storeMatch && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 mb-6">
            <p className="text-xs text-gray-400 mb-3">人格匹配度</p>
            {/* Primary match */}
            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{getDisplayName(storeMatch.persona, toneMode)}</span>
                <span className="font-semibold text-blue-600">{storeMatch.similarity}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  role="progressbar"
                  aria-valuenow={storeMatch.similarity}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${storeMatch.persona.name} 匹配度 ${storeMatch.similarity}%`}
                  style={{ width: `${storeMatch.similarity}%` }}
                />
              </div>
            </div>
            {/* Secondary match */}
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{getDisplayName(storeMatch.subPersona, toneMode)}</span>
                <span className="font-semibold text-gray-500">{storeMatch.subSimilarity}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                <div
                  className="h-full bg-gray-400 dark:bg-gray-500 rounded-full transition-all"
                  role="progressbar"
                  aria-valuenow={storeMatch.subSimilarity}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${storeMatch.subPersona.name} 匹配度 ${storeMatch.subSimilarity}%`}
                  style={{ width: `${storeMatch.subSimilarity}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Radar chart */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 mb-6">
          <p className="text-xs text-gray-400 mb-3">四维雷达图</p>
          {userVector ? (
            <RadarChart
              userVector={userVector}
              personaVector={matchedPersona.vector}
              size={280}
            />
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400 dark:text-gray-500 text-sm">
              好友未分享雷达数据，完成测试后可查看完整雷达图
            </div>
          )}
        </div>

        {/* Personality details */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 mb-6 space-y-4">
          <div>
            <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
              📖 人格解读
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              {matchedPersona.description}
            </p>
          </div>
          <div>
            <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
              💪 优势
            </h2>
            <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-0.5">
              {matchedPersona.strengths.map((s, i) => (
                <li key={i}>• {s}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
              ⚡ 短板
            </h2>
            <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-0.5">
              {matchedPersona.weaknesses.map((w, i) => (
                <li key={i}>• {w}</li>
              ))}
            </ul>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              💡 {matchedPersona.advice}
            </p>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-3">
          <Link
            to={`/defuser?persona=${matchedPersona.id}`}
            className="w-full py-3 bg-blue-600 text-white text-center rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            🔧 用这个人格拆解我的 Offer
          </Link>

          <button
            onClick={handleCopyLink}
            className="w-full py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            {copied ? '✅ 已复制链接' : '📋 复制结果链接'}
          </button>

          {/* Poster CTA */}
          <div className="flex justify-center pt-2">
            <ShareCanvas
              type="result"
              persona={matchedPersona}
              vector={userVector ?? undefined}
              similarity={storeMatch?.similarity}
            />
          </div>

          <button
            onClick={() => {
              useTestStore.getState().resetTest();
              navigate('/test');
            }}
            className="w-full py-3 text-gray-400 text-sm hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
          >
            重新测试
          </button>
        </div>

        {/* Share hint */}
        {!isOwnResult && (
          <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl text-center">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              📤 好友分享了这份结果给你。测测你自己的 →
              <Link to="/test" className="underline ml-1 font-medium">
                开始测试
              </Link>
            </p>
          </div>
        )}

        {/* Disclaimer */}
        <p className="mt-8 text-xs text-gray-300 dark:text-gray-600 text-center">
          ⚠️ 本测试基于娱乐化模型，仅供求职心态自嘲与参考，不构成心理或职业咨询。
        </p>
      </div>
    </main>
  );
}

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Question } from '../models/question';
import type { ScoreVector } from '../models/score';
import type { PersonaMatch } from '../models/persona';
import type { AnswerRecord } from '../services/scoreCalculator';
import { calcScores } from '../services/scoreCalculator';
import { matchPersona } from '../services/personaMatcher';
import { storage } from '../utils/storage';
import { track } from '../utils/tracker';

export type TestStatus = 'idle' | 'in-progress' | 'completed';

interface TestState {
  /** 全部 12 道题 */
  questions: Question[];
  /** 当前题目索引 (0-11) */
  currentIndex: number;
  /** 答题记录 */
  answers: AnswerRecord;
  /** 归一化后的用户四维向量 */
  scoreVector: ScoreVector | null;
  /** 人格匹配结果 */
  personaMatch: PersonaMatch | null;
  /** 测试状态 */
  status: TestStatus;
}

interface TestActions {
  /** 加载题目数据 */
  loadQuestions: (questions: Question[]) => void;
  /** 选中一个选项 */
  answerQuestion: (questionId: number, optionIndex: number) => void;
  /** 下一题 */
  goNext: () => void;
  /** 上一题 */
  goPrev: () => void;
  /** 跳转到指定题 */
  goTo: (index: number) => void;
  /** 提交测试，计算分数并匹配人格 */
  submitTest: (personas: import('../models/persona').Persona[]) => void;
  /** 重置测试 */
  resetTest: () => void;
  /** 从 localStorage 恢复完成的测试结果 */
  hydrateFromStorage: (personas: import('../models/persona').Persona[]) => void;
  /** 从 localStorage 恢复进行中的测试进度 */
  hydrateProgress: () => void;
}

export const useTestStore = create<TestState & TestActions>()(
  immer((set, get) => ({
    // --- State ---
    questions: [],
    currentIndex: 0,
    answers: {},
    scoreVector: null,
    personaMatch: null,
    status: 'idle',

    // --- Actions ---
    loadQuestions: (questions) =>
      set((s) => {
        s.questions = questions;
      }),

    answerQuestion: (questionId, optionIndex) =>
      set((s) => {
        s.answers[questionId] = optionIndex;
        // Status transitions to in-progress on first answer
        if (s.status === 'idle') {
          s.status = 'in-progress';
        }
      }),

    goNext: () =>
      set((s) => {
        if (s.currentIndex < s.questions.length - 1) {
          s.currentIndex += 1;
        }
      }),

    goPrev: () =>
      set((s) => {
        if (s.currentIndex > 0) {
          s.currentIndex -= 1;
        }
      }),

    goTo: (index) =>
      set((s) => {
        if (index >= 0 && index < s.questions.length) {
          s.currentIndex = index;
        }
      }),

    submitTest: (personas) => {
      const { questions, answers } = get();
      const scoreVector = calcScores(questions, answers);
      const personaMatch = matchPersona(scoreVector, personas);

      // 持久化
      storage.set(storage.keys.scoreVector, scoreVector);
      storage.set(storage.keys.personaId, personaMatch.persona.id);

      // 保存测试历史
      const history = storage.get<
        Array<{ date: string; personaId: string; vector: ScoreVector }>
      >(storage.keys.testHistory) ?? [];
      history.push({
        date: new Date().toISOString(),
        personaId: personaMatch.persona.id,
        vector: scoreVector,
      });
      storage.set(storage.keys.testHistory, history.slice(-20)); // 保留最近 20 条

      track('test_complete', {
        personaId: personaMatch.persona.id,
        similarity: String(personaMatch.similarity),
      });

      // Clear test progress from storage (test is done)
      storage.remove(storage.keys.testProgress);

      set((s) => {
        s.scoreVector = scoreVector;
        s.personaMatch = personaMatch;
        s.status = 'completed';
      });
    },

    resetTest: () => {
      storage.remove(storage.keys.testProgress);
      set((s) => {
        s.currentIndex = 0;
        s.answers = {};
        s.scoreVector = null;
        s.personaMatch = null;
        s.status = 'idle';
      });
    },

    hydrateFromStorage: (personas) => {
      const savedPersonaId = storage.get<string>(storage.keys.personaId);
      const savedVector =
        storage.get<ScoreVector>(storage.keys.scoreVector);

      if (savedPersonaId && savedVector && personas.length > 0) {
        const match = matchPersona(savedVector, personas);
        set((s) => {
          s.scoreVector = savedVector;
          s.personaMatch = match;
          s.status = 'completed';
        });
      }
    },

    hydrateProgress: () => {
      const saved = storage.get<{
        answers: Record<number, number>;
        currentIndex: number;
      }>(storage.keys.testProgress);

      if (saved && Object.keys(saved.answers).length > 0) {
        set((s) => {
          s.answers = saved.answers;
          s.currentIndex = saved.currentIndex;
          s.status = 'in-progress';
        });
      }
    },
  })),
);

// Auto-persist test progress when test is in progress
useTestStore.subscribe((state, prevState) => {
  if (state.status === 'in-progress') {
    const progress = {
      answers: state.answers,
      currentIndex: state.currentIndex,
    };
    const prevProgress = prevState.status === 'in-progress'
      ? { answers: prevState.answers, currentIndex: prevState.currentIndex }
      : null;

    // Only persist if progress actually changed
    if (
      !prevProgress ||
      JSON.stringify(progress) !== JSON.stringify(prevProgress)
    ) {
      storage.set(storage.keys.testProgress, progress);
    }
  }
});

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { PersonaId } from '../models/persona';
import type { JobCategory, DefusePlan, StepLibrary } from '../models/step';
import { generatePlan, rerollStep } from '../services/stepGenerator';
import { storage } from '../utils/storage';
import { track } from '../utils/tracker';

/** 未测试用户的默认人格 */
export const DEFAULT_PERSONA_ID: PersonaId = 'resume-anxious';

export type DefuserStatus = 'idle' | 'generating' | 'ready';
export type StyleMode = 'casual' | 'serious';

interface DefuserState {
  /** 表单输入 */
  jobName: string;
  deadline: string;
  category: JobCategory;
  /** 关联人格 ID */
  personaId: PersonaId;
  personaName: string;
  /** 文案风格 P2 */
  styleMode: StyleMode;
  /** 当前生成的方案 */
  currentPlan: DefusePlan | null;
  /** 历史方案列表 */
  planHistory: DefusePlan[];
  /** 状态 */
  status: DefuserStatus;
  /** 步骤库（懒加载后注入） */
  stepLibrary: StepLibrary | null;
}

interface DefuserActions {
  setJobInfo: (jobName: string, deadline: string, category: JobCategory) => void;
  setPersona: (personaId: PersonaId, personaName: string) => void;
  setStyleMode: (mode: StyleMode) => void;
  loadStepLibrary: (library: StepLibrary) => void;
  doGenerate: () => void;
  doRerollStep: (stepPosition: number) => void;
  loadHistory: () => void;
  hydrateForm: () => void;
  resetDefuser: () => void;
}

export const useDefuserStore = create<DefuserState & DefuserActions>()(
  immer((set, get) => ({
    // --- State ---
    jobName: '',
    deadline: '',
    category: 'general',
    personaId: DEFAULT_PERSONA_ID,
    personaName: '简历空白焦虑者',
    styleMode: 'casual',
    currentPlan: null,
    planHistory: [],
    status: 'idle',
    stepLibrary: null,

    // --- Actions ---
    setJobInfo: (jobName, deadline, category) => {
      // Persist form fields so they survive refresh
      storage.set(storage.keys.defuserForm, { jobName, deadline, category });
      set((s) => {
        s.jobName = jobName;
        s.deadline = deadline;
        s.category = category;
      });
    },

    setPersona: (personaId, personaName) =>
      set((s) => {
        s.personaId = personaId;
        s.personaName = personaName;
      }),

    setStyleMode: (mode) =>
      set((s) => {
        s.styleMode = mode;
      }),

    loadStepLibrary: (library) =>
      set((s) => {
        s.stepLibrary = library;
      }),

    doGenerate: () => {
      const { personaId, personaName, category, jobName, deadline, stepLibrary, styleMode } =
        get();

      if (!stepLibrary) {
        console.warn('Step library not loaded');
        return;
      }

      if (!jobName.trim() || !deadline) {
        return;
      }

      const plan = generatePlan({
        personaId,
        personaName,
        category,
        jobName: jobName.trim(),
        deadline,
        stepLibrary,
        styleMode,
      });

      // 持久化
      const history = storage.get<DefusePlan[]>(storage.keys.defuseHistory) ?? [];
      history.push(plan);
      storage.set(storage.keys.defuseHistory, history.slice(-20));

      track('defuse_generate', {
        personaId,
        category,
        daysLeft: String(plan.daysLeft),
      });

      // Clear persisted form after successful generation
      storage.remove(storage.keys.defuserForm);

      set((s) => {
        s.currentPlan = plan;
        s.planHistory = history.slice(-20);
        s.status = 'ready';
      });
    },

    doRerollStep: (stepPosition) => {
      const { currentPlan, stepLibrary, personaName, personaId, styleMode } = get();
      if (!currentPlan || !stepLibrary) return;

      const templates = stepLibrary.personas[personaId];
      if (!templates) return;

      // Apply style filter to templates for reroll
      const filteredTemplates = styleMode
        ? templates.map((t) => ({
            ...t,
            options:
              t.options.filter((o) => o.style === styleMode).length > 0
                ? t.options.filter((o) => o.style === styleMode)
                : t.options,
          }))
        : templates;

      const updated = rerollStep(
        currentPlan,
        stepPosition,
        filteredTemplates,
        personaName,
      );

      track('step_reroll', {
        personaId,
        stepPosition: String(stepPosition),
      });

      set((s) => {
        s.currentPlan = updated;
      });
    },

    loadHistory: () => {
      const history = storage.get<DefusePlan[]>(storage.keys.defuseHistory) ?? [];
      set((s) => {
        s.planHistory = history;
      });
    },

    hydrateForm: () => {
      const saved = storage.get<{
        jobName: string;
        deadline: string;
        category: JobCategory;
      }>(storage.keys.defuserForm);
      if (saved) {
        set((s) => {
          s.jobName = saved.jobName ?? '';
          s.deadline = saved.deadline ?? '';
          s.category = saved.category ?? 'general';
        });
      }
    },

    resetDefuser: () => {
      storage.remove(storage.keys.defuserForm);
      set((s) => {
        s.jobName = '';
        s.deadline = '';
        s.category = 'general';
        s.currentPlan = null;
        s.status = 'idle';
      });
    },
  })),
);

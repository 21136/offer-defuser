/**
 * 步骤文案生成脚本 — 正式版
 *
 * 内嵌 16 人格语气画像 + 8 槽位语义模板 + 句式轮转机制，
 * 生成 16×8×7=896 条/场景 → frontend.json + general.json
 *
 * 运行: npx tsx scripts/generateStepContent.ts
 * 验证: npm run validate:content
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ──────────────────────────────────────
// 一、配置文件
// ──────────────────────────────────────

const PERSONA_IDS = [
  'mass-applyer', 'resume-anxious', 'jd-perfectionist',
  'ddl-sprinter', 'big-firm-only', 'broad-net',
  'over-preparer', 'zen-master', 'project-refactorer',
  'intern-only', 'emo-recoverer', 'long-planner',
  'resume-edit-loop', 'cross-field-rookie', 'written-test-king',
  'offer-hesitator',
] as const;

type PersonaId = typeof PERSONA_IDS[number];

const WEIGHTS = [10, 9, 8, 7, 5, 3, 2] as const;

interface StepOption { text: string; weight: number }
interface StepTemplate { position: number; title: string; options: StepOption[] }

interface SlotDef {
  position: number;
  title: string;
  /** 按 category 覆写标题 */
  titleOverrides?: Partial<Record<string, string>>;
}

const SLOTS: SlotDef[] = [
  { position: 1, title: '搞清门槛' },
  { position: 2, title: '改简历' },
  { position: 3, title: '去投递' },
  { position: 4, title: '笔试准备', titleOverrides: { frontend: '前端笔试准备', 'state-owned': '行测/申论准备' } },
  { position: 5, title: '面试准备', titleOverrides: { 'state-owned': '结构化面试准备' } },
  { position: 6, title: '模拟练习', titleOverrides: { 'state-owned': '群面模拟' } },
  { position: 7, title: '跟进复盘' },
  { position: 8, title: '心态复位' },
];

// ──────────────────────────────────────
// 二、16 人格语气画像
// ──────────────────────────────────────

interface VoiceProfile {
  /** 语气标签 */
  label: string;
  /** 句首高频词 */
  openers: string[];
  /** 句中连接词 */
  connectors: string[];
  /** 句尾收束词 */
  closers: string[];
  /** 态度倾向：对"准备"的态度 */
  prepAttitude: 'rush' | 'calm' | 'thorough' | 'minimal';
  /** 紧迫感级别 1-5 */
  urgency: number;
}

const VOICES: Record<PersonaId, VoiceProfile> = {
  'mass-applyer': {
    label: '随性洒脱', openers: ['打开', '扫一眼', '看看', '瞅瞅'],
    connectors: ['就行', '就够了', '管他呢'], closers: ['冲！', '投就完了', '洒洒水啦'],
    prepAttitude: 'minimal', urgency: 1,
  },
  'resume-anxious': {
    label: '温柔鼓励', openers: ['别怕，', '其实你', '你已经', '相信我，'],
    connectors: ['就够了', '完全可以', '已经不错了'], closers: ['先试试看', '你可以的', '没问题的'],
    prepAttitude: 'calm', urgency: 2,
  },
  'jd-perfectionist': {
    label: '精准克制', openers: ['核对', '检查', '确认', '评估'],
    connectors: ['60%就够', '不需要满分', '已经达标'], closers: ['够了', '可以停了', '不用再对'],
    prepAttitude: 'thorough', urgency: 3,
  },
  'ddl-sprinter': {
    label: '紧迫直接', openers: ['现在！', '立刻', '别等了，', '还剩'],
    connectors: ['马上', '今天就', '别磨叽'], closers: ['赶紧的', '时间不多了', 'GOGOGO'],
    prepAttitude: 'rush', urgency: 5,
  },
  'big-firm-only': {
    label: '野心务实', openers: ['冲大厂', '瞄准', '对标', '锁定'],
    connectors: ['但也', '同时', '备一手'], closers: ['没错的', '值得的', '就这么定了'],
    prepAttitude: 'thorough', urgency: 4,
  },
  'broad-net': {
    label: '轻松佛系', openers: ['试试', '看看', '试试看', '随便'],
    connectors: ['不亏', '顺便', '也行'], closers: ['挺好的', '无所谓啦', '都行'],
    prepAttitude: 'minimal', urgency: 2,
  },
  'over-preparer': {
    label: '安抚减负', openers: ['其实够了', '放轻松，', '不需要', '你准备的'],
    connectors: ['已经足够', '不必再', '简化到'], closers: ['可以放松了', '不用再准备了', '够了'],
    prepAttitude: 'calm', urgency: 2,
  },
  'zen-master': {
    label: '淡定从容', openers: ['稳住，', '记得', '别忘了', '按节奏'],
    connectors: ['自然而然', '水到渠成', '不急'], closers: ['就好', '随缘', '保持节奏'],
    prepAttitude: 'calm', urgency: 1,
  },
  'project-refactorer': {
    label: '果断打破', openers: ['够了！', '今天就', '别再改了，', '现在'],
    connectors: ['直接', '就这版', '别再优化'], closers: ['投！', '够了', '别再重构了'],
    prepAttitude: 'rush', urgency: 5,
  },
  'intern-only': {
    label: '策略提醒', openers: ['同步', '顺便', '也看看', '除了实习'],
    connectors: ['同时', '也准备', 'Plan B'], closers: ['多条路', '保险一点', '不吃亏'],
    prepAttitude: 'calm', urgency: 3,
  },
  'emo-recoverer': {
    label: '温暖托底', openers: ['没事的，', '正常，', '都会好，', '这次'],
    connectors: ['很正常', '都会过去', '不代表'], closers: ['下次会更好', '你已经很棒了', '没关系的'],
    prepAttitude: 'calm', urgency: 1,
  },
  'long-planner': {
    label: '系统条理', openers: ['第1步', '按计划', '预留', '先列出'],
    connectors: ['按节奏', '分阶段', '里程碑'], closers: ['按计划推进', '节奏稳', '一切可控'],
    prepAttitude: 'thorough', urgency: 2,
  },
  'resume-edit-loop': {
    label: '打断仪式', openers: ['现在！', '关掉文档！', '就这版，', '别再改了，'],
    connectors: ['就是', '直接', '这一版'], closers: ['投出去！', '别再动了', '立刻发'],
    prepAttitude: 'rush', urgency: 5,
  },
  'cross-field-rookie': {
    label: '清晰指引', openers: ['先选方向', '从', '第一步是', '别慌，'],
    connectors: ['开始学', '入门就够了', '不用全会'], closers: ['一步一步来', '慢慢就懂了', '方向对了就行'],
    prepAttitude: 'calm', urgency: 2,
  },
  'written-test-king': {
    label: '补弱推荐', openers: ['说出来', '录音', '模拟', '开口'],
    connectors: ['而不是', '不只是', '更重要的是'], closers: ['练表达！', '别光做题', '说出口才算'],
    prepAttitude: 'thorough', urgency: 3,
  },
  'offer-hesitator': {
    label: '决策推动', openers: ['列出来', '设个期限', '选一个，', '对比'],
    connectors: ['选了就', '定了就', '比来比去不如'], closers: ['决定了就别回头', '定了就是最好的', '选了就不纠结'],
    prepAttitude: 'calm', urgency: 4,
  },
};

// ──────────────────────────────────────
// 三、槽位 × 人格文案矩阵
// ──────────────────────────────────────
// 每个槽位定义 7 个"角度骨架"，分别对应 7 个权重。
// 每个角度是一个函数，接收 (personaId, voice, category) 返回填入变量和语气的文案。

type OptionFn = (pid: PersonaId, v: VoiceProfile, cat: string) => string;

// ---------- 槽位 1：搞清门槛 ----------
function slot1Options(pid: PersonaId, v: VoiceProfile, cat: string): string[] {
  const j = '{{jobName}}'; const d = '{{daysLeft}}'; const p = '{{personaName}}';

  // 权重 10: 直接拆解 JD — 默认首推
  const w10_map: Record<string, string> = {
    'mass-applyer': `${v.openers[0]}${j}的JD${v.connectors[0]}，圈出【必须】那栏${v.closers[0]}`,
    'resume-anxious': `${v.openers[0]}${j}的JD没你想的那么可怕，先圈出你已经会的部分`,
    'jd-perfectionist': `${v.openers[0]}${j}的JD，mark出「必须」和「加分」，match超过一半就够`,
    'ddl-sprinter': `${v.openers[2]}先花3分钟扫完${j}的JD，标出硬性条件，${v.closers[0]}`,
    'big-firm-only': `${v.openers[1]}${j}的JD，对标他们的技术要求，拉一张差距清单`,
    'broad-net': `${v.openers[0]}${j}的要求，大概知道要啥${v.connectors[2]}`,
    'over-preparer': `${v.openers[0]}把${j}的JD拆开看，你会发现大部分要求你其实都满足`,
    'zen-master': `${v.openers[0]}打开${j}的JD，别急着焦虑${v.closers[0]}`,
    'project-refactorer': `${v.openers[0]}打开${j}的JD，只看【必须具备】那几行，别纠结加分项`,
    'intern-only': `${v.openers[0]}看一下${j}的JD，对比你现在实习做的内容，找出重叠部分`,
    'emo-recoverer': `${v.openers[0]}${j}的JD只是一个愿望清单，不是及格线`,
    'long-planner': `${v.openers[0]}：拆解${j}的JD，用表格列出硬性条件 vs 加分项`,
    'resume-edit-loop': `${v.openers[0]}打开${j}的JD，只读一遍，不许反复揣摩`,
    'cross-field-rookie': `${v.openers[0]}${j}的JD中你认识的技术名词，标出来，那就是你可以投的方向`,
    'written-test-king': `先别刷题，打开${j}的JD搞清楚人家到底考什么方向`,
    'offer-hesitator': `${v.openers[0]}${j}和你在犹豫的其他岗位的核心差异，列张表`,
  };

  // 权重 9: 换个角度 — 反向思维
  const w9_map: Record<string, string> = {
    'mass-applyer': `别研究太细，知道${j}是前端还是后端就够投了`,
    'resume-anxious': `其实你已经具备${j}要求的至少一半技能，先相信自己`,
    'jd-perfectionist': `${j}的JD写了10条要求，一般满足5条就可以投了`,
    'ddl-sprinter': `${j}的JD别全读！先看title和地点，匹配就进下一步`,
    'big-firm-only': `别光看${j}的要求，也看看你自己的履历和这个岗位的契合点`,
    'broad-net': `${j}看不懂也没关系，投了再说，面试官会告诉你适不适合`,
    'over-preparer': `${j}的要求里，「加分项」那部分真的只是加分，不是必须`,
    'zen-master': `扫一眼${j}的JD，心里有个数就行，不用逐字分析`,
    'project-refactorer': `${j}的JD写得花里胡哨，其实核心就那两三条技术栈`,
    'intern-only': `${j}的JD和你的实习岗可能不一样，找出差异点再判断要不要投`,
    'emo-recoverer': `把${j}的JD翻到最下面，「加分项」可以先不看的`,
    'long-planner': `${j}的JD如果太模糊，直接搜同岗位其他公司的JD交叉参考`,
    'resume-edit-loop': `看一眼${j}的JD马上关掉，凭记忆说出3个核心要求就够了`,
    'cross-field-rookie': `${j}的JD里你完全不会的东西先忽略，重点是你会的那部分够不够60%`,
    'written-test-king': `${j}的JD里提到的算法和框架才是笔试重点，别刷偏了`,
    'offer-hesitator': `别把${j}的JD当成终极标准——它也是HR写的，不一定准`,
  };

  // 权重 8: 量化/步骤化
  const w8_map: Record<string, string> = {
    'mass-applyer': `花5分钟给${j}打个分：薪资、距离、技术栈，过线就投`,
    'resume-anxious': `把${j}的要求分成「已经会」「快会了」「还不会」三栏，你已经会的那栏一定不短`,
    'jd-perfectionist': `给${j}的每条要求打匹配度分（1-5分），平均3分就可以投`,
    'ddl-sprinter': `${d}天倒计时：今天只做一件事——搞清楚${j}到底要什么`,
    'big-firm-only': `${j}的技术栈和你简历的重合度如果超过70%，这就是你的目标岗`,
    'broad-net': `扫一遍${j}，看看有没有你完全不能接受的点（比如城市/薪资），没有就过`,
    'over-preparer': `用「已满足」「学习后可满足」两栏整理${j}的要求，你会发现第一栏已经很满`,
    'zen-master': `花两分钟看完${j}的JD，然后关掉，别反复看`,
    'project-refactorer': `给${j}画个重点：只圈技术栈关键词，其余都是废话`,
    'intern-only': `对比${j}和你实习内容的匹配度，匹配超过60%就重点准备`,
    'emo-recoverer': `找一张纸，把${j}让你担心的点和让你有信心的点各列3个`,
    'long-planner': `用Excel列出${j}的硬性条件，已完成项打勾，待补项标注时间`,
    'resume-edit-loop': `设一个5分钟闹钟，时间到了就停止看${j}的JD`,
    'cross-field-rookie': `把${j}的技术要求分三类：你会的、你学过的、完全陌生的，先看比例`,
    'written-test-king': `拆${j}的JD，找出笔试最可能考的核心知识点，列3个重点`,
    'offer-hesitator': `给${j}打分：成长空间/薪资/团队氛围/城市，看看总分vs你手里的offer`,
  };

  // 权重 7: 社会/对比视角
  const w7_map: Record<string, string> = {
    'mass-applyer': `问一个投过类似岗位的朋友${j}大概什么难度，比自己猜快多了`,
    'resume-anxious': `你知道吗，大部分投${j}的人也只满足60%-70%的要求`,
    'jd-perfectionist': `${v.openers[0]}一下${j}所在公司的技术博客，比JD更能说明真实需求`,
    'ddl-sprinter': `别一个人琢磨${j}了，找个内推人问一句比你看10遍JD强`,
    'big-firm-only': `搜一下${j}团队的面经，了解实际工作内容往往和JD写的不一样`,
    'broad-net': `类似${j}的岗位肯定还很多，这个只是第一个，别紧张`,
    'over-preparer': `你的同学投${j}之前准备的可能还没你一半多，他们也投了`,
    'zen-master': `看一眼${j}的发布日期，如果是两周前发的就别太纠结细节了`,
    'project-refactorer': `别人看${j}花2分钟决定投不投，你花2小时——没必要`,
    'intern-only': `问问你的实习mentor怎么看${j}这样的岗位，他们视角和你不一样`,
    'emo-recoverer': `投了${j}的人里面，至少一半和你一样忐忑，你不是一个人`,
    'long-planner': `把${j}发给一个信任的前辈看一眼，外部视角往往能看出你忽略的点`,
    'resume-edit-loop': `把${j}发给朋友，让他们30秒内告诉你这个岗位要什么`,
    'cross-field-rookie': `找个已经在做${j}方向的人聊聊，比你自己研究一周都有用`,
    'written-test-king': `去牛客/力扣搜一下${j}公司的笔试经验，比盲目刷题高效`,
    'offer-hesitator': `拿${j}的条件和你手上offer的条件做一张对比表，差距一目了然`,
  };

  // 权重 5: 最小行动
  const w5_map: Record<string, string> = {
    'mass-applyer': `打开${j}的页面就算完成第一步了，剩下的明天再说也行`,
    'resume-anxious': `今天就做一件事：把${j}的JD复制到备忘录，highlight你已经会的`,
    'jd-perfectionist': `只看${j}的「岗位职责」那一段，其他先不管`,
    'ddl-sprinter': `${j}的最晚投递日期记到手机日历里，设提前3天的提醒`,
    'big-firm-only': `在LinkedIn上搜一下${j}这个岗位的在职员工，看看他们的背景`,
    'broad-net': `在手机上打开${j}的页面，截个图存下来就算第一步完成了`,
    'over-preparer': `${v.openers[0]}${j}的JD不用全读完，看到「任职要求」就够了`,
    'zen-master': `把${j}的链接存到书签，今天的事就是打开它`,
    'project-refactorer': `看一眼${j}的薪资范围，如果能接受就去投`,
    'intern-only': `把${j}和你实习岗位的JD并排截图，看看差异`,
    'emo-recoverer': `打开${j}的页面，深呼吸三次，然后关掉，明天再看`,
    'long-planner': `在日历上标记${j}的截止日期，倒推你的准备时间节点`,
    'resume-edit-loop': `把${j}的链接复制下来，粘贴到聊天框发给明天的自己`,
    'cross-field-rookie': `在B站/知乎搜一下${j}这个方向的新手入门，先了解大框架`,
    'written-test-king': `搜一下${j}公司近期的笔试真题回忆，感受一下难度`,
    'offer-hesitator': `想一想${j}这个岗位一年后能带给你什么，而不是只看现在`,
  };

  // 权重 3: 小众/极端场景
  const w3_map: Record<string, string> = {
    'mass-applyer': `花1分钟决定投不投${j}，超过1分钟就是在浪费时间`,
    'resume-anxious': `${j}可能不是你最理想的岗位，但作为练手投递非常合适`,
    'jd-perfectionist': `${j}如果每条你都满足，说明这个岗位对你来说太简单了`,
    'ddl-sprinter': `如果${j}明天截止，你现在要做的事情和今天一样——搞清楚要什么`,
    'big-firm-only': `${j}不是唯一的大厂，但先把它当作你的对标目标来拆`,
    'broad-net': `${j}可能不是你最终的选择，但投了不亏，面了更不亏`,
    'over-preparer': `如果${j}明天就要面试，你觉得自己哪里最不够？只补那一块`,
    'zen-master': `${j}这个岗位可能过两天还有新的放出来，不急这一刻`,
    'project-refactorer': `不要对比${j}的要求和你的项目——对比你的项目和别人的项目`,
    'intern-only': `如果实习转正失败，${j}这样的岗位就是你的Plan B里面最像的一个`,
    'emo-recoverer': `假设${j}已经拒了你（当然还没），现在的你还想投吗？`,
    'long-planner': `${j}可能在你投递时已经招到人了，所以要快但不要慌`,
    'resume-edit-loop': `把${j}的JD打印出来（或者截图设成壁纸），强迫自己盯着看到麻木`,
    'cross-field-rookie': `${j}这个方向可能不是你最终方向，但它帮你打开一扇门`,
    'written-test-king': `${j}的笔试大概率不需要你把所有题都做对，过线就行`,
    'offer-hesitator': `假设${j}的Offer明天必须答复，你选它还是选手上那个？`,
  };

  // 权重 2: 彩蛋 — 最有梗的
  const w2_map: Record<string, string> = {
    'mass-applyer': `${p}，看JD的正确姿势：Ctrl+F搜「必须」两个字，其他当BGM`,
    'resume-anxious': `${p}，JD不是考试大纲，是HR的许愿清单——许愿嘛，不一定全实现`,
    'jd-perfectionist': `${p}，JD上面10条要求，面试官自己可能只记得3条`,
    'ddl-sprinter': `${p}，别在JD上浪费${d}天——你只有${d}天了！`,
    'big-firm-only': `${p}，大厂的JD往往写得最虚，实际工作才是真面目`,
    'broad-net': `${p}，看完JD不焦虑的算你赢——但焦虑完记得投`,
    'over-preparer': `${p}，JD上的「精通」可能只是「用过」，别被形容词吓到`,
    'zen-master': `${p}，JD看完想喝茶就喝茶，想睡觉就睡觉——然后起来投`,
    'project-refactorer': `${p}，JD是别人写的需求文档，不用你重构，读就完了`,
    'intern-only': `${p}，实习的JD和正式岗的JD是两种文体，后者更水`,
    'emo-recoverer': `${p}，JD上没有写的是：他们也在等一个像你这样的人`,
    'long-planner': `${p}，把JD当项目需求文档读——你是PM，分析它而不是被它吓到`,
    'resume-edit-loop': `${p}，JD最多看三遍，超过三遍就是你自己在加戏了`,
    'cross-field-rookie': `${p}，JD对于转行的人来说是导航不是判决书`,
    'written-test-king': `${p}，笔试考的是题，JD写的是梦——先拆题，别看梦`,
    'offer-hesitator': `${p}，在JD上纠结的时间够你再面一轮了`,
  };

  return [
    w10_map[pid], w9_map[pid], w8_map[pid],
    w7_map[pid], w5_map[pid], w3_map[pid], w2_map[pid],
  ];
}

// ---------- 槽位 2：改简历 ----------
function slot2Options(pid: PersonaId, v: VoiceProfile, cat: string): string[] {
  const j = '{{jobName}}'; const d = '{{daysLeft}}'; const p = '{{personaName}}';

  const w10 = {
    'mass-applyer': `把简历上跟${j}最相关的3个关键词加粗，其他不改，5分钟搞定`,
    'resume-anxious': `你的简历比你以为的好，针对${j}微调2处就够了`,
    'jd-perfectionist': `对照${j}的JD，把简历里匹配的关键词对齐——只改措辞，不改内容`,
    'ddl-sprinter': `现在打开简历！把${j}相关的技能提到最前面，10分钟的事`,
    'big-firm-only': `把你的简历往${j}的大厂标准靠，突出项目中的leadership和技术决策`,
    'broad-net': `把简历标题改成「应聘${j}」，改一句话也算改，别纠结`,
    'over-preparer': `改简历前给自己一个硬限制：只改30分钟，超时就停`,
    'zen-master': `打开简历对照${j}的JD，只改最显眼的三行`,
    'project-refactorer': `别重构简历！拿现在的版本，只把${j}相关的技术栈往前放`,
    'intern-only': `在简历上加上你正在实习的经历，那是${j}最看重的`,
    'emo-recoverer': `你的简历上一份经历已经很好了，针对${j}改一句话就够`,
    'long-planner': `打开简历模板，按${j}的要求填「关键词匹配」那一栏`,
    'resume-edit-loop': `${v.openers[1]}你现在这版简历就是最终版，只允许改3个词`,
    'cross-field-rookie': `你的跨专业背景是优势——在简历里用一句话说明你为转${j}方向做了什么`,
    'written-test-king': `简历上突出你的笔试/算法能力，那是${j}筛简历时最能量化的`,
    'offer-hesitator': `针对${j}，在简历里强调你在类似规模公司的经验`,
  };

  const w9 = {
    'mass-applyer': `不用大改，把${j}的名字写在简历目标栏，匹配度瞬间+20%`,
    'resume-anxious': `你的项目经历里一定有和${j}沾边的，找到它然后highlight`,
    'jd-perfectionist': `简历不是自传，是${j}的匹配报告——只写相关经历`,
    'ddl-sprinter': `简历先改第一屏——个人信息和技能那栏，那是HR最先看的`,
    'big-firm-only': `把${j}公司的技术栈关键词埋到你的项目描述里`,
    'broad-net': `把上一份简历另存为新文件，文件名就叫「${j}版」，心理上就改完了`,
    'over-preparer': `你的简历已经比大部分人都好了，为${j}最多微调格式`,
    'zen-master': `简历这件事，你的版本已经够用，加一句「期待${j}的机会」就投`,
    'project-refactorer': `简历不是代码仓，不需要每个commit都记录——${j}只看最近最相关的`,
    'intern-only': `把你实习期间做的事量化（比如提升了X%），这些数字${j}的HR最爱看`,
    'emo-recoverer': `简历上你最近一段经历就够了，不需要把大学四年都写上去`,
    'long-planner': `定量化你的项目成果——${j}的HR扫简历第一眼看数字`,
    'resume-edit-loop': `把当前简历另存为PDF，文件名写「投${j}」，不许打开编辑器`,
    'cross-field-rookie': `用${j}这个方向的语言重新描述你原专业的项目，视角一转就通了`,
    'written-test-king': `简历里加一行你的LeetCode刷题量或竞赛成绩，${j}技术面会注意到`,
    'offer-hesitator': `把你在其他offer公司面试中展示过的亮点，也写到${j}的简历版本里`,
  };

  const w8 = {
    'mass-applyer': `打开${j}的JD另开一个窗口，对着JD把简历里的技能标签对齐`,
    'resume-anxious': `拿荧光笔标出简历里和${j}匹配的内容——标出来的部分比你想象的多`,
    'jd-perfectionist': `把${j}的JD要求和你的简历做逐行对照，匹配项用荧光笔标记`,
    'ddl-sprinter': `简历顶部加一句目标岗位：${j}。整份简历不用大动`,
    'big-firm-only': `你的项目描述改成STAR格式，${j}的面试官会顺着你的结构问`,
    'broad-net': `把技能栏里的关键词改成${j}JD里的说法，哪怕意思一样`,
    'over-preparer': `简历控制在1页以内，${j}的HR只有15秒看你的简历`,
    'zen-master': `检查一下简历里有没有错别字和日期错误，这是底线`,
    'project-refactorer': `把你做过的项目按照和${j}的相关度排序，最相关的放最上面`,
    'intern-only': `用STAR法则改写你的实习经历，${j}的面试官会被引导着问`,
    'emo-recoverer': `改简历之前先喝杯水，告诉自己：这份简历已经帮别人拿到过面试`,
    'long-planner': `用「动词+数字+结果」的格式改写每条项目经历，适配${j}`,
    'resume-edit-loop': `设一个15分钟计时器，到点必须存为PDF，不管改没改完`,
    'cross-field-rookie': `在简历里加一个「转行动机」相关的个人项目，证明你不是一时冲动`,
    'written-test-king': `简历的技能部分把算法/数据结构/系统设计分三行写，让${j}面试官一眼看到`,
    'offer-hesitator': `按${j}的岗位方向，把简历里最相关的2个经历放到第一页最上面`,
  };

  const w7 = {
    'mass-applyer': `找个人帮你扫一眼简历，外人3秒能看出的问题你自己看3天都看不出来`,
    'resume-anxious': `把简历发给一个你信任的人，问问「如果你是${j}的HR你会面试我吗」`,
    'jd-perfectionist': `找一篇${j}公司的面经，看面试官问了什么，倒推简历该突出什么`,
    'ddl-sprinter': `别自己改！把简历和${j}的JD一起扔给朋友看，取第一条建议就改`,
    'big-firm-only': `看看${j}公司员工LinkedIn上的自我描述，用类似的语言写你的简历`,
    'broad-net': `参考一个已经拿到类似${j}岗位的人的简历格式，但别抄内容`,
    'over-preparer': `把简历发到求职群里求反馈——但只听前3条建议，多了就乱`,
    'zen-master': `让一个外行朋友看你的简历，他能看懂的部分就是HR也能看懂的`,
    'project-refactorer': `去GitHub找一个star高的简历模板，把你内容填进去，别再自己设计`,
    'intern-only': `让你实习的同事帮忙看看你的简历，他们知道${j}这样的岗位看重什么`,
    'emo-recoverer': `把简历给一个不太熟的人看，他们的评价比好朋友更接近HR视角`,
    'long-planner': `找一个在${j}类似岗位工作的人，问问他们筛简历时看重什么`,
    'resume-edit-loop': `把简历发给一个说话直接的朋友，让他们用一句话说你该删什么`,
    'cross-field-rookie': `找转行成功的人要一份他们的简历参考，${j}方向的更佳`,
    'written-test-king': `简历给一个非技术朋友看，如果他们能大概说出你擅长什么就对了`,
    'offer-hesitator': `让一个你信任的mentor看看你为${j}准备的简历版本`,
  };

  const w5 = {
    'mass-applyer': `复制上一份简历，把文件名改成「${j}版」，完成了80%`,
    'resume-anxious': `简历不用完美，有一版能投就行——你投的过程中会自然迭代`,
    'jd-perfectionist': `如果你已经改了超过30分钟，停下来，用当前版本`,
    'ddl-sprinter': `简历改完第一页就能投，第二页HR基本不看`,
    'big-firm-only': `简历里用${j}公司的价值观关键词（去他们官网找），HR吃这套`,
    'broad-net': `不知道改什么就加一句「热爱互联网行业」，有时候就够了`,
    'over-preparer': `你现在的简历版本号大概是v50——v1的时候其实就能投了`,
    'zen-master': `改完简历关掉，明天再看一眼，如果没觉得哪里不对就投`,
    'project-refactorer': `简历不是GitHub README，不需要commit history`,
    'intern-only': `在简历目标栏写「${j}方向」，加上实习经历，够了`,
    'emo-recoverer': `把简历字体调大一点，看起来内容更充实——有时候你只需要这个`,
    'long-planner': `先用bullet point列出和${j}相关的3个核心卖点，再往简历模板里填`,
    'resume-edit-loop': `打开简历，存为PDF，关掉——这就是你今天的改简历成果`,
    'cross-field-rookie': `在简历最上面写一句「正在自学${j}方向相关技术」，诚实且有说服力`,
    'written-test-king': `简历里不需要把所有技术都列上——和${j}最相关的5个就够了`,
    'offer-hesitator': `简历不是越长越好——为${j}定制一页纸版本`,
  };

  const w3 = {
    'mass-applyer': `简历别写太多，HR看15秒就决定了——给你的简历拍个「15秒照片」测试`,
    'resume-anxious': `你的简历给别人看的时候，他们说了什么？那些就是你真实的长处`,
    'jd-perfectionist': `一份好的简历不是「我最厉害」，而是「我很适合${j}」——改成后者`,
    'ddl-sprinter': `考虑用一个在线简历生成器，拖拽式的那种，5分钟搞定格式问题`,
    'big-firm-only': `把${j}的公司logo放在简历旁边（不是真的放），想象你是为这家公司写简历`,
    'broad-net': `简历用在线工具生成一个好看的版本，有时候颜值就是正义`,
    'over-preparer': `你为${j}准备的简历可能已经过度优化了，试着删掉一段`,
    'zen-master': `简历的底线是不犯错：检查邮箱、电话、日期有没有写错`,
    'project-refactorer': `你的简历可能太技术了——加一句人话版的自我描述`,
    'intern-only': `简历底部加一句「可全职实习X个月」，${j}如果是实习转正岗会很看重`,
    'emo-recoverer': `翻出你第一次写的简历和现在对比——你已经进步太多了`,
    'long-planner': `做一个A/B版本的简历实验：两个版本各投5个岗，看哪个回复率高`,
    'resume-edit-loop': `你改简历的时间已经超过全世界99%的求职者——该停了`,
    'cross-field-rookie': `不会写的技术不要编——写「了解」比写「精通」在${j}面试时安全得多`,
    'written-test-king': `简历上项目经验写「用了什么技术解决了什么问题」而不是「做了什么功能」`,
    'offer-hesitator': `你有多个offer这事本身就可以写进简历——「已有offer，择优选择」是底气`,
  };

  const w2 = {
    'mass-applyer': `${p}，你的简历和${j}的匹配度不重要——重要的是你投了`,
    'resume-anxious': `${p}，你的简历比你焦虑的时候看起来强100倍，信我`,
    'jd-perfectionist': `${p}，完美简历不存在——${j}的HR自己找工作时简历也有硬伤`,
    'ddl-sprinter': `${p}，简历改得最快的方法：把${j}的JD当checklist逐条对`,
    'big-firm-only': `${p}，简历这种东西，大厂HR其实只看10秒——前3行定生死`,
    'broad-net': `${p}，改简历的最高境界：改到你自己都忘了改过哪里`,
    'over-preparer': `${p}，你的简历可能是全中国打磨时间最长但投递次数最少的`,
    'zen-master': `${p}，改简历和泡茶一样——泡太久就苦了`,
    'project-refactorer': `${p}，简历v47.2-final-FINAL-reallyFINAL.pdf——看到这种文件名就想打人`,
    'intern-only': `${p}，简历上写「实习中」三个字比你想象的有分量`,
    'emo-recoverer': `${p}，你的简历能打动${j}的HR——如果连你都不信，先看一遍再评价`,
    'long-planner': `${p}，简历改到第三版就可以停了，边际收益归零`,
    'resume-edit-loop': `${p}，Ctrl+S按了多少次了？这次直接Ctrl+P打印PDF投出去`,
    'cross-field-rookie': `${p}，转行简历的终极秘诀：让人看到你的学习曲线，不是你的知识存量`,
    'written-test-king': `${p}，简历不是LeetCode profile，但也别完全不说你刷了多少题`,
    'offer-hesitator': `${p}，简历上写「在X个offer中择优」——这会让${j}的HR多看一眼`,
  };

  return [
    w10[pid], w9[pid], w8[pid],
    w7[pid], w5[pid], w3[pid], w2[pid],
  ];
}

// ---------- 槽位 3：去投递 ----------
function slot3Options(pid: PersonaId, v: VoiceProfile, cat: string): string[] {
  const j = '{{jobName}}'; const d = '{{daysLeft}}'; const p = '{{personaName}}';

  const w10 = {
    'mass-applyer': `打开${j}的投递页面，简历拖进去，点发送${v.closers[2]}`,
    'resume-anxious': `${v.openers[0]}今天把${j}投出去，投完你就从「准备中」变成「进行中」了`,
    'jd-perfectionist': `${v.openers[0]}附件简历、检查文件命名、点发送——就这三步`,
    'ddl-sprinter': `${v.openers[2]}把${j}投了！${v.closers[0]}`,
    'big-firm-only': `${v.openers[1]}${j}的官网/内推/BOSS直聘，选最快的一个渠道投`,
    'broad-net': `${v.openers[0]}${j}投一个，也顺便看看推荐列表里类似的岗位`,
    'over-preparer': `选一个渠道投${j}，官网投递、BOSS直聘、内推都行——不拘泥于最优`,
    'zen-master': `${v.openers[1]}在截止前把${j}投了${v.closers[3]}`,
    'project-refactorer': `${v.openers[3]}就投${j}！${v.closers[0]}`,
    'intern-only': `把${j}投了，同时在备注里写「有实习经验，可快速到岗」`,
    'emo-recoverer': `深呼吸，然后点下${j}的投递按钮。点完就轻松了`,
    'long-planner': `按计划今天投递${j}，投完在你的进度表上打勾`,
    'resume-edit-loop': `${v.openers[1]}把${j}投出去，不许再打开简历看一眼`,
    'cross-field-rookie': `选${j}的官网投递渠道，校招入口最正规，对转行者最友好`,
    'written-test-king': `投${j}的时候选「内推」渠道——你的笔试优势需要变现`,
    'offer-hesitator': `今天就给${j}投出去，投完你就多一个选择，而不是一直在犹豫`,
  };

  const w9 = {
    'mass-applyer': `一口气把${j}和推荐的5个相似岗位全投了，投递量=机会量`,
    'resume-anxious': `投${j}之前不要反复检查附件，你第一次检查就对了`,
    'jd-perfectionist': `确认${j}的投递材料齐全了——简历PDF+作品链接（如有）——然后投`,
    'ddl-sprinter': `别管是不是最佳时机，${j}现在招人你就现在投`,
    'big-firm-only': `${j}如果支持内推一定要找内推——大厂的简历池和内推池是两个池`,
    'broad-net': `投${j}的时候顺便把「允许HR查看简历」打开，机会翻倍`,
    'over-preparer': `不要因为觉得${j}还没准备好就不投——投递本身就是准备的一部分`,
    'zen-master': `把${j}的投递当成今天的一项普通任务，像吃饭一样自然`,
    'project-refactorer': `投${j}只需要3个动作：选文件→上传→发送。你没有理由不做`,
    'intern-only': `投完${j}后记得在你的实习日历上标记一下，别和实习时间冲突`,
    'emo-recoverer': `投${j}就像发一条消息——发出去就完成了，不需要对方秒回`,
    'long-planner': `确认${j}的投递渠道和截止时间，投完后在你的追踪表里记录日期`,
    'resume-edit-loop': `投递按钮按下去之后，你的简历就和你没关系了——让HR去判断`,
    'cross-field-rookie': `投${j}的时候不要因为没有相关学历就不投——HR筛选是关键词优先`,
    'written-test-king': `投完${j}立刻开始刷一套${j}公司往年的笔试题，趁热打铁`,
    'offer-hesitator': `投${j}的时候不要想「万一中了怎么办」——先投了再说`,
  };

  const w8 = {
    'mass-applyer': `${j}的投递截止还有${d}天，今天投完这个就去刷下一个`,
    'resume-anxious': `打开${j}的投递页面看一遍，你会发现填信息比想象中简单`,
    'jd-perfectionist': `${j}的投递材料清单：简历PDF（必选）+ 作品集（可选）+ 简短自我介绍`,
    'ddl-sprinter': `花3分钟检查${j}的投递材料：简历附件对不对？文件名有没有乱码？`,
    'big-firm-only': `${j}投递时间选择：周二到周四上午投，HR的邮箱在最上面`,
    'broad-net': `注册一个BOSS直聘/拉勾账号，${j}如果在那里也能投就多一个渠道`,
    'over-preparer': `给${j}准备一份简短的投递附言（3句话），但不要超过3句`,
    'zen-master': `打开${j}的投递页面，确认一下你填的信息都是对的`,
    'project-refactorer': `投${j}的时候不要附GitHub链接——除非你的README写好了`,
    'intern-only': `投${j}的附言里写「目前在某公司实习，预计X月结束」`,
    'emo-recoverer': `把${j}的投递按钮想象成一扇门——推开它，不是拆了它`,
    'long-planner': `按你的投递计划，今天${j}是第X个投递目标`,
    'resume-edit-loop': `投递${j}的时候选「快速投递」，不给修改留余地`,
    'cross-field-rookie': `${j}的投递页如果有「个人优势」栏，写你的学习能力和跨领域视角`,
    'written-test-king': `如果${j}的投递系统有「在线测评」，今天直接做了`,
    'offer-hesitator': `投递${j}的时候在附言里简短说明你对这个方向的兴趣和已有offer`,
  };

  const w7 = {
    'mass-applyer': `今天的目标：投出${j}和其他4个岗位，凑够5个今天的任务就完成`,
    'resume-anxious': `投${j}之前告诉自己：被拒也是数据，不是对你的评价`,
    'jd-perfectionist': `找个人和你一起投——你投${j}，他投他的，互相监督就不纠结`,
    'ddl-sprinter': `别找最佳投递时间了——现在就投，现在就是最佳时间`,
    'big-firm-only': `内推投${j}比官网投回复率高一倍，花10分钟找内推人`,
    'broad-net': `手机端也能投，${j}如果在BOSS直聘上就APP一键投递`,
    'over-preparer': `把投${j}这件事告诉一个朋友，让他半小时后问你投了没`,
    'zen-master': `${j}投了就投了，别反复刷新投递状态，刷也没用`,
    'project-refactorer': `投递前最后检查一次：简历是不是你最新那一版？文件名合理吗？`,
    'intern-only': `投${j}之前先确认好你的实习结束时间，别让HR觉得你在骑驴找马`,
    'emo-recoverer': `让朋友陪你一起投${j}——两个人一起按发送键就没那么可怕`,
    'long-planner': `在你的求职追踪表里记下${j}的投递时间和渠道，后续跟进需要`,
    'resume-edit-loop': `让一个朋友帮你投——把简历给他，告诉他${j}的投递链接`,
    'cross-field-rookie': `在牛客网上搜一下${j}的投递经验贴，看看和你同背景的人怎么投的`,
    'written-test-king': `投完${j}给自己设一个3天的闹钟，3天后如果没回复就刷一套题冷静`,
    'offer-hesitator': `投递时心态放平——你已经有offer了，投${j}是多一个选择`,
  };

  const w5 = {
    'mass-applyer': `把${j}的投递链接存到桌面，看到了就顺手投`,
    'resume-anxious': `先别想结果，把${j}投出去这个动作本身就是胜利`,
    'jd-perfectionist': `如果你在纠结用哪个邮箱投${j}——用你最常用的那个就行`,
    'ddl-sprinter': `${j}的投递按钮就在那里，按一下又不会触电`,
    'big-firm-only': `大厂的校招官网有时候很难用——${j}如果卡住了换内推渠道`,
    'broad-net': `投${j}的时候别选「感兴趣但不确定」的选项——选「非常感兴趣」才有机会`,
    'over-preparer': `不要等到「完全准备好」——那一天的${j}可能已经招到人了`,
    'zen-master': `投递前的那一秒犹豫是正常的，投完之后就释然了`,
    'project-refactorer': `投${j}比改${j}的简历重要100倍`,
    'intern-only': `把${j}当作你实习转正的备份——投了不亏`,
    'emo-recoverer': `投出去的那一刻你会感到一种奇妙的轻松——试试看`,
    'long-planner': `${j}在你的投递计划中的权重可能不高，但投了就是进度`,
    'resume-edit-loop': `闭上眼睛点发送，然后立刻关掉网页`,
    'cross-field-rookie': `不要因为${j}写了「相关专业优先」就不投——那是「优先」不是「必须」`,
    'written-test-king': `投完${j}就当给自己买了一张彩票——中不中看天，买不买看你`,
    'offer-hesitator': `你已经有过硬实力拿到offer——投${j}只是个加选项的游戏`,
  };

  const w3 = {
    'mass-applyer': `今天不投${j}的话，明天你可能就忘了这个岗位的存在`,
    'resume-anxious': `如果不投${j}，你永远不知道结果——而不知道比被拒更内耗`,
    'jd-perfectionist': `投${j}之前先回答一个问题：如果不投，你会后悔吗？`,
    'ddl-sprinter': `${j}有没有「快速投递」选项？——有的话1分钟都不要多花`,
    'big-firm-only': `${j}的投递系统如果要求填一堆信息——先填必填项，其他跳过`,
    'broad-net': `花5分钟在多个平台搜一下${j}，说不定有更简单的投递入口`,
    'over-preparer': `假设${j}明天截止投递，你现在还缺什么？缺的东西值得今天补吗？`,
    'zen-master': `投${j}是一瞬间的事，纠结投不投才是消耗精力的事`,
    'project-refactorer': `你为${j}准备的简历版本如果超过3个——选最新的那个投`,
    'intern-only': `投${j}的时候想想：这个投递动作可能影响你毕业后的第一份工作`,
    'emo-recoverer': `你的emo可能需要3天恢复，但${j}的投递只需要3秒`,
    'long-planner': `计划中${j}的投递窗口期还剩${d}天，今天是最轻松的一天`,
    'resume-edit-loop': `把你的手从鼠标上拿开，深呼吸，然后点发送`,
    'cross-field-rookie': `不要等学完再投${j}——你永远学不完，先投再说`,
    'written-test-king': `投了${j}之后如果收到笔试通知，那就是你擅长的战场了`,
    'offer-hesitator': `纠结要不要投的时间，够你把${j}投了然后再纠结要不要去`,
  };

  const w2 = {
    'mass-applyer': `${p}，投${j}就像撒网——网撒出去之前你永远不知道能捞到什么`,
    'resume-anxious': `${p}，你是简历焦虑不是投递焦虑——发出去那一刻焦虑就结束了`,
    'jd-perfectionist': `${p}，完美的投递时机 = 现在。完美的投递状态 = 差不多就行`,
    'ddl-sprinter': `${p}，别等「准备好了」，那和「等死」在求职里是同义词`,
    'big-firm-only': `${p}，大厂的投递系统再难用也要投——因为值得`,
    'broad-net': `${p}，投递是一种行为艺术——投得越多，艺术造诣越高`,
    'over-preparer': `${p}，你可能是全世界投递前准备最充分但投递次数最少的人`,
    'zen-master': `${p}，投不投随缘，但缘分不会自己来敲门`,
    'project-refactorer': `${p}，你的commit记录很多，投递记录很少——该平衡了`,
    'intern-only': `${p}，实习是主路，${j}是辅路——两条路都走走看`,
    'emo-recoverer': `${p}，投${j}就像发微信表白——最差也就是已读不回`,
    'long-planner': `${p}，你的计划写得很完美了——现在执行第一步：投${j}`,
    'resume-edit-loop': `${p}，送你一句咒语：「已读不回也是回」——投！`,
    'cross-field-rookie': `${p}，你不是零基础，你是从另一座山翻过来的登山者`,
    'written-test-king': `${p}，投了才有笔试，笔试才是你的主场`,
    'offer-hesitator': `${p}，多一个offer不是负担，是筹码——投${j}就是加筹码`,
  };

  return [
    w10[pid], w9[pid], w8[pid],
    w7[pid], w5[pid], w3[pid], w2[pid],
  ];
}

// ---------- 槽位 4：笔试准备 ----------
function slot4Options(pid: PersonaId, v: VoiceProfile, cat: string): string[] {
  const j = '{{jobName}}'; const d = '{{daysLeft}}'; const p = '{{personaName}}';
  const isFrontend = cat === 'frontend';
  const sf = (fe: string, ge: string) => isFrontend ? fe : ge;

  // Frontend specific: React/Vue/JS/CSS/浏览器
  // General specific: 算法/数据结构/SQL/系统设计

  const w10 = {
    'mass-applyer': sf(`${j}前端笔试无非JS基础+框架题，刷5道高频题就够`, `${j}笔试看脸也看命，刷10道高频算法题意思一下`),
    'resume-anxious': sf(`别怕${j}的笔试，HTML/CSS/JS基础你每天都在用，复习一下手感就回来了`, `${j}的笔试不是奥数竞赛，基础数据结构和常见算法过一遍就够`),
    'jd-perfectionist': sf(`把${j}前端笔试范围圈出来：JS基础（50%）+ React/Vue（30%）+ 手写代码（20%）`, `按${j}的岗位类型确定笔试重点：算法（40%）+ 基础（30%）+ 场景题（30%）`),
    'ddl-sprinter': sf(`今天刷5道前端高频手写题（call/apply/bind、深拷贝、Promise），${j}必考`, `${d}天只够刷高频题了——去牛客找${j}的往年真题`),
    'big-firm-only': sf(`${j}大厂前端笔试必有框架原理题，React Fiber和Vue响应式至少搞懂一个`, `${j}大厂笔试难度对标，算法至少刷到中等难度`),
    'broad-net': sf(`${j}前端笔试大概率有JavaScript基础题，把《JS高级程序设计》前6章翻翻`, `${j}的笔试内容和同类岗位差不多，把常见题型过一遍就行`),
    'over-preparer': sf(`${j}前端笔试你很可能准备过头了——JS基础你已经很熟了`, `${j}的笔试你已经准备得够多了——现在专注最可能考的3类题型`),
    'zen-master': sf(`${j}前端笔试前把常用的CSS布局和JS数组方法过一遍，不必深挖`, `${j}笔试保持平常心，把它当成一次免费的技术体检`),
    'project-refactorer': sf(`${j}前端笔试重点：手写代码！把防抖节流、Promise.all、深拷贝练到能默写`, `${j}笔试不需要准备到完美——大多数人都是半准备状态去考的`),
    'intern-only': sf(`${j}前端笔试可能会考你在实习中实际用到的框架——重点复习这一块`, `你在实习中学到的实战知识比笔试书上的更管用，${j}也一样`),
    'emo-recoverer': sf(`${j}前端笔试不是决定生死的考试——做不出来很正常，大部分人都做不出来`, `${j}的笔试就像模拟考——考砸了也不影响你最终上岸`),
    'long-planner': sf(`按计划，今天攻克${j}前端笔试的JS基础模块——闭包、原型链、事件循环`, `按计划分配${j}笔试准备的各个模块时间——算法/数据结构/场景题`),
    'resume-edit-loop': sf(`${v.openers[3]}打开LeetCode，选前端标签，刷3道简单题，${v.closers[0]}`, `${v.openers[0]}打开牛客网，搜${j}的笔试真题，刷一套感受一下`),
    'cross-field-rookie': sf(`${j}前端笔试对转行者来说：重点突破JS基础，框架可以后面再补`, `${j}笔试不考你是不是科班出身——只考你会不会做题`),
    'written-test-king': sf(`${j}前端笔试是你的主场——但别忘了CSS布局题有时候比算法题还坑`, `${j}笔试是你最擅长的环节，但别只刷算法，SQL和场景题也看一下`),
    'offer-hesitator': sf(`${j}前端笔试就算过了也不急着决定，但先过了再说`, `${j}的笔试是你比较各家offer技术含金量的好参考`),
  };

  const w9 = {
    'mass-applyer': sf(`前端面试宝典翻到JavaScript那章，看半小时就够`, `打开牛客网，找到${j}公司往年笔试题，刷一套找感觉`),
    'resume-anxious': sf(`你已经写过前端项目了，${j}的笔试考的其实就是你项目里用过的那些`, `你已经刷过不少题了，${j}的笔试不会比你刷过的难`),
    'jd-perfectionist': sf(`HTML/CSS/JS/框架 四块各刷5题——${j}的笔试覆盖面就这么宽`, `确定${j}的笔试是否考行测题——如果有，也需要分配时间`),
    'ddl-sprinter': sf(`去CodePen上找几个前端经典效果实现一遍，比看书快10倍`, `别刷理论题了——${j}真题刷3套比你看3天书有用`),
    'big-firm-only': sf(`${j}这样的公司前端笔试可能考TypeScript，至少把基础类型和泛型过一遍`, `${j}的笔试可能有系统设计题——准备一个「设计短链接系统」的模板`),
    'broad-net': sf(`去B站搜「前端面试真题解析」，找个播放量最高的视频倍速看完`, `B站/知乎搜${j}类岗位笔试经验，总有人分享过`),
    'over-preparer': sf(`${j}前端笔试你不用把所有API都背下来——理解原理比背API重要`, `你的笔试准备已经充分了——现在需要的是临场状态而不是更多知识`),
    'zen-master': sf(`找一个GitHub上的前端面试题仓库，挑star高的那个，每天看10题`, `把${j}的笔试当成一次技术自测，看看自己哪块薄弱`),
    'project-refactorer': sf(`别把时间花在搭环境上——${j}笔试是网页答题，不是让你搭项目`, `别从头写笔记了——网上${j}公司的笔试面经已经总结得很好了`),
    'intern-only': sf(`结合你实习中遇到的实际前端问题准备${j}的笔试，比纯理论有效`, `实习中积累的业务理解能帮你搞定${j}笔试中的场景题`),
    'emo-recoverer': sf(`做不出来${j}的笔试题不丢人——那些题本来就不是让你全做对的`, `笔试只是第一关，后面还有面试——这一关不需要完美`),
    'long-planner': sf(`下载一个前端面试题库App，利用碎片时间刷${j}相关的基础题`, `按你的笔试准备计划，今天完成${j}对应的模块`),
    'resume-edit-loop': sf(`别纠结该学React还是Vue了——${j}的JD上写啥你就准备啥`, `去牛客网${j}公司的讨论区，找最近3个月的笔试经验帖`),
    'cross-field-rookie': sf(`${j}前端笔试最常考的JS基础其实就那十几个知识点，不需要全栈精通`, `把${j}笔试当成你的技术学习路线图——考什么就学什么`),
    'written-test-king': sf(`${j}前端笔试你的算法部分肯定没问题，但注意手写代码的代码风格`, `${j}笔试算法题对你来说小菜一碟——但别忘了准备行为测试题`),
    'offer-hesitator': sf(`${j}笔试过了就当积攒经验，没过也不影响你手上的offer`, `拿${j}的笔试难度作为一个标尺，衡量它值不值得你去`),
  };

  const w8 = {
    'mass-applyer': sf(`花30分钟刷JavaScript30里的5个小练习，${j}前端笔试手写题大概率从里面变形`, `去LeetCode按标签刷${j}方向的5道高频题，重点看题解思路`),
    'resume-anxious': sf(`把你做过的前端项目打开，对着代码回忆每个API的用法——这就是最好的复习`, `把你刷过的题拿出来回顾一下，你已经比想象中准备得更充分`),
    'jd-perfectionist': sf(`按${j}前端笔试的考核权重分配时间：60%时间给JS基础，20%给框架，20%给手写`, `按${j}笔试内容分配：算法40% + 基础30% + 场景题30%`),
    'ddl-sprinter': sf(`去牛客网搜「${j}公司 前端 笔试」，按时间排序看最近5篇`, `去牛客网搜${j}公司近半年的笔试面经，整理高频考点`),
    'big-firm-only': sf(`大厂前端笔试手写代码题有套路——事件循环输出题、异步控制题、对象操作题`, `大厂笔试3道算法题一般1简单1中等1困难——确保简单和中等全对`),
    'broad-net': sf(`在GitHub搜「frontend-interview」，找个中文仓库把基础篇看一遍`, `随便找一个在线测评平台做一套模拟题，感受一下${j}的笔试节奏`),
    'over-preparer': sf(`你已经准备了太多——今天只做一件事：在纸上默写一个Promise.all的实现`, `你已经刷了足够多的题——今天做一套限时模拟就够了`),
    'zen-master': sf(`把${j}前端笔试常见的知识点做成一张思维导图，看一眼心里有数`, `把准备${j}笔试当成一个解谜游戏，而不是一场考试`),
    'project-refactorer': sf(`手写代码题不求多但求精——把call/apply/bind/new/Promise.all五个写熟`, `把${j}最可能考的3类算法题各刷一道，每题限时30分钟`),
    'intern-only': sf(`打开${j}前端笔试准备页面，把你实习中用过的技术栈标出来重点复习`, `结合实习经验和${j}笔试方向，重点准备实际应用场景题`),
    'emo-recoverer': sf(`找一套免费的前端笔试模拟题，不限时做一遍，感受一下——不用打分`, `找一套不限时的笔试题做一遍，重点是感受题型而不是分数`),
    'long-planner': sf(`用Notion或Excel做一个${j}前端笔试的知识点checklist，逐一攻克`, `在你的学习计划中给${j}的笔试分配具体的准备时段`),
    'resume-edit-loop': sf(`别纠结该用哪个前端框架——${j}写React就练React，写Vue就练Vue`, `别再收集资料了！在已收集的资料里选一套，今天开始看`),
    'cross-field-rookie': sf(`从零开始的话，${j}前端笔试优先级：JS基础>DOM操作>CSS布局>框架`, `针对${j}笔试方向，找一套新手上路教程，先看完前3章`),
    'written-test-king': sf(`${j}前端笔试的手写代码题别光刷，要把每道题的边界条件都考虑进去`, `把你的强项（算法）和弱项（场景/行为）时间分配为3:7`),
    'offer-hesitator': sf(`${j}的笔试准备就当保持手感——你已经在其他面试中证明过自己了`, `把${j}的笔试难度和你拿到的offer公司的笔试难度对比一下`),
  };

  const w7 = {
    'mass-applyer': sf(`去GitHub找一个前端面试题项目，看星星最多的那个，每天半小时`, `加一个${j}的笔试交流群，看看别人都在准备什么`),
    'resume-anxious': sf(`找一份前端笔试模拟题，别计时，别打分——就当在做技术闯关游戏`, `去牛客网找一套${j}类岗位的模拟题，不限时、不评分地做一遍`),
    'jd-perfectionist': sf(`去找${j}公司的前端面经，看看最近被问到最多的3个技术问题`, `去小红书/牛客搜${j}的笔试经验帖，记录高频考点`),
    'ddl-sprinter': sf(`找个正在准备前端面试的同学互相出题考对方——事半功倍`, `找一个也在准备${j}笔试的人互相出题，讲给别人听比自己做记得牢`),
    'big-firm-only': sf(`大厂前端必考：浏览器渲染原理、事件循环、https——这三个搞懂80%就够了`, `大厂的在线笔试系统可能会录屏——提前准备好安静的环境而不是更多知识`),
    'broad-net': sf(`在抖音/小红书搜「前端面试题」，每天刷到就当复习了`, `在抖音/小红书搜「${j}笔试」，吃饭的时候刷几条`),
    'over-preparer': sf(`你准备的前端笔试题量可能已经够了——现在该做的是限时模拟`, `你的知识储备已经够了——现在需要的是模拟真实笔试的时间压力`),
    'zen-master': sf(`去LeetCode随便挑一道前端相关的题，做不出来就看题解，不勉强自己`, `随便找一道中等难度的题，做不出来就看题解——这不是考试`),
    'project-refactorer': sf(`你的GitHub上有前端项目——对着自己的代码复习比对着书本复习记得更牢`, `别再去收集第11份笔试资料了——在现有的10份里挑一份看完`),
    'intern-only': sf(`问你的实习mentor当初是怎么准备前端笔试的，内部视角最有用`, `问问你实习的同事他们当初怎么准备${j}类笔试的`),
    'emo-recoverer': sf(`笔试只是一次做题——你做过的题比这次多得多，不差这一次`, `把${j}笔试当成一次免费的技术体检——发现弱点比分数重要`),
    'long-planner': sf(`设定${j}笔试准备的里程碑：今天完成JS基础，明天框架，后天手写`, `设定${j}的笔试准备的里程碑——每完成一个模块给自己一个小奖励`),
    'resume-edit-loop': sf(`去LeetCode随便点一道前端标签的题，做30分钟，不管做没做完都停`, `去LeetCode随便点一道中等题做30分钟——训练的不是知识是决断力`),
    'cross-field-rookie': sf(`在B站找一个「前端面试题讲解」的播放列表，每天看3集当追剧`, `找一个和你转行方向一致的笔试经验帖，逐条对照准备`),
    'written-test-king': sf(`你的前端笔试算法肯定没问题——但去了解一下浏览器渲染原理和HTTP缓存`, `你的强项是笔试——但这次别刷题，练习用语言讲清楚解题思路`),
    'offer-hesitator': sf(`做${j}的笔试之前，回想一下你已经通过的几次笔试，找回那种感觉`, `把${j}的笔试当作验证「这个公司值不值得去」的一个数据点`),
  };

  const w5 = {
    'mass-applyer': sf(`在手机上装个前端刷题小程序，上厕所的时候刷两道`, `在手机上装个刷题APP，通勤的时候刷两道`),
    'resume-anxious': sf(`你写过的每一个前端页面都是准备——${j}的笔试就是一次更大号的练习`, `你刷过的每一道题都是准备——${j}只是另一套题`),
    'jd-perfectionist': sf(`把${j}前端笔试最核心的10个JS知识点列出来，一个一个画勾`, `把${j}笔试最可能考的5个知识点列出来，搞定一个划一个`),
    'ddl-sprinter': sf(`打开CodePen，手写一个轮播图和一个Tab切换——${j}笔试手写题够了`, `找一个在线OJ随便做3道题热手，别管对错`),
    'big-firm-only': sf(`${j}大厂前端笔试前夜：别学新东西，回顾你准备的笔记就好`, `${j}大厂笔试有一半是考心态——你已经刷了足够多的题`),
    'broad-net': sf(`前端笔试其实就是JS+CSS+框架三板斧，${j}不会考太偏的`, `把${j}笔试当成一次免费的技术自测，反正不花钱`),
    'over-preparer': sf(`你复习的前端知识点已经比${j}笔试范围大了——收窄到高频考点`, `你准备的比${j}笔试范围还广——收窄到最可能考的3个方向`),
    'zen-master': sf(`笔试前一天别熬夜复习——睡好觉比多记两个API更管用`, `笔试前一天晚上好好睡觉，大脑清醒比多刷一道题有用`),
    'project-refactorer': sf(`别为了${j}的前端笔试去学一个新框架——用你会的框架就够了`, `别为了${j}的笔试从头学一门新语言——用你最熟悉的`),
    'intern-only': sf(`把实习中学到的前端实战经验用在${j}的笔试中——实战比理论分高`, `在${j}笔试中多用实习中的真实案例来回答场景题`),
    'emo-recoverer': sf(`做${j}笔试的时候如果卡住了：深呼吸，跳过这一题，先做后面的`, `笔试过程中卡住了很正常——跳过继续，后面还有机会`),
    'long-planner': sf(`你的计划里${j}的笔试准备应该还有一个缓冲周——不用赶`, `你的笔试准备时间表里还有缓冲期，按部就班就好`),
    'resume-edit-loop': sf(`用一张A4纸手写${j}前端笔试的核心知识点——写完就停`, `用一张纸列出${j}笔试3个最可能考的点——只准备这3个`),
    'cross-field-rookie': sf(`${j}前端笔试不考你是不是CS本科——只考你会不会写代码`, `${j}笔试不做学历歧视——做出来就是本事`),
    'written-test-king': sf(`${j}前端笔试中的算法题对你来说应该是送分题——把精力留给CSS和浏览器题`, `你已经刷了够多题了——${j}笔试前做一套保持手感就好`),
    'offer-hesitator': sf(`你有offer在手，${j}的笔试压力小很多——用最放松的状态去考`, `手里有offer，${j}的笔试就是去玩的`),
  };

  const w3 = {
    'mass-applyer': sf(`打开牛客网APP，选前端标签，随便刷几题，错了也无所谓`, `打开牛客网APP随便刷几题，不用对答案`),
    'resume-anxious': sf(`准备${j}前端笔试最好的方法：假装你在教一个完全不会的人——讲出来`, `把你知道的讲给一个想象中的面试官听——能讲清楚就是真懂了`),
    'jd-perfectionist': sf(`用番茄钟法：25分钟专注复习${j}笔试的一个知识点，然后停`, `用番茄钟法准备${j}笔试——25分钟专注，5分钟休息`),
    'ddl-sprinter': sf(`如果${j}笔试就在明天——复习你错过的题比学新题重要3倍`, `${d}天时间不够把所有题刷完——只刷最可能考的那几道`),
    'big-firm-only': sf(`大厂前端笔试有时候考得很偏——别慌，大部分人也不会`, `大厂笔试的难题大部分人都不会——你的目标是基础分全拿`),
    'broad-net': sf(`考前吃顿好的——${j}的笔试发挥和血糖水平正相关`, `考前吃顿好的，情绪稳定比多背一道题有用`),
    'over-preparer': sf(`关掉所有前端学习资料，打开一个空白页面，凭记忆答题——这才是真实水平`, `关掉所有资料，凭记忆做一套题——你会发现你记得的比以为的多`),
    'zen-master': sf(`${j}的笔试只是通往面试的一扇门——门后面才是你发挥的地方`, `笔试不过就说明这个岗位不适合你——省了后面面试的时间`),
    'project-refactorer': sf(`做${j}前端笔试的时候别追求最优解——能跑就行`, `做${j}笔试的时候优先做会的题——和重构一样，先做能做的`),
    'intern-only': sf(`${j}笔试前不用请实习假——利用午休或者晚上就够了`, `别为了${j}的笔试请假——实习才是你现在最重要的经历`),
    'emo-recoverer': sf(`做${j}前端笔试前听一首你最燃的歌——状态比知识更重要`, `笔试前听一首你最喜欢的歌——好心情是最好的准备`),
    'long-planner': sf(`把${j}前端笔试准备分成微步骤——每天只完成一个知识点`, `把${j}笔试准备分成微步骤——每天只完成一个知识点，不贪多`),
    'resume-edit-loop': sf(`如果${j}笔试要考手写代码——用纸笔练，别又在编辑器里反复改`, `用纸笔做${j}的笔试题——没法删改你就不会纠结了`),
    'cross-field-rookie': sf(`你不需要成为前端专家才能通过${j}的笔试——初级岗考的是基础`, `你不需要成为专家才去考${j}的笔试——入门级别就够`),
    'written-test-king': sf(`${j}前端笔试别只刷算法——CSS布局题有时候才是区分度最高的`, `你的刷题量已经够了——${j}笔试前只做一件事：睡好觉`),
    'offer-hesitator': sf(`多一个${j}的笔试成绩也不能帮你做决定——但它能给你更多信息`, `${j}的笔试可能是你比较手上offer含金量的最好方式`),
  };

  const w2 = {
    'mass-applyer': sf(`${p}，前端笔试就像抽卡——刷得够多总能抽到会的题`, `${p}，笔试就像刮彩票——刮得多了总能中一次`),
    'resume-anxious': sf(`${p}，前端笔试不是期末考试——是你向${j}展示「我做过东西」的舞台`, `${p}，笔试不是要你考100分——过线就行，和驾照科目一一样`),
    'jd-perfectionist': sf(`${p}，前端笔试拿60分就能进面试——剩下的40分面试时候口头补`, `${p}，笔试60分就进面了——你不需要满分`),
    'ddl-sprinter': sf(`${p}，用${d}天准备${j}的笔试——够了，因为你的爆发力是平时的10倍`, `${p}，${d}天够你做很多事了——比如刷30道高频题`),
    'big-firm-only': sf(`${p}，大厂前端笔试的通过率其实不低——敢去考就已经赢了一半`, `${p}，大厂笔试的通过率比你想象的高——大部分人输在不敢去`),
    'broad-net': sf(`${p}，${j}的前端笔试如果不会就先蒙，蒙完再看题解——反正不花钱`, `${p}，笔试能蒙就蒙，蒙完看看题解——下次就会了`),
    'over-preparer': sf(`${p}，你的前端知识储备已经溢出——现在需要的是信心，不是更多知识`, `${p}，你的笔试准备已经够拿3个offer了——现在只需要自信`),
    'zen-master': sf(`${p}，前端笔试这件事——会就会，不会就学，学了再考，不急`, `${p}，笔试就像泡茶——水温够了自然出味道，急不得`),
    'project-refactorer': sf(`${p}，前端笔试不需要优雅代码——能跑就行，和你的项目一样`, `${p}，笔试写代码不用像你写项目那么讲究——AC就行`),
    'intern-only': sf(`${p}，${j}的笔试准备从你实习中偷师——免费的学习机会`, `${p}，实习是最好的笔试准备——你已经在实践中学习了`),
    'emo-recoverer': sf(`${p}，${j}的前端笔试挂了也不代表你不行——只代表这套题不适合你`, `${p}，笔试挂掉不是失败——是排除了一个不适合你的公司`),
    'long-planner': sf(`${p}，你的笔试准备计划已经写得很好了——现在只需要打开第一页`, `${p}，规划已经满分了——执行部分现在开始`),
    'resume-edit-loop': sf(`${p}，${j}的前端笔试准备资料你肯定存了10个G——但看完1个G就够`, `${p}，你的笔试资料收集已经超神了——但看完2份就够`),
    'cross-field-rookie': sf(`${p}，${j}的前端笔试是你展示学习能力的机会——刚学的记得最牢`, `${p}，转行者最大的优势是学习力——笔试考的就是学习力`),
    'written-test-king': sf(`${p}，${j}前端笔试对你来说就是一次炫技——但别炫过头`, `${p}，你刷的题可能比出题人还多——自信点`),
    'offer-hesitator': sf(`${p}，你有offer的人做${j}笔试自带buff：心态无敌`, `${p}，手上有offer的人做笔试最轻松——反正你已经有地方去了`),
  };

  return [
    w10[pid], w9[pid], w8[pid],
    w7[pid], w5[pid], w3[pid], w2[pid],
  ];
}

// ---------- 槽位 5：面试准备 ----------
function slot5Options(pid: PersonaId, v: VoiceProfile, cat: string): string[] {
  const j = '{{jobName}}'; const d = '{{daysLeft}}'; const p = '{{personaName}}';

  const w10 = {
    'mass-applyer': `选2个你最熟的项目，用STAR法则各写3句话，${j}的面试够用了`,
    'resume-anxious': `别怕${j}的面试，面试官想看到的是一个真实的你，不是一个完美的你`,
    'jd-perfectionist': `用STAR法则准备2个核心项目话术，${j}面试官80%的问题会落在这2个项目上`,
    'ddl-sprinter': `${v.openers[1]}准备${j}面试的核心话术：一个最成功的项目 + 一个最难的bug`,
    'big-firm-only': `${j}大厂面试重点：项目深度 > 技术广度。把你最好的项目用STAR法则拆透`,
    'broad-net': `${j}面试准备不用背稿——想清楚你做过什么、你为什么适合就够了`,
    'over-preparer': `${j}面试准备3个故事就够了：你的最强项目、你的最大挑战、你的成长`,
    'zen-master': `${j}面试就当去聊聊天，聊聊你写过的代码和踩过的坑`,
    'project-refactorer': `选一个项目就够了！把你最近的项目用STAR法则写成3分钟的讲稿`,
    'intern-only': `${j}面试中重点讲你的实习项目——那是面试官最想听的`,
    'emo-recoverer': `${j}面试官也是人，他们也在紧张——想着「帮他们了解你」而不是「被审判」`,
    'long-planner': `按计划准备${j}面试：整理项目经历 → 写成STAR话术 → 控制3分钟以内`,
    'resume-edit-loop': `${v.openers[0]}把你最好的2个项目各写一段3分钟的介绍，就这版不改了`,
    'cross-field-rookie': `准备一个「为什么转行」的回答——${j}面试官一定会问，真诚比完美重要`,
    'written-test-king': `${v.openers[1]}练习把技术问题用大白话讲清楚——这是${j}面试和笔试最大的不同`,
    'offer-hesitator': `${j}面试中你会被问到「为什么选我们」——准备一个关于成长的回答`,
  };

  const w9 = {
    'mass-applyer': `面试就是聊天，聊你做过的事情，${j}的面试官也想听故事`,
    'resume-anxious': `把${j}的面试想象成你在给一个朋友讲你最近在忙什么——自然就好`,
    'jd-perfectionist': `整理一个「技术问题-解决方案-量化结果」的作答模板，适配${j}`,
    'ddl-sprinter': `别写逐字稿！用bullet point记关键词，${j}面试时看着关键词自然说`,
    'big-firm-only': `大厂面试喜欢问「你为什么做这个技术选型」——准备你的决策逻辑`,
    'broad-net': `准备${j}面试的方式：打开语音备忘录，自己讲一遍自我介绍`,
    'over-preparer': `${j}面试你不用准备所有问题——准备好你的核心故事，其他临场发挥`,
    'zen-master': `${j}面试前喝杯茶，把心态调到「分享模式」而不是「考试模式」`,
    'project-refactorer': `别在脑子里重构你的项目了——${j}面试官想听的是你做了什么，不是你想做什么`,
    'intern-only': `准备一个「实习中最有成就感的一件事」的故事——${j}面试必问`,
    'emo-recoverer': `${j}的面试官可能一天面了8个人——做一个让他记住的正常人就赢了`,
    'long-planner': `用Excel列出${j}面试可能问的问题，按优先级排序逐一准备`,
    'resume-edit-loop': `把自我介绍录音下来，听一遍，满意就直接用——不许重录超过3次`,
    'cross-field-rookie': `准备3个转行的理由——不是为了说服${j}的面试官，是为了说服你自己`,
    'written-test-king': `写下你刷题时遇到的3个最有意思的题目和思路——${j}面试时可以当例子讲`,
    'offer-hesitator': `${j}面试也是你面试他们——准备3个关于团队和业务的问题问回去`,
  };

  const w8 = {
    'mass-applyer': `STAR法则没那么玄乎：当时什么情况、你要做什么、你做了什么、结果怎样`,
    'resume-anxious': `把${j}面试可能问的5个高频问题写在纸上，每道题想1个关键词回答`,
    'jd-perfectionist': `按${j}的JD倒推面试问题：每条要求准备一个「我是如何满足的」实例`,
    'ddl-sprinter': `今天完成${j}面试准备的3件事：自我介绍、核心项目、反问问题`,
    'big-firm-only': `${j}大厂可能会有压力面——准备好一个「你最大的失败」的真实故事`,
    'broad-net': `去牛客搜一下${j}的面经，看看最近被问到最多的问题`,
    'over-preparer': `准备一张小卡片，上面写3个你最想传达的关键词——${j}面试时瞄一眼`,
    'zen-master': `写一个3句话的自我介绍——你是谁、你做过什么、你为什么适合${j}`,
    'project-refactorer': `你的项目已经够好了——现在把「我做了什么」翻译成「为团队创造了什么价值」`,
    'intern-only': `准备一个问题：「为什么从实习岗想转/留在这个方向」——${j}面试官肯定会问`,
    'emo-recoverer': `准备${j}面试的时候，每准备一个问题就给自己一句正反馈`,
    'long-planner': `按STAR法则四个维度整理每个项目经历，用数字说话`,
    'resume-edit-loop': `做一个1分钟的版本和3分钟的版本——${j}面试官可能说「请简要介绍」`,
    'cross-field-rookie': `把你的原专业经历和${j}方向连接起来——「我以前做X，这让我在Y方面有独特视角」`,
    'written-test-king': `准备把技术概念翻译成大白话——比如「闭包就是函数记住了它出生时的环境」`,
    'offer-hesitator': `准备一个「我对薪资/发展的期望」的坦诚回答——${j}面试到最后大概率会问`,
  };

  const w7 = {
    'mass-applyer': `找个朋友模拟${j}面试，让他随便问——你随便答，就当练习`,
    'resume-anxious': `找一个人听你讲一遍自我介绍——对方的反应会让你发现其实你讲得很好`,
    'jd-perfectionist': `录一段你回答「为什么适合${j}」的音频，听回放，你会发现比想象的好`,
    'ddl-sprinter': `现在就用手机录一段回答「介绍一下你自己」的音频，听一遍，再录一次`,
    'big-firm-only': `找一个大厂的前辈mock一次面试——针对${j}的JD问最尖锐的问题`,
    'broad-net': `在B站找一个模拟面试视频，看看别人怎么应对${j}这类面试`,
    'over-preparer': `让你朋友假装是${j}的面试官，问那些你没准备的问题——训练临场反应`,
    'zen-master': `在镜子前讲一遍你的项目经历——你能自然地看着自己说就是准备好了`,
    'project-refactorer': `把你的项目给一个外行讲——如果能听懂，${j}的HR也能听懂`,
    'intern-only': `让你的实习mentor跟你做一次模拟面试——他们的反馈最贴近实际`,
    'emo-recoverer': `和朋友约一次模拟面试但把它叫做「聊天练习」——名字影响心态`,
    'long-planner': `在你的计划里安排一次真实的模拟面试——找职业规划老师或付费mock`,
    'resume-edit-loop': `找个人听你讲最得意的项目——他的反馈会让你发现根本不需要再改`,
    'cross-field-rookie': `找一个已经转行成功的前辈mock一次面试——他们的视角最接近${j}的面试官`,
    'written-test-king': `找一个人扮演${j}的面试官，只问行为面试题——这是你的弱项所以要多练`,
    'offer-hesitator': `在${j}面试中反问面试官：这个团队现在最大的技术挑战是什么？`,
  };

  const w5 = {
    'mass-applyer': `去牛客网搜${j}的面经，看3篇就够，看多了反而乱`,
    'resume-anxious': `把${j}的面试当成一次技术聊天——你每天都在聊技术，这次也一样`,
    'jd-perfectionist': `选择${j}面试中最可能被问的1个技术问题和1个行为问题，只准备这2个`,
    'ddl-sprinter': `给${j}的面试准备设一个倒计时：还有${d}天，今天搞定自我介绍`,
    'big-firm-only': `大厂的面试反馈周期可能很长——${j}面完后心态上就当已完成`,
    'broad-net': `${j}面试前看一看他们公司的产品/APP，面试中能提到会很加分`,
    'over-preparer': `你已经准备了很多，${j}面试前只需要做一件事：睡个好觉`,
    'zen-master': `${j}面试的准备就是回顾你的项目——你每天都和它们在一起`,
    'project-refactorer': `简化！${j}面试准备只需要：一个项目故事 + 一个技术思考 + 一个问题`,
    'intern-only': `${j}面试和实习面试很像——你经历过一次，这次只会更从容`,
    'emo-recoverer': `${j}面试前给自己写一封「面试后的信」——内容是你面试后想对自己说的话`,
    'long-planner': `${j}面试准备按你的节奏来——你提前规划就是有这种从容`,
    'resume-edit-loop': `${j}面试的准备到此为止——再准备下去就变成逃避了`,
    'cross-field-rookie': `准备一个「虽然我不是科班，但我比科班多X视角」的真诚版本`,
    'written-test-king': `${j}面试中如果被问到不擅长的技术问题，诚实说「不太熟但愿意学」比硬答好`,
    'offer-hesitator': `把${j}的面试当作为你手上的offer做决策而收集信息`,
  };

  const w3 = {
    'mass-applyer': `面${j}之前看看他们的官网，知道他们是做什么的就够了`,
    'resume-anxious': `去面试${j}的路上听一首让你自信的歌——状态决定表现`,
    'jd-perfectionist': `准备${j}面试时别陷入「如果被问到X我该怎么说」的无限联想`,
    'ddl-sprinter': `${j}的面试前夜：准备好衣服、地址、交通方式——然后打游戏放松`,
    'big-firm-only': `如果${j}是大厂面试，做好打持久战的准备——可能有好几轮`,
    'broad-net': `穿让你舒服的衣服去面${j}——舒服比正式更重要`,
    'over-preparer': `把${j}面试的准备材料锁起来——你不需要再看它们了`,
    'zen-master': `面试前做一次冥想或深呼吸——让身体告诉你准备好了`,
    'project-refactorer': `${j}面试时如果被问到「你还有什么要优化的」——说「目前版本已经满足需求」`,
    'intern-only': `${j}面试可能在你实习期间——和面试官坦诚你的时间安排`,
    'emo-recoverer': `把${j}的面试当成一次练习——最差的结果就是多了一次练习机会`,
    'long-planner': `在你的日历上标记${j}的面试时间，提前设置提醒`,
    'resume-edit-loop': `${j}的面试是你的舞台，不是你的审判——你已经准备好了`,
    'cross-field-rookie': `${j}面试官可能对你的原专业很好奇——那是你的差异化优势`,
    'written-test-king': `${j}面试时被问到你不会的东西，说「我的强项在于X，这方面我想多向你学习」`,
    'offer-hesitator': `${j}面试时坦率说出你目前的状态——真诚比套路更能打动面试官`,
  };

  const w2 = {
    'mass-applyer': `${p}，面${j}就像约会——做自己，合不合适是双向的`,
    'resume-anxious': `${p}，${j}的面试官不是你的老师——是两个成年人之间的一次专业交流`,
    'jd-perfectionist': `${p}，面试不是把JD背一遍——是让人看到JD之外的你`,
    'ddl-sprinter': `${p}，你DDL前的爆发力足以搞定${j}的任何面试——相信你的肾上腺素`,
    'big-firm-only': `${p}，进大厂的面试就像打游戏通关——每一关都在练级`,
    'broad-net': `${p}，面试就是聊天——聊high了offer就来了`,
    'over-preparer': `${p}，你背着100页逐字稿去面${j}——但其实面试官只想要一个真诚的聊天`,
    'zen-master': `${p}，面${j}的时候保持你的佛系心态——HR最怕的就是你这种淡定的`,
    'project-refactorer': `${p}，面试官问你项目优化空间的时候——说「目前够用了」是正确答案`,
    'intern-only': `${p}，你是实习生但你不是小朋友——面${j}的时候挺直腰杆`,
    'emo-recoverer': `${p}，被拒了emo三天——但面试本身只需要你坚强三十分钟`,
    'long-planner': `${p}，${j}面试在你的计划表上只是一个小节点——按计划走就好`,
    'resume-edit-loop': `${p}，你把面试准备当简历一样反复打磨——但其实第一版就够了`,
    'cross-field-rookie': `${p}，你是从另一座山走过来的人——${j}的面试官会对你好奇，用好这种好奇`,
    'written-test-king': `${p}，你的代码能力是硬通货——${j}面试官可能面试能力还不如你`,
    'offer-hesitator': `${p}，${j}面试官也会问你为什么还在面——诚实是最好的策略`,
  };

  return [
    w10[pid], w9[pid], w8[pid],
    w7[pid], w5[pid], w3[pid], w2[pid],
  ];
}

// ---------- 槽位 6：模拟练习 ----------
function slot6Options(pid: PersonaId, v: VoiceProfile, cat: string): string[] {
  const j = '{{jobName}}'; const d = '{{daysLeft}}'; const p = '{{personaName}}';

  const w10 = {
    'mass-applyer': `打开手机录音，把${j}的自我介绍讲一遍，听回放——你会被自己笑到但这就对了`,
    'resume-anxious': `对着镜子讲一遍你为什么适合${j}——你会发现镜子里的人其实挺有说服力的`,
    'jd-perfectionist': `准备5个${j}面试高频问题，用手机录音回答，听回放找改进点`,
    'ddl-sprinter': `${v.openers[0]}打开语音备忘录，回答「为什么想来${j}」，限时2分钟`,
    'big-firm-only': `找人或对镜子模拟${j}的行为面试——「你最大的缺点是什么」这种经典题`,
    'broad-net': `随便录一段自我介绍——听一遍你说话的声音，那是${j}面试官会听到的声音`,
    'over-preparer': `关掉你的逐字稿！对着镜子即兴讲一遍${j}面试的核心内容`,
    'zen-master': `在喝茶的时候对着空气讲一遍你的项目经历——自然就好`,
    'project-refactorer': `找个人（谁都行）听你讲3分钟你的项目，不许提前准备`,
    'intern-only': `用实习中遇到的真实场景模拟${j}的行为面试题`,
    'emo-recoverer': `在浴室里对着喷头讲一遍自我介绍——没人能judge你，包括你自己`,
    'long-planner': `按计划安排一次完整的模拟面试：自我介绍→技术提问→行为提问→反问`,
    'resume-edit-loop': `现在就出声讲一遍你最得意的项目——不许在心里默念，必须发出声音`,
    'cross-field-rookie': `练习把你的转行故事用1分钟讲清楚——这是${j}面试中最关键的1分钟`,
    'written-test-king': `${v.openers[2]}练习用语言讲一个算法题的解题思路——不是写代码，是说人话`,
    'offer-hesitator': `练习回答「你为什么还在面试」——${j}的面试官大概率会问，真诚就是加分`,
  };

  const w9 = {
    'mass-applyer': `出声！把${j}可能问的问题答案念出来，念出声和心里默念是完全不同的`,
    'resume-anxious': `录一段你回答「介绍一下自己」的语音，睡前听一遍——你会觉得这人还行`,
    'jd-perfectionist': `用计时器模拟${j}的面试节奏——每个回答控制在2分钟以内`,
    'ddl-sprinter': `找一个人随机问问题，你即兴回答——训练${j}面试的临场感`,
    'big-firm-only': `模拟${j}大厂常见的压力追问——让对方在你回答后追问「还有呢？」`,
    'broad-net': `在B站找一个模拟面试视频，跟着面试者的思路一起回答`,
    'over-preparer': `让朋友随机问你3个你没想到的问题——${j}面试大概率有这种意外`,
    'zen-master': `把你想在${j}面试中讲的内容讲给一个完全不懂技术的人听`,
    'project-refactorer': `把你的项目用一段话讲给一个外行听——如果对方听懂了，${j}的HR也能听懂`,
    'intern-only': `用实习中的实际案例练习是好的——但也要准备「如果实习和${j}冲突」的回答`,
    'emo-recoverer': `和朋友玩角色扮演：你是${j}的面试官，朋友来面试你`,
    'long-planner': `用计时器严格控制回答时间——${j}面试官给了30分钟不可能让你一个人讲25分钟`,
    'resume-edit-loop': `把你的自我介绍录音，听回放——能接受就过，不要再录了`,
    'cross-field-rookie': `找一个人听你讲转行理由——好的转行故事应该让听众说「有道理」`,
    'written-test-king': `${v.openers[0]}讲一遍你的刷题心得——用故事而不是成绩单`,
    'offer-hesitator': `和你的mentor或信任的人模拟一遍${j}的面试场景`,
  };

  const w8 = {
    'mass-applyer': `打开摄像头录一段模拟面试，看回放——表情管理和内容一样重要`,
    'resume-anxious': `每天花5分钟出声回答一个${j}可能问的问题——坚持到面试那天`,
    'jd-perfectionist': `录音回答${j}的3个技术问题，逐句分析：有没有口头禅？逻辑清晰吗？`,
    'ddl-sprinter': `用${d}天每天练一个问题：今天自我介绍、明天项目经历、后天技术问答`,
    'big-firm-only': `对着镜子练表情管理——${j}大厂面试官会观察你的非语言信号`,
    'broad-net': `和朋友互相模拟面试——你面他，他面你，压力减半`,
    'over-preparer': `删掉你准备的一半材料——用剩下的一半即兴模拟，效果会更好`,
    'zen-master': `每天洗澡的时候练习回答一个问题——轻松的环境产出自然的回答`,
    'project-refactorer': `给自己录一段模拟面试视频——你会发现自己比你想象的表现得好`,
    'intern-only': `让实习同事用午餐时间帮你模拟10分钟的${j}面试`,
    'emo-recoverer': `录一段你的模拟回答，但这次不要批判自己——只找出一个亮点`,
    'long-planner': `模拟面试安排在${j}真实面试前3天——留时间消化反馈`,
    'resume-edit-loop': `就用你现在的自我介绍版本练——练三遍就够，不是为了让它完美`,
    'cross-field-rookie': `练习回答「你对我们公司有什么了解」——去${j}官网和36氪搜索一下`,
    'written-test-king': `用「是什么-为什么-怎么做」的结构把你的技术知识转化成口语`,
    'offer-hesitator': `练习说一句：「我目前手里确实有offer，但我对${j}的兴趣是真诚的」`,
  };

  const w7 = {
    'mass-applyer': `用微信语音给自己发一段模拟回答，回放的时候你会发现哪些地方磕巴`,
    'resume-anxious': `出声读一遍你整理的回答要点——读出声来，不要默看`,
    'jd-perfectionist': `检查录音中的语速——${j}面试最佳语速是每分钟180-200字`,
    'ddl-sprinter': `把手机立在桌上，假装在视频面试——习惯摄像头会让你${j}面试时更自然`,
    'big-firm-only': `找一篇${j}公司的技术博客，用自己的话复述——练习技术表达`,
    'broad-net': `下载一个AI面试练习App，回答几道通用问题找找感觉`,
    'over-preparer': `扔掉准备了很久的稿子——用关键词即兴回答，你会发现你其实都会`,
    'zen-master': `在窗边站着回答面试问题——换个环境，换个心态`,
    'project-refactorer': `只模拟一个问题：「说说你最近在做的项目」——你能自然讲出来就够了`,
    'intern-only': `模拟被问到「为什么不留用」或「为什么还看外面」的回答`,
    'emo-recoverer': `和朋友一起做模拟面试——但这次你当面试官，你会发现面试没那么可怕`,
    'long-planner': `把模拟面试安排在每天的固定时段——让它成为习惯而不是事件`,
    'resume-edit-loop': `练习被打断后重新组织语言——${j}面试官可能在你讲到一半时插话`,
    'cross-field-rookie': `找一个视频面试App，录一段你的自我介绍——观察自己的肢体语言`,
    'written-test-king': `练习被打断时不被带偏——坚持把你的技术思路讲完`,
    'offer-hesitator': `模拟被问「期望薪资」的回答——准备好一个数字和一个范围`,
  };

  const w5 = {
    'mass-applyer': `花5分钟站直对着空气讲一遍——比你想象的有效100倍`,
    'resume-anxious': `把你的自我介绍写在一张便利贴上——然后不看便利贴讲一遍`,
    'jd-perfectionist': `今天只模拟一个问题：${j}面试中最怕被问到的那一个`,
    'ddl-sprinter': `明天早上刷牙的时候对着镜子讲一遍——每天一次就够`,
    'big-firm-only': `模拟${j}面试时注意你的坐姿——挺直腰会让你的声音更有底气`,
    'broad-net': `吃饭的时候让朋友随便问一道面试题——就当饭桌聊天`,
    'over-preparer': `把准备材料收起来，跟朋友聊天一样聊聊${j}——自然的状态最珍贵`,
    'zen-master': `散步的时候在脑子里过一遍面试流程——身体放松脑子才灵`,
    'project-refactorer': `模拟面试的时候如果卡壳了——停3秒深呼吸，继续，这很正常`,
    'intern-only': `模拟回答如果涉及敏感话题（如实习转正状态），练习如何委婉表达`,
    'emo-recoverer': `对着窗户（不是镜子）讲话——看不到自己的表情会让你更放松`,
    'long-planner': `你已经有完整的模拟计划了——今天只需要按计划执行一小步`,
    'resume-edit-loop': `模拟面试不是排练——不需要一字不差，意思到了就行`,
    'cross-field-rookie': `练习挺胸抬头讲你的故事——自信的肢体语言比完美的措辞更有力`,
    'written-test-king': `练习放慢语速——你思考太快嘴跟不上，${j}面试官需要听懂`,
    'offer-hesitator': `练习说一句「我还在考虑」——你需要这个句子的肌肉记忆`,
  };

  const w3 = {
    'mass-applyer': `把${j}可能问的问题写在便利贴上，抽一张即兴回答——刺激`,
    'resume-anxious': `今天只练一个问题：讲一件你最近解决的技术难题——其他明天再说`,
    'jd-perfectionist': `模拟面试时如果说到一半觉得不好——不要停下来重说，继续说完`,
    'ddl-sprinter': `晚上躺床上时闭眼想象一遍${j}的面试流程——大脑分不清想象和现实`,
    'big-firm-only': `如果有条件，用${j}公司用的视频会议软件练习（Teams/Zoom/飞书）`,
    'broad-net': `睡前花3分钟想象自己正在面${j}——这种心理预演已被证明有效`,
    'over-preparer': `跟Siri或语音助手做一次模拟面试——比跟人说话压力小`,
    'zen-master': `去公园散步时在脑子里模拟面试——自然环境中思维更流畅`,
    'project-refactorer': `模拟面试中如果被问到「你项目的缺点是什么」——诚实回答比完美答案好`,
    'intern-only': `练习把实习经历翻译成${j}面试官能听懂的语言——去掉内部术语`,
    'emo-recoverer': `把模拟面试想象成你在给好朋友提建议——你的语气会自然很多`,
    'long-planner': `把你的模拟面试录音存档——面试结束后回听会看到自己的成长`,
    'resume-edit-loop': `这次模拟面试不允许自己说「我再重来一次」——继续说下去`,
    'cross-field-rookie': `模拟面试时故意让自己出一次错——然后练习自然地修正`,
    'written-test-king': `模拟面试时故意被问一个你不会的技术问题——练习诚实的回答`,
    'offer-hesitator': `练习面对「你是不是在骑驴找马」的质疑——坦率是最好的回应`,
  };

  const w2 = {
    'mass-applyer': `${p}，模拟面试就是演戏——演一个自信的求职者，演着演着就成真的了`,
    'resume-anxious': `${p}，模拟面试的你会比真实的你更紧张——所以正式面${j}时反而更轻松`,
    'jd-perfectionist': `${p}，你的模拟面试可能录了50遍——正式面试时会被允许NG吗？`,
    'ddl-sprinter': `${p}，把模拟面试当成正式面试的彩排——DDL的压力会让彩排效果翻倍`,
    'big-firm-only': `${p}，模拟面试就像是游戏内测——测完bug才上线`,
    'broad-net': `${p}，模拟面试无聊的话就对了——正式面试应该也是这种感觉`,
    'over-preparer': `${p}，你的模拟面试次数可能已经超过正式面试了——该切换模式了`,
    'zen-master': `${p}，模拟面试的最高境界：练到你在正式面试时忘了这是面试`,
    'project-refactorer': `${p}，模拟面试不需要10个版本——1个能跑的就够了`,
    'intern-only': `${p}，实习是你的模拟面试演习场——珍惜每一次和同事交流的机会`,
    'emo-recoverer': `${p}，模拟面试崩溃了没关系——正式面试时你的情绪反而稳定`,
    'long-planner': `${p}，在你的模拟计划里加入一个「随机意外」环节——比如突然换问题`,
    'resume-edit-loop': `${p}，你练一次就够了——真的，第一次往往是最好的`,
    'cross-field-rookie': `${p}，模拟面试中卡壳时别慌——说「让我想一想」在${j}面试中是正常的`,
    'written-test-king': `${p}，模拟面试你肯定也会像刷题一样疯狂练习——但语言这东西，松弛比精准重要`,
    'offer-hesitator': `${p}，模拟面试是心理建设——你已经证明过自己能拿到offer了`,
  };

  return [
    w10[pid], w9[pid], w8[pid],
    w7[pid], w5[pid], w3[pid], w2[pid],
  ];
}

// ---------- 槽位 7：跟进复盘 ----------
function slot7Options(pid: PersonaId, v: VoiceProfile, cat: string): string[] {
  const j = '{{jobName}}'; const d = '{{daysLeft}}'; const p = '{{personaName}}';

  const w10 = {
    'mass-applyer': `投完${j}第三天如果没回复，发一封一句话的跟进邮件，发完就忘`,
    'resume-anxious': `投完${j}别反复刷新邮箱——把刷新邮箱的时间用来投下一个`,
    'jd-perfectionist': `投递${j}后第3个工作日发一封礼貌的跟进邮件，附上简历`,
    'ddl-sprinter': `投完${j}第三天如果没消息，直接私信HR或内推人问一下`,
    'big-firm-only': `${j}大厂处理简历可能1-2周——期间别闲着，继续投其他的`,
    'broad-net': `投完${j}就别管了——继续广撒网，总有一条鱼会上钩`,
    'over-preparer': `投完${j}后不要复盘刚才的投递有没有瑕疵——已经发出去了`,
    'zen-master': `投完${j}记到你的小本本上，然后该干嘛干嘛`,
    'project-refactorer': `投完${j}就move on，别复盘投递过程——复盘你的下一个项目`,
    'intern-only': `投完${j}记下投递日期和渠道——万一实习转正不顺，这是你的Plan B`,
    'emo-recoverer': `投完${j}做一件让你开心的事——分散注意力比安慰自己更管用`,
    'long-planner': `在你的追踪表里记录${j}的投递日期和渠道，设3天后的跟进提醒`,
    'resume-edit-loop': `投完${j}立刻关掉所有相关页面——你现在的工作是等，不是改`,
    'cross-field-rookie': `投完${j}总结一下这次投递的感受——记录下来成长轨迹`,
    'written-test-king': `如果${j}给了笔试没给面试——发邮件礼貌询问进展，同时继续准备`,
    'offer-hesitator': `跟进${j}的进度，但不要因为等它而拖延其他offer的回复`,
  };

  const w9 = {
    'mass-applyer': `3天后给${j}发句「Hi 还在招吗」——多了烦人，少了正好`,
    'resume-anxious': `创建一个小表格记录${j}的投递状态——让「已投递」的可视化减轻焦虑`,
    'jd-perfectionist': `整理${j}的每次沟通记录：日期、方式、内容、下一步`,
    'ddl-sprinter': `别等一周！${j}投递后3天没消息就该跟进了`,
    'big-firm-only': `如果认识${j}公司的员工，礼貌请教进度——内推人的一句话比你十封邮件有用`,
    'broad-net': `发完跟进消息就别再想了——接着投，命运的齿轮会自己转`,
    'over-preparer': `不要写1000字的跟进邮件——3句话：我是谁、我投了啥、我很感兴趣`,
    'zen-master': `等${j}回复的同时保持日常节奏——求职是生活的一部分不是全部`,
    'project-refactorer': `跟进${j}只需要做一次——不回复就是回复`,
    'intern-only': `跟进${j}的同时跟你的实习Leader同步一下——保持信息透明`,
    'emo-recoverer': `如果${j}一直没回复——那不是对你的评价，是HR的inbox太满`,
    'long-planner': `按计划在${j}投递后第3天跟进——提前写好跟进模板`,
    'resume-edit-loop': `给${j}的跟进消息只写一遍——不许修改，直接发`,
    'cross-field-rookie': `即使${j}没回音，每次投递都是一次练习——记录你进步的地方`,
    'written-test-king': `如果${j}的笔试过了但面试安排迟迟不来——主动跟进一次`,
    'offer-hesitator': `跟进${j}的时候，如果你手上的offer有回复期限，明说`,
  };

  const w8 = {
    'mass-applyer': `给${j}的HR发消息：「Hi，之前投了${j}，方便确认下进度吗」——礼貌且直接`,
    'resume-anxious': `每查一次${j}的状态就奖励自己一块糖——把焦虑变成条件反射`,
    'jd-perfectionist': `准备一个跟进模板：问候→自我介绍→投递时间→询问进展→感谢`,
    'ddl-sprinter': `${j}投递超过一周没消息——不是你的问题，是他们的流程慢`,
    'big-firm-only': `在LinkedIn或脉脉上找到${j}的HR或招聘负责人——但不建议直接加好友`,
    'broad-net': `写一个通用的跟进模板，所有的投递复用——节约心力`,
    'over-preparer': `${j}没回复不代表你不够好——只代表HR今天的事还没做完`,
    'zen-master': `把${j}放进你的「已投递待回复」列表，每周统一检查一次`,
    'project-refactorer': `跟进${j}的时候别又开始改简历——跟进的目的是问进展，不是重新推销`,
    'intern-only': `如果你在实习中表现好，让对方公司知道你实习期间的成绩`,
    'emo-recoverer': `把${j}的沉默想象成「HR在认真看你的简历」——给自己一个正面的解释`,
    'long-planner': `按你的跟进计划发邮件——措辞专业但不卑微`,
    'resume-edit-loop': `准备好的跟进邮件立刻发——存草稿超过1小时就会变成改稿`,
    'cross-field-rookie': `跟进消息里提一句你的学习进展——让对方看到你在进步`,
    'written-test-king': `如果${j}给了笔试反馈——不管过没过，都礼貌回复谢谢`,
    'offer-hesitator': `跟进${j}时表明你有时间压力——「我需要在X号之前做决定」`,
  };

  const w7 = {
    'mass-applyer': `把${j}的投递记录截个图做个纪念——不管结果如何你行动了`,
    'resume-anxious': `投了${j}就是胜利——在这个期间多投几个，让${j}不再是你唯一的希望`,
    'jd-perfectionist': `如果${j}超过一周没回复，可以考虑换个渠道再投一次`,
    'ddl-sprinter': `设一个「不再想${j}」的日期——到那天还没回复就move on`,
    'big-firm-only': `大厂的内推人可以看到进度——礼貌地请内推人帮忙看一次状态`,
    'broad-net': `在求职社群里问问有没有人也投了${j}——信息共享减轻焦虑`,
    'over-preparer': `不要分析${j}为什么没回复——你可能永远不会知道原因`,
    'zen-master': `投递${j}后你的心态应该是「随缘但主动」——主动跟进但不执着`,
    'project-refactorer': `在${j}的投递跟进中保持「完成就好」的心态——就像你的项目一样`,
    'intern-only': `跟进${j}的同时更新你的LinkedIn状态——让潜在机会也看得到你`,
    'emo-recoverer': `设一个「${j}心情复查日」——到了那天和朋友聊聊感受`,
    'long-planner': `在每周回顾中更新${j}的状态——它是你求职项目中的一个task`,
    'resume-edit-loop': `跟进${j}的邮件先写在txt里——纯文本不讲排版，你就不纠结了`,
    'cross-field-rookie': `在求职记录里记下${j}的反馈（或没反馈）——这些数据以后有用`,
    'written-test-king': `${j}给你笔试机会已经证明你的简历过关——面试没来不代表你不行`,
    'offer-hesitator': `把你所有在进行的面试画一条时间线——包括${j}，可视化减少焦虑`,
  };

  const w5 = {
    'mass-applyer': `${j}没回就投下一个——求职就是概率游戏，量大出奇迹`,
    'resume-anxious': `如果${j}没回音——再投5个类似的岗位，概率翻倍焦虑减半`,
    'jd-perfectionist': `记录${j}的投递时间线：投递日→跟进日→结果日——用数据代替情绪`,
    'ddl-sprinter': `${j}没消息超过一周——别再等了，继续冲下一个`,
    'big-firm-only': `大厂的回复周期是玄学——${j}可能在等你，也可能已经招到人了`,
    'broad-net': `忘了${j}吧——最好的跟进就是不跟进，投下一个`,
    'over-preparer': `忘掉${j}的最好方法：马上开始准备下一个岗位`,
    'zen-master': `${j}如果没回，就是缘分没到——缘分没到不要强求`,
    'project-refactorer': `不等${j}了——在等的时候你已经可以重构完一个项目了`,
    'intern-only': `跟进${j}但不all-in——实习转正才是你当前最重要的进程`,
    'emo-recoverer': `把${j}的沉默当作一个buffer——你有时间处理自己的情绪`,
    'long-planner': `在计划表中标注${j}的「放弃日期」——过了就归档`,
    'resume-edit-loop': `别刷新${j}的投递状态了——那不会让HR处理得更快`,
    'cross-field-rookie': `即使${j}没回，你在准备过程中学到的技能已经是你的了`,
    'written-test-king': `${j}笔试过了就是过了——面试通知没来是HR的问题不是你的`,
    'offer-hesitator': `与其死等${j}的回复，不如多了解你手中offer的细节`,
  };

  const w3 = {
    'mass-applyer': `${j}杳无音信就下一个——拜拜就拜拜，下一个更乖`,
    'resume-anxious': `不要幻想${j}的HR在认真考虑你——他们可能只是还没看到`,
    'jd-perfectionist': `分析一下${j}的投递转化率：投了多少？回了多少？面了多少？`,
    'ddl-sprinter': `在招聘平台上看到${j}还在招人——那就可以再跟一次`,
    'big-firm-only': `${j}这种公司，有时候需要运气——你有能力，等风来`,
    'broad-net': `${j}没回也许是好事——说明这个公司沟通效率低`,
    'over-preparer': `给${j}的投递写一个「结案陈词」——然后在心理上move on`,
    'zen-master': `回顾你为${j}做的准备——这些技能不会白费，下一个岗位用得上`,
    'project-refactorer': `把为${j}准备的材料归档——下一个类似岗位直接复用`,
    'intern-only': `即使${j}没回，你的实习经历仍然是简历上最有分量的部分`,
    'emo-recoverer': `如果${j}没回让你难过——允许自己难过一天，然后明天继续`,
    'long-planner': `在你的求职报告中标记${j}为「无回应」——这是求职系统的正常数据`,
    'resume-edit-loop': `让${j}去吧——你已经为它改过足够多的简历了`,
    'cross-field-rookie': `${j}没回不代表转行失败——只代表这条路还没通`,
    'written-test-king': `${j}如果笔试过了但不给面试——可能是HC冻结了，不是你的问题`,
    'offer-hesitator': '忘记跟进——把精力放在你手上已有的选择上',
  };

  const w2 = {
    'mass-applyer': `${p}，把${j}忘了吧——下一个更乖，量大管饱`,
    'resume-anxious': `${p}，不回复不是否定——HR的收件箱可能有1000封和你一样的邮件`,
    'jd-perfectionist': `${p}，你为${j}做的跟进计划比大多数人正式简历还详细`,
    'ddl-sprinter': `${p}，等回复比等DDL更煎熬——但你已经习惯了在压力下工作`,
    'big-firm-only': `${p}，大厂HR可能一周后才看到你的邮件——别把沉默当成拒绝`,
    'broad-net': `${p}，广撒网的代价就是有些网会空——但总有一网有鱼`,
    'over-preparer': `${p}，跟进邮件的草稿版本号已经v8了——发吧，v1就够`,
    'zen-master': `${p}，投了就放下——你泡的茶不会因为盯着它凉得更快`,
    'project-refactorer': `${p}，追进度不会让HR回得更快——不如去追你的下一个项目`,
    'intern-only': `${p}，你的实习是最好的跟进信——用成果说话`,
    'emo-recoverer': `${p}，沉默是HR的语言，不是对你的评判——下次投递的结果会不同`,
    'long-planner': `${p}，在你的求职仪表盘上，${j}只是一个待更新的指标`,
    'resume-edit-loop': `${p}，你跟进消息改了N版——其实「您好，请问进展如何」就够了`,
    'cross-field-rookie': `${p}，转行的第一份工作最难——${j}没回不代表之后都没回`,
    'written-test-king': `${p}，你的笔试过了就说明实力被认可——面试只是时间问题`,
    'offer-hesitator': `${p}，与其等${j}，不如多了解你手上offer的成长空间`,
  };

  return [
    w10[pid], w9[pid], w8[pid],
    w7[pid], w5[pid], w3[pid], w2[pid],
  ];
}

// ---------- 槽位 8：心态复位 ----------
function slot8Options(pid: PersonaId, v: VoiceProfile, cat: string): string[] {
  const j = '{{jobName}}'; const d = '{{daysLeft}}'; const p = '{{personaName}}';

  const w10 = {
    'mass-applyer': `完成以上7步，给自己点一杯奶茶——投了就是赚了，${j}只是你撒的网之一`,
    'resume-anxious': `你已经为${j}做了足够多的准备，现在关掉电脑去散个步——你值得休息`,
    'jd-perfectionist': `${j}的准备到这里就够了——完美是80分的敌人，你已经做到了85分`,
    'ddl-sprinter': `在${j}截止前完成了一切——现在去打把游戏或看个电影，你的大脑需要放电`,
    'big-firm-only': `${j}只是你目标中的一家公司——完成准备后把注意力切回生活`,
    'broad-net': `投完${j}就放下，命运帮你安排了什么到时候就知道了——先吃顿好的`,
    'over-preparer': `够了！你已经做得够多了——现在奖励自己一个「不准备」的晚上`,
    'zen-master': `按你的节奏走完了${j}的全部准备流程——保持这个状态，平常心等结果`,
    'project-refactorer': `${v.openers[0]}以上7步你每一步都只做了一遍——没重构，这就是进步`,
    'intern-only': `${j}只是你职业路上的一个可能性——完成准备后把注意力还给自己`,
    'emo-recoverer': `${v.openers[0]}你已经走完了${j}的准备全流程——不管结果如何，你行动了，这就够了`,
    'long-planner': `按照计划完成了${j}的全部准备——这是你求职项目里一个漂亮的milestone`,
    'resume-edit-loop': `你今天的成就是：你投了${j}，而且用的是第一时间写好的版本`,
    'cross-field-rookie': `从迷茫到完成了${j}的完整准备——你已经走了很远了`,
    'written-test-king': `技术准备只是求职的一部分——聊得来的人比答得出的题更重要`,
    'offer-hesitator': `你的选择是甜蜜的烦恼——不管怎选，有能力的人永远有选择`,
  };

  const w9 = {
    'mass-applyer': `来跟我念：${j}只是鱼塘里的一条鱼，这条没上钩还有下一条`,
    'resume-anxious': `${v.openers[0]}你已经比${d}天前的自己更了解这个岗位了——这就是成长`,
    'jd-perfectionist': `关掉${j}相关的所有页面——你的大脑需要清空才能做出更好的判断`,
    'ddl-sprinter': `任务完成！在日历上划掉${j}——没有什么比划掉待办事项更爽的了`,
    'big-firm-only': `你为${j}的准备会让你在类似公司的申请中也受益——这不是孤注一掷`,
    'broad-net': `做完这些你就是求职特种兵了——继续下一个或者休息都随你`,
    'over-preparer': `你为${j}付出的准备时间已经超过必要水平——剩下的事交给命运`,
    'zen-master': `好，${j}的事告一段落。喝茶、散步、做任何和工作无关的事`,
    'project-refactorer': `不重构、不纠结、不回头——你今天的表现已经是满分了`,
    'intern-only': `Plan A是实习转正，Plan B是${j}——你两头都有安排，焦虑什么`,
    'emo-recoverer': `如果${j}让你emo了——那是你在乎这份工作的证明，但别让在乎变成负担`,
    'long-planner': `这一轮${j}的准备工作已经走完流程——在你的计划表上写下「完成」`,
    'resume-edit-loop': `你做了所有该做的事——而且大部分只做了一遍。值得为自己骄傲`,
    'cross-field-rookie': `你已经从「迷茫」进步到「为${j}做完了准备」——这个进步是真实的`,
    'written-test-king': `技术之外你还有很多闪光点——${j}的面试官如果聪明就会看到`,
    'offer-hesitator': `你现在手里有选择，脚下有方向——这已经是很多人羡慕的状态了`,
  };

  const w8 = {
    'mass-applyer': `今天投了${j}+其他几个岗位？数一下投递数量，给自己打个分`,
    'resume-anxious': `写下今天为${j}做的3件事——写出来你会发现比你想象的多`,
    'jd-perfectionist': `回顾${j}的准备全过程：你花了多少时间？哪些步骤可以更快？——但今天先别优化`,
    'ddl-sprinter': `完成了${j}的8步流程！你的DDL爆发力依然在线——记录这次用时，下次更快`,
    'big-firm-only': `${j}只是你职业生涯中的一站——把眼光放远，今天的一次投递影响不了你的大局`,
    'broad-net': `给自己一个小小的庆祝仪式——比如点一份一直想吃的甜品`,
    'over-preparer': `把为${j}准备的材料整理归档——但不要打开看了，归档就是归档`,
    'zen-master': `在笔记本上写一句「${j}完成」——仪式感让大脑确认这件事结束了`,
    'project-refactorer': `今天没有重构任何东西！这是你求职路上里程碑式的一天`,
    'intern-only': `不管${j}结果如何，你现在有两手准备——这种安全感值得庆祝`,
    'emo-recoverer': `今天的所有行动都是你抗焦虑的证明——记录下这个感觉，下次emo时回看`,
    'long-planner': `庆祝这个里程碑的完成！在进度表上给自己画一颗星星`,
    'resume-edit-loop': `你今天做的最重要的事不是改了简历，而是按下了发送键`,
    'cross-field-rookie': `你已经从一个门外走到了${j}的门口——不管门开不开，你已经走到了`,
    'written-test-king': `把${j}的笔试当成技术体检——不管结果如何，你知道自己哪里强哪里弱`,
    'offer-hesitator': `做了一个选择——今天不纠结。把决定推迟到明天，今天只庆祝完成了流程`,
  };

  const w7 = {
    'mass-applyer': `${j}只是你求职生涯中的一个逗号——后面还有整篇文章要写呢`,
    'resume-anxious': `你知道吗，你刚刚为${j}做的一切，换做一个月前的你根本不敢想`,
    'jd-perfectionist': `你为${j}设的标准可能比HR期待的还高——试着放过自己`,
    'ddl-sprinter': `压力释放时间！选一种你的解压方式——运动/游戏/追剧/睡觉`,
    'big-firm-only': `${j}如果没成，不代表大厂梦碎——大厂有几十家，你才投了其中一家`,
    'broad-net': `今天的收获：你离Offer又近了一步——可能是${j}的，也可能是下一个的`,
    'over-preparer': `你为${j}积累的准备资料是你的资产——下一个面试可以直接复用`,
    'zen-master': `观察一下此刻你的状态——不焦虑了？因为你行动了。行动是焦虑的解药`,
    'project-refactorer': `你的准备流程里没有「重构」这个词出现——这就是进步，记住这种感觉`,
    'intern-only': `你在实习+求职双线作战——能坚持到现在，你已经赢了`,
    'emo-recoverer': `今天你没有逃避——你面对了${j}。这份勇气比你想象的大`,
    'long-planner': `反思一下：按计划准备的感受如何？下次哪些步骤可以优化？——但今天只是记下来`,
    'resume-edit-loop': `你今天完成了最难的一件事：在规定时间内停止准备`,
    'cross-field-rookie': `你已经从一个方向模糊的求职者变成了一个有清晰步调的人——恭喜`,
    'written-test-king': `技术是基础，但人是多维的——今天你也练习了技术的另一面`,
    'offer-hesitator': `有选择的人生是幸福的——哪怕选择的过程让人头疼`,
  };

  const w5 = {
    'mass-applyer': `今天的投递成就：${j}。明天目标是：另一个岗位。周而复始，直到上岸`,
    'resume-anxious': `你为${j}跨出的每一步都是勇气的证明——尤其是最后一步投递`,
    'jd-perfectionist': `把对${j}的高标准转化为对自己的认可——你已经做得很好了`,
    'ddl-sprinter': `没到deadline就完成了——这就是进步！下次试试再提前一点`,
    'big-firm-only': `${j}是目标但不是唯一目标——你的能力配得上很多好公司`,
    'broad-net': `今天撒的网里${j}是其中最大的一条——收回来的可能是惊喜`,
    'over-preparer': `告诉自己：我今天为${j}做的已经足够了。这是一个事实不是安慰`,
    'zen-master': `去阳台上站一会儿——窗外的生活和${j}没关系，这才是你的主场`,
    'project-refactorer': `看，你没有重构任何简历内容就完成了${j}的投递——这是可以复制的`,
    'intern-only': `${j}这条线布置好了——现在专注你的实习日常，两手都不放`,
    'emo-recoverer': `你已经证明了你可以不被情绪绑架地行动——这是${j}给你的最大收获`,
    'long-planner': `你在为${j}做准备的过程中展现了规划的力量——这种感觉很好，保持`,
    'resume-edit-loop': `把这次「不再改」的体验作为模板——以后的每一次都这么来`,
    'cross-field-rookie': `从「不知道投什么」到「为${j}完成准备」——这是真实的进步`,
    'written-test-king': `沟通是技术人的第二门编程语言——今天你调试了自己的表达`,
    'offer-hesitator': `今天做过的所有事都是数据——明天你会更清楚自己想要什么`,
  };

  const w3 = {
    'mass-applyer': `如果${j}没回音——恭喜你，排除了一个不合适的选项，省了后面4轮面试`,
    'resume-anxious': `最差的情况是什么？${j}没回。最好的情况？你拿到了面试。这两种你都能承受`,
    'jd-perfectionist': `${j}可能不是你的完美匹配——但你的准备过程让你更接近那个完美匹配`,
    'ddl-sprinter': `如果在DDL前完成了所有步骤——恭喜，你证明了自己不需要DDL也能行动`,
    'big-firm-only': `${j}不是唯一的大厂——把它当成你的热身赛，真正的比赛在后面`,
    'broad-net': `${j}只是你求职路上的一站——下一站可能会更好`,
    'over-preparer': `为自己设一个「庆祝日」——不是为了${j}的结果，是为了你今天的行动`,
    'zen-master': `如果你此刻完全不焦虑——那就对了，行动是最好的镇定剂`,
    'project-refactorer': `你的项目不需要完美，你的求职流程也不需要完美——完成就是满分`,
    'intern-only': `有实习+有备选=有底气——你现在的状态已经比很多人好了`,
    'emo-recoverer': `如果${j}让你emo了——别急着「变好」，先允许自己不开心`,
    'long-planner': `即使计划被打乱——你依然走完了${j}的流程，这就是灵活性`,
    'resume-edit-loop': `今天的MVP（最小可行产品）已经交付了——${j}投递完成`,
    'cross-field-rookie': `不管${j}怎么回复——你学到的技能和清晰的自我认知是你自己的`,
    'written-test-king': `技术可以刷题，但自信需要一次次的行动来积累——今天你又积累了一次`,
    'offer-hesitator': `选择困难是因为你很在乎自己的未来——这是一个优点`,
  };

  const w2 = {
    'mass-applyer': `${p}，如果${j}是条鱼，你就是整片大海——鱼有的是`,
    'resume-anxious': `${p}，你的焦虑是因为你在乎——而在乎的人最终都会有好结果`,
    'jd-perfectionist': `${p}，80%的准备+20%的运气=100%的面试——你已经备齐了前80%`,
    'ddl-sprinter': `${p}，你又一次在最后关头完成了任务——但想象一下如果不等到最后`,
    'big-firm-only': `${p}，大厂梦可以慢慢追——你先从今天投的${j}开始`,
    'broad-net': `${p}，投了${j}就像买了一注彩票——中了高兴，没中就当累积运气`,
    'over-preparer': `${p}，你已经可以给「如何准备面试」开讲座了——现在去轻松一下`,
    'zen-master': `${p}，你已经到了那种境界——事做了，心放下了，结果随缘`,
    'project-refactorer': `${p}，你的最大成就不是完成了${j}的准备——是你在没重构的情况下完成的`,
    'intern-only': `${p}，实习不是牢笼，${j}不是逃路——两个都是你主动选择的可能性`,
    'emo-recoverer': `${p}，像你这样的人最终都会好起来的——因为你在行动，不是停在原地`,
    'long-planner': `${p}，你已经按计划抵达了这一站——下一站也不会例外`,
    'resume-edit-loop': `${p}，为你今天的果断干杯——人生苦短，别让简历挡住了真正的机会`,
    'cross-field-rookie': `${p}，你已经从一个转行迷茫者变成了一个有方向的人——不靠运气，靠行动`,
    'written-test-king': `${p}，你证明了你不只是会刷题的机器——你也能走完整个求职流程`,
    'offer-hesitator': `${p}，选择恐惧是富人病——恭喜你，你在求职这件事上很富有`,
  };

  return [
    w10[pid], w9[pid], w8[pid],
    w7[pid], w5[pid], w3[pid], w2[pid],
  ];
}

// ──────────────────────────────────────
// 三-半：国企/事业单位场景（state-owned）
// ──────────────────────────────────────

function soSlot1(pid: PersonaId, v: VoiceProfile): string[] {
  const j = '{{jobName}}'; const d = '{{daysLeft}}'; const p = '{{personaName}}';
  const m = (arr: string[]) => arr[0]; // opener picker
  const w10 = { 'mass-applyer':`${m(v.openers)}${j}的招聘公告，圈出【专业要求】和【学历门槛】，其他看缘分`, 'resume-anxious':`把${j}的硬性条件列出来，你不用全满足——满足70%就可以冲`, 'jd-perfectionist':`打开${j}的招聘公告，逐条对照硬性条件：专业、学历、政治面貌、四六级`, 'ddl-sprinter':`现在！打开${j}的公告页，只扫一眼关键信息：报名截止、笔试时间`, 'big-firm-only':`${j}的招考公告对标你准备的目标，看看笔试科目有什么不同`, 'broad-net':`大概扫一眼${j}的要求，国央企门槛都差不多，不用逐字研究`, 'over-preparer':`其实${j}的门槛比你想象的低——很多要求是「优先」而不是「必须」`, 'zen-master':`打开${j}的公告，心平气和地看一遍，不急着做决定`, 'project-refactorer':`只看${j}的硬性条件：学历、专业、党员。达标就继续，不达标就换`, 'intern-only':`对比${j}的要求和你的实习经历，找出最能证明你能力的点`, 'emo-recoverer':`正常，${j}的公告看起来吓人——但其实一半以上的要求都不是硬性的`, 'long-planner':`把${j}的各项门槛拆成checklist：硬性条件、加分项、提交材料`, 'resume-edit-loop':`打开${j}的公告，读一遍，关掉——凭记忆说出3个核心要求就够了`, 'cross-field-rookie':`看看${j}的专业要求有没有「相关专业」这个表述——有就是机会`, 'written-test-king':`看${j}的笔试科目：行测+申论还是专业科目？这决定了你的备考方向`, 'offer-hesitator':`把${j}和你手上的其他选择列一张对比表：编制、地点、发展路径` };
  const w9 = { 'mass-applyer':`不需要研究太细，知道${j}要考行测还是专业知识就够`, 'resume-anxious':`你已经具备${j}要求的核心能力——大学四年不会白读`, 'jd-perfectionist':`国央企公告上的「优先考虑」不是必须，你不需要每条都满`, 'ddl-sprinter':`${j}的公告别精读！先看报名方式和截止时间，剩下的后面再补`, 'big-firm-only':`${j}是否对学校层次（双一流/211）有要求？看清硬杠再投入`, 'broad-net':`国企公告都差不多，${j}和其他的大同小异，不用每个都仔细研究`, 'over-preparer':`你会把${j}的公告读5遍——但1遍就够了，真的`, 'zen-master':`大概知道${j}要什么人就行，不必逐字背诵`, 'project-refactorer':`国企招聘公告就是需求文档——圈出必填项，其他都是可选项`, 'intern-only':`看${j}是否对实习经历有加分——多数国企不怎么看重，但你的有关系`, 'emo-recoverer':`把${j}的公告中让你紧张的词圈出来，然后问自己：是硬性还是软性？`, 'long-planner':`第一步永远是搞清楚${j}的硬性条件——知己知彼`, 'resume-edit-loop':`看一眼${j}的报名条件，马上关掉，开始准备材料`, 'cross-field-rookie':`${j}是否有专业大类的要求？大类比具体专业宽松得多`, 'written-test-king':`分析${j}的笔试权重——行测占60%还是40%？重点分配时间`, 'offer-hesitator':`比较${j}的编制类型：事业编还是企业编？差别很大` };
  const w8 = { 'mass-applyer':`花5分钟给${j}打个分：离家距离、薪资范围、稳定程度，过线就准备`, 'resume-anxious':`把${j}的要求分三栏：已满足、学习后可满足、硬伤——你会发现第一栏不短`, 'jd-perfectionist':`给${j}的每条要求打匹配分（1-5），平均3分就可以报名`, 'ddl-sprinter':`${d}天倒计时！今天只做一件事——整理${j}需要的全部报名材料`, 'big-firm-only':`对标${j}的笔试和面试权重，建立备考时间分配表`, 'broad-net':`看一遍${j}，确认没有硬伤（比如户籍限制），没有就准备`, 'over-preparer':`用两个list整理${j}：已满足 vs 待补充——第一个list就是你的信心来源`, 'zen-master':`花两分钟看完${j}的公告，然后关掉，开始做`, 'project-refactorer':`给${j}画重点：只圈笔试科目和面试形式，其他是噪音`, 'intern-only':`对比${j}和你实习内容的匹配度，写出3个你能讲的点`, 'emo-recoverer':`找张纸列出${j}让你担心和让你有信心的点各3个`, 'long-planner':`用Excel列出${j}的报名条件checklist，打勾的比你想的多`, 'resume-edit-loop':`设置5分钟闹钟，时间到了就停止研究${j}的要求`, 'cross-field-rookie':`${j}的要求中你已经会的和需要学的分两列——第一列比你想的长`, 'written-test-king':`给${j}的笔试科目分配时间：行测X小时、申论Y小时、专业Z小时`, 'offer-hesitator':`${j}的稳定性+发展空间 vs 手里offer的薪资——画张权衡表` };
  const w7 = { 'mass-applyer':`问问上届考进类似单位的学长学姐怎么看${j}，比自己研究快10倍`, 'resume-anxious':`大部分报名${j}的人也只满足60-70%的条件，你并不差`, 'jd-perfectionist':`翻翻${j}单位官网的新闻，了解他们的业务重点和文化`, 'ddl-sprinter':`别自己琢磨了，加一个${j}的备考群，大家的信息比你一个人收集的快`, 'big-firm-only':`问问在这个系统工作的人${j}单位的真实情况，公告写的和实际可能不同`, 'broad-net':`类似的国央企岗位很多，${j}只是其中之一，不用紧张`, 'over-preparer':`你的同学可能连${j}的公告都没读完就报名了，你也别太认真`, 'zen-master':`看一眼${j}的发布日期，如果是上周发的就别纠结细节了`, 'project-refactorer':`别人看${j}的公告花2分钟决定报不报，你花2小时——没必要`, 'intern-only':`问问实习单位的正式员工怎么看${j}这样的岗位`, 'emo-recoverer':`放心，报名${j}的人里至少一半和你一样忐忑`, 'long-planner':`把${j}的公告发给一个有经验的前辈看一眼，外部视角很有用`, 'resume-edit-loop':`把${j}的链接发到备考群里，让别人30秒内告诉你重点`, 'cross-field-rookie':`找个已经在国企工作的人聊聊${j}这个方向——比自己研究一周有用`, 'written-test-king':`去粉笔/中公搜一下${j}单位的笔试真题回忆，比盲目刷题高效`, 'offer-hesitator':`把${j}和你手上的offer做成一张对比表，事实比情绪管用` };
  const w5 = { 'mass-applyer':`打开${j}的报名页面就算完成了第一步，明天再填也行`, 'resume-anxious':`今天就做一件事：把${j}的报名材料清单列出来`, 'jd-perfectionist':`只看${j}的「招聘岗位」表格那一段，其他先不管`, 'ddl-sprinter':`把${j}的报名截止日期记到手机日历，设提前两天的提醒`, 'big-firm-only':`在知乎/小红书搜一下${j}这个单位的评价，了解真实氛围`, 'broad-net':`手机截个${j}的报名入口页面就算第一步完成了`, 'over-preparer':`不用把${j}的公告看完——看到「报名方式」那里就够了`, 'zen-master':`把${j}的公告存到书签，今天的事就是打开它`, 'project-refactorer':`看${j}的薪资待遇范围，能接受就开始准备`, 'intern-only':`对比一下${j}和你实习单位的企业文化差异——这是你的独特视角`, 'emo-recoverer':`打开${j}的页面，深呼吸三次，然后关掉——今天的工作完成了`, 'long-planner':`在日历上标注${j}的关键节点：报名截止、笔试通知、面试`, 'resume-edit-loop':`把${j}的报名链接复制下来，发给自己明天的微信`, 'cross-field-rookie':`在B站/知乎搜${j}这个行业的新人分享，建立初步认知`, 'written-test-king':`找到${j}往年笔试的科目和题型回忆，开始有方向地准备`, 'offer-hesitator':`想一想${j}在5年后的稳定性——这是国央企最大的优势` };
  const w3 = { 'mass-applyer':`花1分钟决定要不要报${j}，超过1分钟就是在内耗`, 'resume-anxious':`${j}可能不是你最理想的，但作为保底选项非常合适`, 'jd-perfectionist':`如果${j}每条你都满足，说明这个岗位配不上你——你应该往上报`, 'ddl-sprinter':`如果${j}明天截止，你现在要做的就是打开报名系统填表`, 'big-firm-only':`${j}不是唯一的体制内选择，但先把它当对标目标来准备`, 'broad-net':`${j}不是你唯一的机会——国央企考试多得很，随便报`, 'over-preparer':`如果${j}明天就考试，你觉得哪里最心虚？只补那一块`, 'zen-master':`${j}的机会还有很多——国央企系统庞大，不差这一个`, 'project-refactorer':`不要纠结${j}的单位排名——进去之后的发展才是关键`, 'intern-only':`如果你实习转正不确定，${j}就是你最好的Plan B`, 'emo-recoverer':`假设${j}已经没戏了（当然还没），你还会准备其他考试吗？`, 'long-planner':`${j}可能在你备考时已经招满了——所以要快但别慌`, 'resume-edit-loop':`把${j}的公告打印出来贴墙上——看完20遍你就麻木了，然后去报名`, 'cross-field-rookie':`${j}可能不是你最终方向，但它能帮你打开体制内的大门`, 'written-test-king':`${j}的笔试大概率60分就进面——你不需要考满分`, 'offer-hesitator':`假设${j}明天给offer，你选它还是选手上的？先想清楚` };
  const w2 = { 'mass-applyer':`${p}，研究国央企招聘的正确姿势：Ctrl+F搜「专业要求」四个字，其他看心情`, 'resume-anxious':`${p}，公告不是圣旨——是HR写的愿望清单，愿望嘛，不一定要全实现`, 'jd-perfectionist':`${p}，国央企公告写了10条要求，面试官自己可能只记得3条`, 'ddl-sprinter':`${p}，别在研究公告上花${d}天——你只有${d}天了！`, 'big-firm-only':`${p}，头部央企的公告往往最简略——实际进去才知道`, 'broad-net':`${p}，看完国央企公告不焦虑算你赢——但焦虑完记得报名`, 'over-preparer':`${p}，公告上的「精通」可能只是「学过」，别被吓到`, 'zen-master':`${p}，公告看完喝杯茶，心平气和地准备报名材料`, 'project-refactorer':`${p}，国企公告是别人写的需求文档——不用你重构，读就完了`, 'intern-only':`${p}，国企校招公告和社招公告是两种文体，校招更看重基础`, 'emo-recoverer':`${p}，公告没写的是：他们也在等一个像你这样的年轻人`, 'long-planner':`${p}，把公告当项目计划书读——你是项目经理，分析它而不是被它吓到`, 'resume-edit-loop':`${p}，国央企公告最多看三遍——超过就是你在给自己加戏`, 'cross-field-rookie':`${p}，国央企公告对转行者来说是一张导航图——不是判决书`, 'written-test-king':`${p}，考试考的是行测，公告写的是理想——先备考，别看理想`, 'offer-hesitator':`${p}，在公告上纠结的时间够你刷一套行测题了` };
  return [w10[pid],w9[pid],w8[pid],w7[pid],w5[pid],w3[pid],w2[pid]];
}

function soSlot2(pid: PersonaId, v: VoiceProfile): string[] {
  const j='{{jobName}}';const d='{{daysLeft}}';const p='{{personaName}}';
  const w10:Record<string,string>={'mass-applyer':`把简历上跟${j}最相关的3个关键词加粗，政治面貌写清楚，5分钟搞定`,'resume-anxious':`你的简历比你以为的好，针对${j}微调2处就够了：加上政治面貌和学生干部经历`,'jd-perfectionist':`对照${j}的要求，把简历里的关键词对齐——只改措辞，不改内容`,'ddl-sprinter':`现在打开简历！把${j}相关的学生工作和获奖经历提到最前面`,'big-firm-only':`把你的简历往${j}的央企标准靠——突出组织能力和综合素质`,'broad-net':`简历标题改成"应聘${j}"，改一个字也算改，别纠结`,'over-preparer':`改简历给自己一个硬限制：只改30分钟，超时就停`,'zen-master':`打开简历对照${j}的要求，只改最显眼的三行`,'project-refactorer':`别重构简历！用现在的版本，只把${j}看重的综合素质往前放`,'intern-only':`在简历上加实习经历——${j}这种岗位对实战经验很看重`,'emo-recoverer':`你的简历已经不错了，针对${j}改一句话就够`,'long-planner':`打开简历模板，按${j}的要求填"能力匹配"那一栏`,'resume-edit-loop':`现在你这版简历就是最终版，只允许改3个词——针对${j}`,'cross-field-rookie':`在简历里用一句话说明你为转${j}方向做了什么准备`,'written-test-king':`简历突出学习能力和应试能力——国央企筛简历看综合素质`,'offer-hesitator':`针对${j}，在简历里强调你的稳定性和长期规划`};
  const w9:Record<string,string>={'mass-applyer':`不用大改，把${j}的名字写在简历目标栏，匹配度直接+20%`,'resume-anxious':`你的经历里一定有和${j}沾边的——学生工作、志愿活动、党员活动都算`,'jd-perfectionist':`简历不是自传，是${j}的匹配报告——写他们想看的`,'ddl-sprinter':`先改第一屏——个人信息+政治面貌+学历，那是HR最先看的`,'big-firm-only':`把${j}单位的企业文化关键词埋到你的自我评价里`,'broad-net':`另存为新文件，文件名"${j}版"，心理上就改完了`,'over-preparer':`你的简历已经比大部分报名者好了，为${j}最多微调格式`,'zen-master':`简历已经够用，加一句"期待加入${j}"就报名`,'project-refactorer':`简历不是GitHub——${j}的HR只看最近最相关的内容`,'intern-only':`量化实习期间的成绩（比如经手X万数据），${j}的HR也爱看数字`,'emo-recoverer':`简历上最近一段经历就够了，不需要把大学四年全写上去`,'long-planner':`定量化你的成果——${j}的HR扫简历第一眼找数字`,'resume-edit-loop':`另存为PDF，文件名"报名${j}"，不许打开编辑器`,'cross-field-rookie':`用${j}这个行业的语言重新描述你原专业的经历`,'written-test-king':`简历里加你的专业排名或奖学金——${j}这种岗位很看重`,'offer-hesitator':`把你在其他面试中展示过的亮点也写进${j}的简历版本`};
  const w8:Record<string,string>={'mass-applyer':`打开${j}的公告另开一个窗口，对着要求把简历的关键词对齐`,'resume-anxious':`拿荧光笔标出简历里和${j}匹配的内容——标出来的部分比你想象的多`,'jd-perfectionist':`把${j}的要求和简历做逐行对照，匹配项用荧光笔标记`,'ddl-sprinter':`简历顶部写"应聘${j}"，整份简历不用大动`,'big-firm-only':`用STAR法则改写学生干部经历——${j}面试官喜欢听结构化故事`,'broad-net':`技能栏的关键词改成${j}公告里的说法，哪怕意思一样`,'over-preparer':`简历控制在1页，${j}的HR初筛只有15秒`,'zen-master':`检查简历的错别字和日期——这是底线`,'project-refactorer':`把你的经历按和${j}的相关度排序，最相关的放最上面`,'intern-only':`用STAR法则改写实习经历，${j}面试官会被引导着问`,'emo-recoverer':`改简历前先喝杯水——这份简历已经帮别人拿到过面试了`,'long-planner':`用"动宾+数字+结果"的格式改写每条经历，适配${j}`,'resume-edit-loop':`设15分钟计时器，到点必须存为PDF`,'cross-field-rookie':`在简历里加一个和${j}方向相关的学习项目，证明学习能力`,'written-test-king':`简历的证书栏按含金量排序——${j}筛简历会看证书`,'offer-hesitator':`按${j}的岗位方向把最相关的2个经历放第一页最上面`};
  const w7:Record<string,string>={'mass-applyer':`找个人帮你扫一眼简历，外人3秒看出的问题你自己3天看不出来`,'resume-anxious':`把简历发给一个信任的人，问"如果你是${j}的HR你会给我笔试机会吗"`,'jd-perfectionist':`找一篇${j}单位的面经，看面试官问了什么，倒推简历该突出什么`,'ddl-sprinter':`别自己改！把简历和${j}的要求一起发给朋友，取第一条建议`,'big-firm-only':`看看${j}单位官网的"员工风采"，用类似的语言写自我评价`,'broad-net':`参考已上岸类似${j}岗位的人的简历格式，但别抄内容`,'over-preparer':`把简历发备考群里求反馈——只听前3条，多了就乱`,'zen-master':`让一个外行朋友看你的简历——他看懂的部分就是HR也会看的`,'project-refactorer':`去WPS找个好看的简历模板，把内容填进去，别再自己设计`,'intern-only':`让实习同事帮忙看简历——他们知道${j}这样的岗位看重什么`,'emo-recoverer':`把简历给一个不太熟的人看——他们的评价更接近HR视角`,'long-planner':`找一个在${j}类似单位工作的前辈，问筛简历看重什么`,'resume-edit-loop':`把简历发给说话直接的朋友，让他们用一句话说要删什么`,'cross-field-rookie':`找成功上岸的人要份简历参考，${j}方向的更佳`,'written-test-king':`简历给一个非技术朋友看——能看懂就对了`,'offer-hesitator':`让信任的mentor看看你为${j}准备的简历版本`};
  const w5:Record<string,string>={'mass-applyer':`复制上一份简历，文件名改成"${j}版"，完成了80%`,'resume-anxious':`简历不用完美——你报名过程中会自然迭代`,'jd-perfectionist':`如果你已经改了超过30分钟，停下来，用当前版本`,'ddl-sprinter':`简历改完第一页就能报名——第二页HR基本不看`,'big-firm-only':`简历里用${j}单位的价值观关键词（去官网找），HR吃这套`,'broad-net':`不知道改什么就加一句"愿意长期在XX行业发展"，有时候就够了`,'over-preparer':`你现在的简历版本号大概是v50——v1的时候就能投了`,'zen-master':`改完简历关掉，明天再看一眼，没觉得哪里不对就报名`,'project-refactorer':`简历不需要commit history——你的求职也不是`,'intern-only':`简历目标栏写"${j}方向"，加上实习经历，够了`,'emo-recoverer':`把简历字体调大一点——有时候你只需要这个`,'long-planner':`先用bullet point列出和${j}相关的3个核心卖点再填模板`,'resume-edit-loop':`打开简历，存为PDF，关掉——这就是今天的成果`,'cross-field-rookie':`简历最上面写"正在系统学习${j}方向知识"——诚实且有说服力`,'written-test-king':`简历不需要所有证书全写上——和${j}最相关的5个就够了`,'offer-hesitator':`简历不是越长越好——为${j}定制一页纸版本`};
  const w3:Record<string,string>={'mass-applyer':`简历别写太多，HR看15秒就决定了——给你的简历做个"15秒测试"`,'resume-anxious':`你的简历给别人看时他们说了什么？那些就是你真实的长处`,'jd-perfectionist':`一份好的简历不是"我最优秀"而是"我最适合${j}"——改成后者`,'ddl-sprinter':`考虑用超级简历/WPS模板一键套用，5分钟搞定格式`,'big-firm-only':`想象你是${j}单位的人事处长——你会怎么看这份简历？`,'broad-net':`简历用在线工具生成好看的版本，有时候颜值就是正义`,'over-preparer':`你为${j}准备的简历可能已过度优化——试着删掉一段`,'zen-master':`底线是不犯错：检查邮箱、电话、日期、政治面貌有没有写错`,'project-refactorer':`你的简历可能太学术了——加一句"人话"自我描述`,'intern-only':`简历底部加"可全职到岗时间"——${j}如果是急招会很看重`,'emo-recoverer':`翻出你第一次写的简历和现在对比——你已经进步太多了`,'long-planner':`做A/B版简历实验：两个版本各投5个单位，看哪个回复率高`,'resume-edit-loop':`你改简历的时间已经超过99%的求职者——该停了`,'cross-field-rookie':`不会的技能不要编——写"学习过"比写"精通"在${j}面试中安全得多`,'written-test-king':`简历上的获奖写"校级/省级"——${j}单位筛简历看级别`,'offer-hesitator':`有多个选择这件事本身就可以写进简历——"已有offer，择优选择"是底气`};
  const w2:Record<string,string>={'mass-applyer':`${p}，你的简历和${j}的匹配度不重要——重要的是你报了`,'resume-anxious':`${p}，你的简历比你焦虑时看起来强100倍，信我`,'jd-perfectionist':`${p}，完美简历不存在——${j}的人事处长当年简历也有硬伤`,'ddl-sprinter':`${p}，改简历最快的方法：把${j}的公告当checklist逐条对`,'big-firm-only':`${p}，简历这种东西，央企HR其实看10秒——前3行定生死`,'broad-net':`${p}，改简历的最高境界：改到你自己都忘了改过哪里`,'over-preparer':`${p}，你的简历可能是全国打磨时间最长但投递次数最少的`,'zen-master':`${p}，改简历和泡茶一样——泡太久就苦了`,'project-refactorer':`${p}，简历v47.2-final-FINAL.pdf——看到这种文件名就想打人`,'intern-only':`${p}，简历上写"预备党员"或"中共党员"比你想的有分量`,'emo-recoverer':`${p}，你的简历能打动${j}的HR——如果连你都不信，先看一遍再评价`,'long-planner':`${p}，简历改到第三版就可以停了，边际收益归零`,'resume-edit-loop':`${p}，Ctrl+S按了多少次了？这次直接Ctrl+P打印PDF去报名`,'cross-field-rookie':`${p}，转行报国企的简历秘诀：展示稳定性和学习意愿`,'written-test-king':`${p}，简历不是成绩单——但也别完全不说你的高分科目`,'offer-hesitator':`${p}，简历上写"在X个offer中择优"——让${j}的HR多看一眼`};
  return [w10[pid],w9[pid],w8[pid],w7[pid],w5[pid],w3[pid],w2[pid]];
}

function soSlot3(pid: PersonaId, v: VoiceProfile): string[] {
  const j='{{jobName}}';const d='{{daysLeft}}';const p='{{personaName}}';
  const w10:Record<string,string>={'mass-applyer':`打开${j}的报名入口，材料拖进去，点提交——完事`,'resume-anxious':`今天把${j}报上——报完你就从"观望"变成"备战"了`,'jd-perfectionist':`核对${j}的报名材料：身份证、学历证、报名表、照片——缺一不可`,'ddl-sprinter':`现在！把${j}报了！国央企报名系统经常崩，别等到最后一天`,'big-firm-only':`去${j}的官网/国资委招聘平台/国聘网，选最快的渠道提交`,'broad-net':`把${j}报了，顺便看看同一系统的其他岗位——多报几个`,'over-preparer':`选一个渠道报${j}：官网/国聘网/校招系统——不拘泥于最优`,'zen-master':`在截止前把${j}报了，然后保持日常节奏`,'project-refactorer':`现在！就报${j}！别再迟疑了`,'intern-only':`报${j}时在备注写"有相关实习经验，可提前到岗"`,'emo-recoverer':`深呼吸，然后点下${j}的提交按钮——点完就轻松了`,'long-planner':`按计划今天报名${j}，报完在你的进度表上打勾`,'resume-edit-loop':`把${j}报出去，不许再打开报名表看一眼`,'cross-field-rookie':`选${j}的校招入口报名——校招对转行者最友好`,'written-test-king':`报名时确认${j}的笔试科目——对你来说这是送分项`,'offer-hesitator':`今天就报${j}——报完你就多一个选择，而不是一直犹豫`};
  const w9:Record<string,string>={'mass-applyer':`一口气把${j}和同系统的3个岗位全报了，报名量=机会量`,'resume-anxious':`报${j}之前不要反复检查材料——你第一次检查就对了`,'jd-perfectionist':`确认${j}的材料清单齐全了——报名表+证件照+证书扫描件——然后提交`,'ddl-sprinter':`别管是不是最佳时机，${j}现在开放报名就现在报`,'big-firm-only':`${j}如果有一企多投政策，每个子公司试一个——鸡蛋别放一个篮子`,'broad-net':`国聘网上搜一下${j}，可能有更简单的投递入口`,'over-preparer':`不要因为觉得${j}还没准备好就不报——报名本身就是准备的一部分`,'zen-master':`把报${j}当成今天的一项普通任务，像喝水一样自然`,'project-refactorer':`报${j}只需：填表→上传→提交。你没有理由不做`,'intern-only':`报完${j}在实习日历上标记，别和实习安排冲突`,'emo-recoverer':`报${j}就像发一封邮件——发出去了就完成了，不需要对方秒回`,'long-planner':`确认${j}报名渠道和截止时间，报完在追踪表里记录`,'resume-edit-loop':`提交按钮按下去之后，报名材料就和你没关系了——让人事去判断`,'cross-field-rookie':`报${j}时不要因为专业不完全对口就不报——HR筛选是关键词优先`,'written-test-king':`报完${j}立刻找一套该系统的行测真题，趁热打铁`,'offer-hesitator':`报${j}时不要想"万一考上了怎么办"——先报了再说`};
  const w8:Record<string,string>={'mass-applyer':`${j}的报名截止还有${d}天，今天报完就去刷行测题`,'resume-anxious':`打开${j}的报名页面——你会发现填信息比想象中简单`,'jd-perfectionist':`${j}的报名材料checklist：报名表（必填）+ 证件照+ 证书扫描件`,'ddl-sprinter':`花3分钟检查${j}的报名材料：照片尺寸对不对？证书扫描清楚没？`,'big-firm-only':`${j}报名的黄金时间：公告发布后3-7天，材料准备最充分`,'broad-net':`在国聘网/智联/前程无忧都搜一下，${j}可能在多个平台同步招聘`,'over-preparer':`给${j}写一段简短的报名自荐（200字），但不要超过200字`,'zen-master':`打开${j}的报名系统，确认填的信息都是对的`,'project-refactorer':`报${j}时不要附作品集链接——国企不看GitHub`,'intern-only':`报名自述里写"目前在某单位实习，预计X月结束"`,'emo-recoverer':`把${j}的提交按钮想象成一扇门——推开它，不是拆了它`,'long-planner':`按报名计划，${j}是今天第X个目标`,'resume-edit-loop':`报${j}时选"快速报名"，不给修改留余地`,'cross-field-rookie':`${j}的报名表如果有"个人情况"栏，写你的学习能力和稳定性`,'written-test-king':`如果${j}的报名系统有在线测评，今天直接做了再提交`,'offer-hesitator':`报${j}时在自荐里简短说明你对体制内工作的理解和兴趣`};
  const w7:Record<string,string>={'mass-applyer':`今天的目标：报掉${j}和其他2个单位，凑够3个今天的任务就完成`,'resume-anxious':`报${j}前告诉自己：资格审查没通过也不是对你的否定`,'jd-perfectionist':`找个人一起报——你报${j}，他报他的，互相监督就不纠结`,'ddl-sprinter':`别等最佳时间了——现在就报，现在就是最佳时间`,'big-firm-only':`如果有认识的人在${j}单位，礼貌请教一下报名注意事项`,'broad-net':`手机也能报国聘网——${j}如果在国聘上就APP一键投递`,'over-preparer':`把报${j}这件事告诉一个朋友，让他半小时后问你报了没`,'zen-master':`${j}报了就别反复刷新状态了，国企处理周期长`,'project-refactorer':`提交前最后检查：报名表是不是最新版？照片是不是近期？`,'intern-only':`报${j}前确认好实习安排，别让两边时间冲突`,'emo-recoverer':`让朋友陪你一起报${j}——两个人一起按提交键就没那么紧张`,'long-planner':`在求职追踪表记下${j}的报名时间和渠道`,'resume-edit-loop':`让朋友帮你提交——把账号密码给他，告诉他${j}的报名链接`,'cross-field-rookie':`在应届生论坛搜${j}的报名经验贴，看看同背景的人怎么报的`,'written-test-king':`报完给自己设3天闹钟，3天后开始刷${j}的真题`,'offer-hesitator':`报名时心态放平——你已经有offer了，报${j}是锦上添花`};
  const w5:Record<string,string>={'mass-applyer':`把${j}的报名链接存桌面，看到了就顺手报`,'resume-anxious':`先别想结果，把${j}报出去这个动作本身就是胜利`,'jd-perfectionist':`如果你在纠结用哪个邮箱报${j}——用最常用的那个就行`,'ddl-sprinter':`${j}的提交按钮就在那里，按一下又不会触电`,'big-firm-only':`央企报名系统有时很难用——${j}如果卡住了换个浏览器`,'broad-net':`报名时选择"服从调剂"——报国央企多一个机会`,'over-preparer':`不要等到"完全准备好"——那一天的${j}可能已经截止了`,'zen-master':`提交前那一秒犹豫是正常的，提交之后反而安心了`,'project-refactorer':`报${j}比反复看${j}的公告重要100倍`,'intern-only':`把${j}当作实习转正的备份——报了不亏`,'emo-recoverer':`提交的那一刻你会感到一种奇妙的轻松——试试看`,'long-planner':`${j}在你的报名计划中可能权重不高，但报了就是进度`,'resume-edit-loop':`闭上眼睛点提交，然后立刻关掉网页`,'cross-field-rookie':`不要因为${j}写了"相关专业优先"就不报——是"优先"不是"必须"`,'written-test-king':`报完${j}就当给自己买了张彩票——中不中看天，买不买看你`,'offer-hesitator':`你已经证明过自己能拿offer——报${j}只是个加选项的游戏`};
  const w3:Record<string,string>={'mass-applyer':`今天不报${j}的话，明天你可能就忘了这个岗位的存在`,'resume-anxious':`如果不报${j}，你永远不知道结果——而不知道比没通过更内耗`,'jd-perfectionist':`报${j}前先回答：如果不报，你会后悔吗？`,'ddl-sprinter':`${j}有没有"一键报名"？——有的话1分钟都别多花`,'big-firm-only':`${j}的报名系统如果要求填一堆——先填必填项，选填跳过`,'broad-net':`花5分钟在多个平台搜一下${j}，说不定有更简单的报名入口`,'over-preparer':`假设${j}明天截止报名，你现在还缺什么？缺的值得今天补吗？`,'zen-master':`报${j}是一瞬间的事，纠结报不报才是消耗精力的事`,'project-refactorer':`你为${j}准备的简历版如果超过3个——选最新的那个`,'intern-only':`报${j}时想想：这次报名可能决定你毕业后的第一份工作`,'emo-recoverer':`你的emo可能需要3天恢复，但${j}的报名只需要3分钟`,'long-planner':`计划中${j}的报名窗口还剩${d}天，今天是最轻松的一天`,'resume-edit-loop':`把手从鼠标上拿开，深呼吸，然后点提交`,'cross-field-rookie':`不要等准备完再报${j}——你永远准备不完，先报再说`,'written-test-king':`报了${j}之后如果收到笔试通知，那就是你擅长的战场了`,'offer-hesitator':`纠结要不要报的时间，够你把${j}报了然后再纠结去不去`};
  const w2:Record<string,string>={'mass-applyer':`${p}，报${j}就像撒网——网撒出去之前你永远不知道能捞到什么`,'resume-anxious':`${p}，你是简历焦虑不是报名焦虑——提交那一刻焦虑就结束了`,'jd-perfectionist':`${p}，最佳的报名时机=现在。最佳的报名状态=差不多就行`,'ddl-sprinter':`${p}，别等"准备好了"，那和"等死"在求职里是同义词`,'big-firm-only':`${p}，央企的报名系统再难用也要报——因为值得`,'broad-net':`${p}，报名是一种行为艺术——报得越多，上岸概率越大`,'over-preparer':`${p}，你可能是全世界报名前准备最充分但报名次数最少的人`,'zen-master':`${p}，报不报随缘，但缘分不会自己来敲门`,'project-refactorer':`${p}，你的commit记录很多，报名记录很少——该平衡了`,'intern-only':`${p}，实习是主路，${j}是辅路——两条路都走走看`,'emo-recoverer':`${p}，报${j}就像表白——最差也就是资格审查没通过`,'long-planner':`${p}，你的计划写得很完美了——现在执行第一步：报${j}`,'resume-edit-loop':`${p}，送你一句咒语："资格审查不通过也是结果"——报！`,'cross-field-rookie':`${p}，你不是零基础，你是从另一座山翻过来的登山者`,'written-test-king':`${p}，报了才有笔试机会，笔试才是你上岸的主场`,'offer-hesitator':`${p}，多一个选择不是负担，是筹码——报${j}就是加筹码`};
  return [w10[pid],w9[pid],w8[pid],w7[pid],w5[pid],w3[pid],w2[pid]];
}

function soSlot4(pid: PersonaId, v: VoiceProfile): string[] {
  const j='{{jobName}}';const d='{{daysLeft}}';const p='{{personaName}}';
  const w10:Record<string,string>={'mass-applyer':`${j}笔试就考行测+申论，去粉笔App刷5套真题找感觉`,'resume-anxious':`别怕${j}的笔试，行测题都有套路——言语和判断你每天都在用`,'jd-perfectionist':`按${j}笔试科目分配时间：行测60%+申论30%+专业知识10%`,'ddl-sprinter':`今天刷3套行测真题的三大模块：言语、判断、资料分析——${j}必考`,'big-firm-only':`${j}的笔试对标省考难度，重点攻克资料分析和数量关系`,'broad-net':`${j}笔试大概率考行测，下载粉笔App随便刷几题就行`,'over-preparer':`${j}笔试你已经准备过头了——行测核心题型你已经掌握了`,'zen-master':`${j}笔试前把图形推理和逻辑判断过一遍，不必深挖`,'project-refactorer':`${j}笔试重点：资料分析！保证正确率90%是底线`,'intern-only':`${j}笔试可能考时政常识——重点复习近半年的重大事件`,'emo-recoverer':`${j}的笔试不是决定生死的考试——考不过的大有人在`,'long-planner':`今天攻克${j}笔试的行测言语模块——片段阅读和逻辑填空`,'resume-edit-loop':`打开粉笔，做一套${j}真题模拟——做完就停，不许反复`,'cross-field-rookie':`${j}笔试对转行者来说：行测是平等的——不考专业，考思维`,'written-test-king':`${j}笔试是你的主场——但申论别忽视，60%的人倒在申论`,'offer-hesitator':`拿${j}的笔试当练手——你已经有多手准备了`};
  const w9:Record<string,string>={'mass-applyer':`打开粉笔App，选国考真题随便刷几题——错了也无所谓`,'resume-anxious':`你已经学过行测思维了，${j}的笔试不会比公考更难`,'jd-perfectionist':`行测+申论+公基三大块各刷5题——${j}笔试覆盖面就这么宽`,'ddl-sprinter':`去B站搜"行测资料分析速成"，找个播放量最高的倍速看完`,'big-firm-only':`${j}这种央企笔试可能有企业文化题——去官网把企业精神背下来`,'broad-net':`去B站搜"国企笔试经验"，找个最新的看完就有方向`,'over-preparer':`${j}笔试你不用把所有题型都学会——拿到60%分就进面了`,'zen-master':`找一个国企笔试真题汇总，每天看10题，保持手感`,'project-refactorer':`别把时间花在整理笔记上——直接刷${j}的真题，错了看解析`,'intern-only':`结合实习中接触的公文和材料，你的申论有天然优势`,'emo-recoverer':`做不出来${j}的行测题不丢人——那些题本来就有15%超难`,'long-planner':`下载粉笔App，利用碎片时间刷${j}笔试的言语和判断`,'resume-edit-loop':`别纠结学行测还是申论——${j}笔试公告写啥就准备啥`,'cross-field-rookie':`${j}笔试最常考的行测题型就那10种——不需要全学会`,'written-test-king':`${j}笔试行测对你很简单——但申论需要手写练3篇`,'offer-hesitator':`${j}笔试过了就当积攒经验，没过也不影响你的其他选择`};
  const w8:Record<string,string>={'mass-applyer':`花30分钟刷粉笔上${j}方向的5组专项练习——一组10题`,'resume-anxious':`把你做过的真题拿出来回顾错题——你比想象中准备得更充分`,'jd-perfectionist':`按${j}笔试权重分配：60%行测，30%申论，10%公基`,'ddl-sprinter':`去粉笔/中公搜"${j}单位 笔试真题"，按时间排序看最近5篇`,'big-firm-only':`央企笔试行测有套路——资料分析题优先保证正确率`,'broad-net':`在粉笔随便找一套国企笔试题做一遍，感受节奏`,'over-preparer':`你已经刷了太多题——今天做一套限时模拟就够了`,'zen-master':`把${j}笔试常见题型做成思维导图，心里有数`,'project-refactorer':`${j}笔试不求全对——资料分析和判断推理优先保证`,'intern-only':`结合实习中的实际工作准备${j}笔试的公文写作题`,'emo-recoverer':`做一套不限时的行测题感受一下——不用打分`,'long-planner':`用Notion做${j}笔试的知识点checklist，逐一过关`,'resume-edit-loop':`别纠结该买哪个机构的课——粉笔免费题库就够了`,'cross-field-rookie':`准备${j}笔试优先级：言语>判断>资料分析>数量`,'written-test-king':`你的行测已经很强——但申论需要分配更多时间`,'offer-hesitator':`把${j}的笔试难度当标尺——衡量是否值得全力以赴`};
  const w7:Record<string,string>={'mass-applyer':`去粉笔圈子找一个国企备考小组，看看别人怎么准备的`,'resume-anxious':`找一套${j}的模拟题，不限时、不评分地做一遍——就当闯关`,'jd-perfectionist':`去小红书搜${j}单位的笔试经验帖，记录高频考点`,'ddl-sprinter':`找个也在备考国企的同学互相出题——事半功倍`,'big-firm-only':`央企必考：时政热点+企业文化——这两个背了就是送分`,'broad-net':`在抖音/小红书搜"国企笔试"，吃饭时刷几条`,'over-preparer':`你的知识储备够了——现在需要的是模拟真实考试时间压力`,'zen-master':`随便找一道图形推理，做不出来就看解析——不勉强`,'project-refactorer':`别再收集第11份笔试资料了——在现有10份里挑一份看完`,'intern-only':`问问实习单位考过编的同事怎么准备${j}的笔试`,'emo-recoverer':`笔试只是第一关——这一关不需要完美，过线就行`,'long-planner':`设定${j}笔试准备的里程碑——每完成一个模块给奖励`,'resume-edit-loop':`去粉笔随便点一套行测题做30分钟——训练决断力`,'cross-field-rookie':`在B站找"国企笔试备考"播放列表，每天看3集`,'written-test-king':`你的行测够了——去了解${j}单位的时政热点和企业文化`,'offer-hesitator':`把${j}笔试当作验证"这单位值不值得"的一个数据点`};
  const w5:Record<string,string>={'mass-applyer':`手机上装粉笔App，通勤时刷两道行测`,'resume-anxious':`你学过的每一种题型都是准备——${j}只是另一套题`,'jd-perfectionist':`把${j}笔试最可能的5个考点列出来，搞定一个划一个`,'ddl-sprinter':`打开粉笔，随便做一套真题找手感——别管对错`,'big-firm-only':`${j}笔试前夜：别学新的，回顾错题本`,'broad-net':`把${j}笔试当成一次免费的行测模拟考，反正不花钱`,'over-preparer':`你准备的比${j}笔试范围还广——收窄到最可能考的3个方向`,'zen-master':`笔试前一天好好睡觉——大脑清醒比多刷一套题有用`,'project-refactorer':`别为了${j}的笔试报几千块的培训班——免费资源够了`,'intern-only':`在${j}笔试中多用实习积累的案例回答申论题`,'emo-recoverer':`笔试时卡住了很正常——跳过继续，后面还有机会`,'long-planner':`你的笔试准备时间表里还有缓冲期，按部就班就好`,'resume-edit-loop':`用一张纸列出${j}笔试3个最可能考的题型——只准备这3个`,'cross-field-rookie':`${j}笔试不考你是不是本专业——行测对所有人都公平`,'written-test-king':`你已经刷了够多题了——${j}笔试前做一套保持手感就好`,'offer-hesitator':`手上有offer的人做${j}笔试最轻松——反正有保底了`};
  const w3:Record<string,string>={'mass-applyer':`打开粉笔App随便刷几题——找找感觉就行，不用对答案`,'resume-anxious':`准备${j}笔试最好的方法：假装你在教一个不会的人做行测`,'jd-perfectionist':`用番茄钟：25分钟专注${j}笔试的一个模块，然后停`,'ddl-sprinter':`如果${j}笔试就在明天——复习错题比学新内容重要3倍`,'big-firm-only':`央企笔试有时考很偏（时政/党史）——别慌，大家也不会`,'broad-net':`考前吃顿好的——${j}的笔试发挥和血糖水平正相关`,'over-preparer':`关掉所有备考资料，凭记忆做一套——你记得的比以为的多`,'zen-master':`${j}笔试只是通往面试的一扇门——门后面才是舞台`,'project-refactorer':`做${j}笔试时优先做会的题——先易后难`,'intern-only':`${j}笔试前不用专门请假——利用碎片时间就够了`,'emo-recoverer':`${j}笔试前听一首你最喜欢的歌——好心情是最好的准备`,'long-planner':`把${j}笔试准备分解成微步骤——每天只完成一个知识点`,'resume-edit-loop':`用纸笔做${j}的行测题——没法修改你就不会纠结了`,'cross-field-rookie':`你不需要成为行测专家——及格就进面了`,'written-test-king':`${j}笔试前只做一件事：睡好觉`,'offer-hesitator':`多一个${j}笔试成绩也能帮你收集信息——至少你知道差距`};
  const w2:Record<string,string>={'mass-applyer':`${p}，行测就像刮彩票——刷得够多总能中的`,'resume-anxious':`${p}，笔试不要你考100分——60分就进面，跟驾照科目一一样`,'jd-perfectionist':`${p}，行测60分就进面——你不需要满分`,'ddl-sprinter':`${p}，用${d}天准备${j}笔试——够了，你的爆发力是平时10倍`,'big-firm-only':`${p}，央企笔试通过率其实不低——敢去考就赢了`,'broad-net':`${p}，笔试能蒙就蒙，蒙完看解析——下次就会了`,'over-preparer':`${p}，你的行测准备已经够拿3个offer——现在只需要自信`,'zen-master':`${p}，笔试就像泡茶——水温够了自然出味道`,'project-refactorer':`${p}，笔试做题不用像写代码那么讲究——做对就行`,'intern-only':`${p}，实习是最好的笔试准备——你已经在实践中学习了`,'emo-recoverer':`${p}，笔试考不过不是失败——是排除了不适合你的单位`,'long-planner':`${p}，规划已经满分——执行从今天开始`,'resume-edit-loop':`${p}，笔试资料你肯定存了10个G——但看完1个G就够了`,'cross-field-rookie':`${p}，转行者最大优势是学习力——行测考的就是学习力`,'written-test-king':`${p}，你刷的题可能比出题人还多——自信点`,'offer-hesitator':`${p}，有offer的人做笔试最轻松——反正已经有保底了`};
  return [w10[pid],w9[pid],w8[pid],w7[pid],w5[pid],w3[pid],w2[pid]];
}

function soSlot5(pid: PersonaId, v: VoiceProfile): string[] {
  const j='{{jobName}}';const d='{{daysLeft}}';const p='{{personaName}}';
  const w10:Record<string,string>={'mass-applyer':`准备2个最能体现你综合素质的例子，${j}结构化面试够用了`,'resume-anxious':`别怕${j}的结构化面试，考官想看到一个真实的你——不是完美的你`,'jd-perfectionist':`按结构化面试六大题型分类准备：综合分析、应急应变、组织协调是${j}最常考的`,'ddl-sprinter':`今天！准备${j}面试核心：一段2分钟的自我介绍+3个支撑案例`,'big-firm-only':`${j}央企面试重点：政治素养+综合素质>专业深度`,'broad-net':`${j}面试准备不用背稿——想清楚你的优势和对岗位的理解就够了`,'over-preparer':`${j}面试准备3个故事就够：你的最大优点、最成功的合作、最大成长`,'zen-master':`${j}面试就当去聊聊天——聊聊你的经历和对工作的理解`,'project-refactorer':`选一个例子就够了！把你最成功的经历用STAR法则写成2分钟讲稿`,'intern-only':`${j}面试重点讲你的实习中体现的责任心和团队协作`,'emo-recoverer':`${j}的考官也是人，他们不是在审判你——是在了解你`,'long-planner':`按计划准备${j}面试：整理经历→分类题型→控制3分钟`,'resume-edit-loop':`把你最好的2个经历各写一段2分钟介绍——就这版不改了`,'cross-field-rookie':`准备一个"为什么转方向来国企"的回答——${j}考官一定会问`,'written-test-king':`${p}，练习把你的强项转化成口头表达——这是${j}面试和笔试最大不同`,'offer-hesitator':`${j}面试中你会被问到"为什么选择体制内"——准备真诚的回答`};
  const w9:Record<string,string>={'mass-applyer':`结构化面试就是聊天——聊你的经历和想法，${j}的考官也想听故事`,'resume-anxious':`把${j}的面试想象成给一个长辈讲你最近在忙什么——自然就好`,'jd-perfectionist':`整理一个"问题-分析-对策"的作答模板，适配${j}结构化面试`,'ddl-sprinter':`别写逐字稿！用bullet point记关键词，${j}面试时自然展开`,'big-firm-only':`央企面试喜欢问"你怎么看XX政策"——准备近半年的时政热点`,'broad-net':`准备${j}面试的方式：打开语音备忘录，自己讲一遍自我介绍`,'over-preparer':`${j}面试你不用准备所有题型——准备好核心故事，其他临场发挥`,'zen-master':`${j}面试前喝杯茶，把心态调到"分享模式"而不是"考试模式"`,'project-refactorer':`别在脑子里重构你的回答了——${j}考官想听真实的想法，不是完美的模板`,'intern-only':`准备一个"实习中最有成就感的一件事"——${j}面试必问`,'emo-recoverer':`${j}的考官可能一天面了十几个人——做一个让他记住的正常人就赢了`,'long-planner':`用Excel列出${j}面试可能问的题型，按优先级排序逐一准备`,'resume-edit-loop':`把自我介绍录音下来听一遍——满意就直接用，不许重录超过3次`,'cross-field-rookie':`准备3个来国企的理由——不是说服${j}的考官，是说服你自己`,'written-test-king':`写下你备考过程中最有收获的3个体会——${j}面试可以当例子讲`,'offer-hesitator':`${j}面试也是你面试他们——准备3个关于岗位和单位的问题问回去`};
  const w8:Record<string,string>={'mass-applyer':`结构化面试六大题型：综合分析、应急应变、人际关系、组织协调、自我认知、岗位匹配`,'resume-anxious':`把${j}面试可能问的5个高频题写纸上，每道题想1个关键词回答`,'jd-perfectionist':`按${j}的招聘公告倒推面试问题：每条要求准备一个"我如何满足"的实例`,'ddl-sprinter':`今天完成${j}面试准备的3件事：自我介绍、核心案例、时政热点`,'big-firm-only':`${j}央企可能有追问环节——准备好"你还有什么要补充的"的回答`,'broad-net':`去应届生论坛搜${j}单位的面经，看最近被问到最多的问题`,'over-preparer':`准备一张小卡片，写3个你最想传达的品质——${j}面试时瞄一眼`,'zen-master':`写一个3句话的自我介绍——你是谁、你有什么能力、你为什么适合${j}`,'project-refactorer':`你的经历已经够好了——现在把"做了什么"翻译成"体现了什么能力"`,'intern-only':`准备一个问题："为什么从实习岗想来体制内"——${j}考官肯定会问`,'emo-recoverer':`准备${j}面试时每准备一个问题就给自己一句鼓励`,'long-planner':`按题型整理每个经历的回答——综合分析类、应急应变类各2个`,'resume-edit-loop':`做一个1分钟版和3分钟版自我介绍——${j}考官可能说"请简要介绍"`,'cross-field-rookie':`把你的原专业和${j}岗位连接——"以前学X，培养了我的Y能力"`,'written-test-king':`准备把抽象概念翻译成大白话——"行测高分说明我的学习能力强"`,'offer-hesitator':`准备一个"我对薪资/发展期望"的坦诚回答——${j}面试到最后可能问`};
  const w7:Record<string,string>={'mass-applyer':`找个人模拟${j}结构化面试，让他随便问——你随便答，就当练习`,'resume-anxious':`找一个人听你讲一遍自我介绍——对方的反应会让你发现你讲得很好`,'jd-perfectionist':`录一段你回答"为什么选择${j}"的音频，听回放——你会发现比想象的好`,'ddl-sprinter':`现在就用手机录一段回答"请自我介绍"的音频，听一遍，再录一次`,'big-firm-only':`找一个在国企工作的前辈mock一次面试——针对${j}问最刁钻的问题`,'broad-net':`在B站找一个结构化面试模拟视频，看看别人怎么应对的`,'over-preparer':`让朋友假装${j}的考官，问那些你没准备的题——训练临场`,'zen-master':`在镜子前讲一遍你的自我介绍——能自然地看着自己说就是准备好了`,'project-refactorer':`把你的职业规划讲给一个外行听——能听懂，${j}的考官也能听懂`,'intern-only':`让实习mentor跟你做一次模拟面试——他们的反馈最贴近实际`,'emo-recoverer':`和朋友约一次模拟面试但把它叫做"聊天练习"——名字影响心态`,'long-planner':`在计划里安排一次真实的模拟面试——找职业规划老师或付费mock`,'resume-edit-loop':`找个人听你讲最得意的经历——他的反馈会让你发现根本不需要再改`,'cross-field-rookie':`找一个上岸国企的前辈mock一次面试——他们视角最接近${j}考官`,'written-test-king':`找一个人扮演${j}考官，只问行为面试题——这是你的弱项要多练`,'offer-hesitator':`在${j}面试中反问考官：这个团队当前最大的挑战是什么？`};
  const w5:Record<string,string>={'mass-applyer':`去应届生论坛搜${j}的面经，看3篇就够——看多了反而乱`,'resume-anxious':`把${j}的面试当成一次分享——你每天都在和人交流，这次也一样`,'jd-perfectionist':`选择${j}面试中最可能被问的1个综合分析题和1个自我认知题——只准备这2个`,'ddl-sprinter':`给${j}的面试准备设倒计时：还有${d}天，今天搞定自我介绍`,'big-firm-only':`央企的面试反馈可能1-2周——${j}面完了心态上就当已完成`,'broad-net':`${j}面试前看看他们单位的官网和最近动态——面试中提到会很加分`,'over-preparer':`你已经准备很多了，${j}面试前只需要做一件事：睡个好觉`,'zen-master':`${j}面试的准备就是回顾你的经历——你每天都和它们在一起`,'project-refactorer':`简化！${j}面试准备只需要：一个故事+一个观点+一个问题`,'intern-only':`${j}面试和实习面试很像——你经历过一次，这次只会更从容`,'emo-recoverer':`${j}面试前给自己写一封"面试后想对自己说的话"`,'long-planner':`${j}面试准备按你的节奏来——你提前规划就是有这种从容`,'resume-edit-loop':`${j}面试准备到此为止——再准备下去就变成逃避了`,'cross-field-rookie':`准备一个"虽然不是科班但我有X优势"的真诚版本`,'written-test-king':`${j}面试中如果被问到不擅长的题型——诚实+结构化分析比硬答好`,'offer-hesitator':`把${j}面试当作为手上的offer做决策而收集信息`};
  const w3:Record<string,string>={'mass-applyer':`面${j}前看看他们单位的官网，知道他们是做什么的就够了`,'resume-anxious':`去面试${j}的路上听一首让你自信的歌——状态决定表现`,'jd-perfectionist':`准备${j}面试时别陷入"如果被问到X我该怎么说"的无限联想`,'ddl-sprinter':`${j}面试前夜：准备好衣服、路线、时间——然后打游戏放松`,'big-firm-only':`如果${j}是央企面试，可能有好几轮——做好持久战准备`,'broad-net':`穿让自己舒服的衣服——体制内面试也看精神面貌`,'over-preparer':`把${j}面试的准备材料锁起来——你不需要再看它们了`,'zen-master':`面试前做一次深呼吸——让自己回到当下`,'project-refactorer':`${j}面试时如果被问到"你还要补充什么"——说"目前就这些，谢谢"`,'intern-only':`${j}面试可能在你实习期间——和考官坦诚你的时间安排`,'emo-recoverer':`把${j}面试当成一次练习——最差的结果就是多了练习机会`,'long-planner':`在日历上标记${j}的面试时间，提前设置提醒`,'resume-edit-loop':`${j}面试是你的舞台不是审判——你已经准备好了`,'cross-field-rookie':`${j}考官可能对你原专业很好奇——那是你的差异化优势`,'written-test-king':`${j}面试时被问到不会的——说"这方面我还想多学习"比瞎编好`,'offer-hesitator':`${j}面试时坦率说出你目前的状态——真诚比套路更能打动考官`};
  const w2:Record<string,string>={'mass-applyer':`${p}，面${j}就像相亲——做自己，合不合适是双向的`,'resume-anxious':`${p}，${j}的考官不是你的老师——是成年人之间的一次专业交流`,'jd-perfectionist':`${p}，结构化面试不是背模板——是让人看到模板之外的你`,'ddl-sprinter':`${p}，你DDL前的爆发力足以搞定${j}任何面试——相信你的肾上腺素`,'big-firm-only':`${p}，进央企面试就像打游戏通关——每一关都在练级`,'broad-net':`${p}，面试就是聊天——聊high了offer就来了`,'over-preparer':`${p}，你背着50页逐字稿去面${j}——但其实考官只想要一个真诚的聊天`,'zen-master':`${p}，面${j}时保持你的佛系心态——考官最怕你这种淡定的`,'project-refactorer':`${p}，考官问你职业规划时——说"先做好本职工作"是国企最想听的`,'intern-only':`${p}，你是实习生但不是小朋友——面${j}时挺直腰杆`,'emo-recoverer':`${p}，没面上就emo三天——但面试本身只需要你坚强30分钟`,'long-planner':`${p}，${j}面试在你的计划表上只是一个小节点——按计划走就好`,'resume-edit-loop':`${p}，你把面试准备当简历一样反复打磨——但其实第一版就够了`,'cross-field-rookie':`${p}，你是从另一座山走过来的人——${j}考官会对你好奇，用好这种好奇`,'written-test-king':`${p}，你的学习能力是硬通货——${j}考官可能面试能力还不如你`,'offer-hesitator':`${p}，${j}考官也会问你为什么还在面——诚实是最好的策略`};
  return [w10[pid],w9[pid],w8[pid],w7[pid],w5[pid],w3[pid],w2[pid]];
}

function soSlot6(pid: PersonaId, v: VoiceProfile): string[] {
  const j='{{jobName}}';const d='{{daysLeft}}';const p='{{personaName}}';
  const w10:Record<string,string>={'mass-applyer':`找3个朋友模拟${j}的无领导讨论——随便一个话题，练30分钟`,'resume-anxious':`群面没那么可怕——${j}的考官看的是你的团队协作，不是你的口才`,'jd-perfectionist':`准备${j}群面中可能扮演的3个角色：leader、timer、记录员——每个都练一遍`,'ddl-sprinter':`今天！找几个人线上模拟${j}的群面——用腾讯会议就行`,'big-firm-only':`${j}央企群面重点：大局观>细节控——发言要站在单位角度想问题`,'broad-net':`随便拉几个也在备考的朋友，线上练一次群面——就当玩狼人杀`,'over-preparer':`关掉你的群面宝典！找几个人即兴讨论一次——真实比完美更重要`,'zen-master':`找个话题和几个朋友随便聊聊——自然的交流就是最好的练习`,'project-refactorer':`找几个备考搭子（线上也行）模拟一次${j}群面——不许提前准备`,'intern-only':`用实习中的团队协作案例作为${j}群面的发言素材`,'emo-recoverer':`把群面想象成大学小组讨论——你经历过无数次了`,'long-planner':`按计划安排一次完整的群面模拟：审题→个人陈述→自由讨论→总结`,'resume-edit-loop':`现在就找3个人约时间——${j}群面模拟，定在本周`,'cross-field-rookie':`群面中不一定要当leader——做最好的timer也能出彩`,'written-test-king':`${v.openers[2]}练习群面中的逻辑表达——就像你解行测题一样结构化`,'offer-hesitator':`练习群面时的观点表达——"我尊重不同意见，但从X角度看……"`};
  const w9:Record<string,string>={'mass-applyer':`发声！在${j}群面中你至少要发3次言——内容其次，态度重要`,'resume-anxious':`录一段你模拟群面发言的语音，睡前听一遍——你会觉得这人还行`,'jd-perfectionist':`用计时器模拟${j}群面节奏——每人发言控制2分钟`,'ddl-sprinter':`找一个人随机给话题，你即兴发表观点——训练群面的临场感`,'big-firm-only':`模拟${j}央企常见的群面题：分配有限资源/排序题——这是最常考的`,'broad-net':`在B站找一个无领导面试视频，跟着面试者的思路一起思考`,'over-preparer':`让朋友随机给一个群面话题，你即兴发言——${j}群面大概率有意外`,'zen-master':`把你对${j}岗位的理解讲给一个完全不懂的人听——练习表达能力`,'project-refactorer':`把你的观点用一段话清楚地说出来——对方听懂了就是胜利`,'intern-only':`用实习中的真实案例练习群面发言——比背诵模板有效10倍`,'emo-recoverer':`和朋友玩角色扮演：你是${j}的群面考官，朋友来面试——反串缓解紧张`,'long-planner':`用计时器严格控制发言时间——${j}群面每人累计不超过5分钟`,'resume-edit-loop':`把你的群面发言录音，听回放——能接受就过，不要再录了`,'cross-field-rookie':`群面中展现你转行的独特视角——"我从X行业的经验中学到……"`,'written-test-king':`${v.openers[0]}讲一遍你的群面逻辑框架——观点→理由→例子`,'offer-hesitator':`和信任的人模拟${j}的群面场景——综合角色练习`};
  const w8:Record<string,string>={'mass-applyer':`群面三要素：观点清晰、尊重他人、推动讨论——${j}考官就看这三点`,'resume-anxious':`每天花5分钟对着一个话题发表观点——坚持到${j}群面那天`,'jd-perfectionist':`录音模拟群面发言，逐句分析：逻辑清晰吗？有无效口头禅吗？`,'ddl-sprinter':`用${d}天每天练一种群面角色：今天leader、明天timer、后天记录员`,'big-firm-only':`对着镜子练表情管理——${j}群面考官会观察你的非语言信号`,'broad-net':`和朋友互相模拟群面——你当timer他当leader，轮流练`,'over-preparer':`删掉准备的一半材料——用剩下的一半即兴模拟，效果更好`,'zen-master':`每天散步时练习发表一个2分钟的观点——放松的状态最自然`,'project-refactorer':`给自己录一段模拟群面发言——你会发现你表现得不差`,'intern-only':`让实习同事用午休时间帮你模拟10分钟的${j}群面`,'emo-recoverer':`录一段你的模拟发言——但不要批判自己，只找亮点`,'long-planner':`群面模拟安排在${j}真群面前3天——留时间消化反馈`,'resume-edit-loop':`就用你现在的发言版本练——练3遍就够，不是让它完美`,'cross-field-rookie':`练习说"我补充一个与众不同的角度"——群面中很加分`,'written-test-king':`用"是什么-为什么-怎么办"的结构组织群面发言`,'offer-hesitator':`练习群面时说："我目前有其他选择，但${j}是我的优先考虑"`};
  const w7:Record<string,string>={'mass-applyer':`用微信语音给自己发一段模拟群面观点——回放发现不足`,'resume-anxious':`出声读一遍你整理的群面发言要点——读出声，不要默看`,'jd-perfectionist':`检查录音中的语速——群面最佳语速是每分钟180-200字`,'ddl-sprinter':`把手机立在桌上，假装视频群面——习惯镜头会让你更自然`,'big-firm-only':`找一篇${j}单位的新闻，用自己的话复述——练时事分析`,'broad-net':`下载一个AI面试练习App，回答几道群面题找感觉`,'over-preparer':`扔掉准备很久的稿子——用关键词即兴发言，你会发现你其实都会`,'zen-master':`在户外站着发表一段观点——换个环境，换个心态`,'project-refactorer':`只练一个：接到话题后30秒内组织出有逻辑的观点`,'intern-only':`模拟被问到"如果团队里有人和你意见不同怎么办"——群面高频题`,'emo-recoverer':`和朋友一起做群面模拟——但这次你当观察者，你会发现没那么可怕`,'long-planner':`把群面模拟安排在每天的固定时段——让它成为习惯`,'resume-edit-loop':`练习被打断后重新组织语言——${j}群面中有人抢话很正常`,'cross-field-rookie':`用腾讯会议录一段你的群面——观察肢体语言和眼神`,'written-test-king':`练习被打断时优雅地让出发言——群面不是辩论赛`,'offer-hesitator':`模拟被问"你为什么同时报其他单位"——准备不卑不亢的回答`};
  const w5:Record<string,string>={'mass-applyer':`花5分钟站直对着空气发表一段观点——比你想的有效100倍`,'resume-anxious':`把你的核心观点写在便利贴上——然后不看便利贴讲一遍`,'jd-perfectionist':`今天只练一个场景：${j}群面中最怕被问到的话题`,'ddl-sprinter':`明早刷牙时对着镜子发表一个观点——每天一次就够`,'big-firm-only':`模拟${j}群面时注意坐姿——挺直腰让声音更有底气`,'broad-net':`吃饭时让朋友随便给个话题——就当饭桌聊天`,'over-preparer':`把材料收起来，跟朋友聊天一样谈谈${j}——自然的状态最珍贵`,'zen-master':`散步时在脑子里过一遍群面流程——身体放松脑子才灵`,'project-refactorer':`模拟群面时如果卡壳了——停3秒深呼吸继续，这很正常`,'intern-only':`练习群面中如何自然提到你的实习经历——不突兀但加分`,'emo-recoverer':`对着窗户（不是镜子）讲话——看不到自己的表情会更放松`,'long-planner':`你已经有群面模拟计划了——今天只需要按计划走一小步`,'resume-edit-loop':`群面模拟不是排练——不需要一字不差，意思到了就行`,'cross-field-rookie':`练习挺胸抬头讲话——自信的肢体比完美的措辞更有说服力`,'written-test-king':`练习放慢语速——你思考太快嘴跟不上，${j}考官需要听懂`,'offer-hesitator':`练习说一句"我还在考虑"——你需要这个句子的肌肉记忆`};
  const w3:Record<string,string>={'mass-applyer':`把${j}可能的群面话题写便利贴上，抽一张即兴发言——刺激`,'resume-anxious':`今天只练一个话题：你最近关注的一个社会热点——其他明天`,'jd-perfectionist':`群面模拟时说到一半觉得不好——不要停下来重说，继续说完`,'ddl-sprinter':`晚上躺床上闭眼想象一遍${j}的群面流程——大脑分不清想象和现实`,'big-firm-only':`如果有条件，找在国企工作的人模拟群面——真实度最高`,'broad-net':`睡前花3分钟想象正在面${j}——这种心理预演已被证明有效`,'over-preparer':`跟Siri或语音助手做一次群面模拟——比跟人说话压力小`,'zen-master':`去公园散步时在脑子里模拟群面——自然环境中思维更流畅`,'project-refactorer':`群面模拟中如果被盯住追问——诚实回答比完美答案好`,'intern-only':`练习把实习经验翻译成群面中的观点——去掉内部术语`,'emo-recoverer':`把群面想象成你在给好朋友出主意——你的语气会自然很多`,'long-planner':`把你的群面模拟录音存档——面完后回听会看到成长`,'resume-edit-loop':`这次群面模拟不允许自己说"重来一次"——继续说下去`,'cross-field-rookie':`群面模拟时故意让自己犯一次错——然后练习自然地修正`,'written-test-king':`群面模拟时故意被问一个你不会的社会热点——练习坦率承认`,'offer-hesitator':`练习面对"你是不是海投"的质疑——坦率是最好的回应`};
  const w2:Record<string,string>={'mass-applyer':`${p}，群面就是过家家——演一个善于合作的人，演着演着就成真了`,'resume-anxious':`${p}，模拟群面的你会比真群面更紧张——所以正式时反而轻松`,'jd-perfectionist':`${p}，你的群面模拟可能做了50遍——但正式群面不允许NG`,'ddl-sprinter':`${p}，把群面当成正式面试彩排——DDL压力让彩排效果翻倍`,'big-firm-only':`${p}，央企群面就是大型圆桌会议——想象你已经是其中一员`,'broad-net':`${p}，群面无聊就对了——正式群面应该也是这种感觉`,'over-preparer':`${p}，你的群面模拟次数可能已经超过正式面试了——该切换了`,'zen-master':`${p}，群面模拟最高境界：练到你正式群面时忘了这是面试`,'project-refactorer':`${p}，群面模拟不需要10个版本——1个自然的状态就够了`,'intern-only':`${p}，实习中的每次团队会议都是群面演习——珍惜每次参与`,'emo-recoverer':`${p}，群面模拟崩溃了没关系——正式群面你的情绪反而稳定`,'long-planner':`${p}，在你的模拟计划里加入"随机意外"环节——比如突然换题`,'resume-edit-loop':`${p}，你练一次就够了——真的，第一次往往是最好的`,'cross-field-rookie':`${p}，群面中卡壳时别慌——说"让我想一想"在${j}群面中是正常的`,'written-test-king':`${p}，群面你肯定也会疯狂练习——但松弛比精准重要`,'offer-hesitator':`${p}，群面是心理建设——你已经证明过自己能拿offer了`};
  return [w10[pid],w9[pid],w8[pid],w7[pid],w5[pid],w3[pid],w2[pid]];
}

function soSlot7(pid: PersonaId, v: VoiceProfile): string[] {
  const j='{{jobName}}';const d='{{daysLeft}}';const p='{{personaName}}';
  const w10:Record<string,string>={'mass-applyer':`报完${j}就该干嘛干嘛——国央企审核周期长，别天天刷状态`,'resume-anxious':`报完${j}别反复刷报名系统——把刷新的时间用来刷行测题`,'jd-perfectionist':`整理${j}的时间线：报名→资格审查→笔试→面试→体检→政审→公示→签约`,'ddl-sprinter':`报完${j}第三天如果系统显示"审核中"——正常，别急`,'big-firm-only':`${j}央企审核可能2-4周——期间继续备考其他单位`,'broad-net':`报完${j}就别管了——继续撒网，国央企考试多得很`,'over-preparer':`报完${j}后不要复盘报名填得有没有瑕疵——已经提交了`,'zen-master':`把${j}记到你的进度表上，然后该干嘛干嘛`,'project-refactorer':`报完${j}就move on——别复盘报名过程，继续准备笔试`,'intern-only':`报完${j}记下报名日期和渠道——这是你的Plan B`,'emo-recoverer':`报完${j}做一件让你开心的事——分散注意力比安慰更管用`,'long-planner':`在追踪表记录${j}关键节点：报名日→预计笔试日→预计面试日`,'resume-edit-loop':`报完${j}立刻关掉所有页面——你现在的工作是备考，不是复盘`,'cross-field-rookie':`报完${j}总结一下感受——记录下来你的成长`,'written-test-king':`如果${j}给了笔试通知——确认时间和科目，开始针对性刷题`,'offer-hesitator':`跟进${j}的进度，但不要因为它拖延其他offer的回复`};
  const w9:Record<string,string>={'mass-applyer':`${j}没回复就备考下一个——国央企求职是持久战`,'resume-anxious':`做一个小表格记录${j}的申请进度——"已报名"的可视化减轻焦虑`,'jd-perfectionist':`记录${j}的每个节点：报名日期、笔试通知日期、成绩公布日期`,'ddl-sprinter':`别等一个月！${j}报名后2周没消息主动看看公告更新`,'big-firm-only':`如果认识${j}系统的前辈，礼貌请教往年节奏——内部视角最有用`,'broad-net':`报完就不想了——接着备考，命运的齿轮会自己转`,'over-preparer':`不要写邮件催${j}的人事部门——国企流程定了催也没用`,'zen-master':`等${j}回复的同时保持日常——备考是生活的一部分`,'project-refactorer':`跟进${j}只需关注官方公告——不更新就是还没进展`,'intern-only':`跟进${j}的同时跟实习Leader同步——保持信息透明`,'emo-recoverer':`如果${j}一直没消息——那不是对你的评价，是体制内的正常节奏`,'long-planner':`按计划在${j}各项节点前做好提醒——提前设日历`,'resume-edit-loop':`给${j}单位的咨询电话只打一次——打多了扣印象分`,'cross-field-rookie':`即使${j}没回音，每次报名都是一次练习——记录你进步的地方`,'written-test-king':`如果${j}的笔试成绩出来了但面试迟迟不发——耐心等，正常现象`,'offer-hesitator':`跟进${j}时，如果其他offer有回复期限——提前做好取舍`};
  const w8:Record<string,string>={'mass-applyer':`关注${j}单位的公众号——笔试面试通知往往比系统更新快`,'resume-anxious':`每天Check一次${j}的状态——多了是内耗，少了是失控`,'jd-perfectionist':`准备一个状态追踪表：报名→资格审核→笔试→面试→体检→政审→公示`,'ddl-sprinter':`${j}报名超过一个月没笔试通知——正常的，继续备考`,'big-firm-only':`关注${j}单位的官方公众号和国资委招聘平台——它们会发通知`,'broad-net':`加一个备考群，大家会互相提醒${j}这类单位的通知`,'over-preparer':`${j}没发通知不代表你不够好——只代表他们流程长`,'zen-master':`把${j}放进"已报名待通知"列表，每周统一检查一次`,'project-refactorer':`跟进${j}别又开始研究公告——跟进的目的是看进展，不是重新纠结`,'intern-only':`如果你在实习中表现好，等${j}通知的同时继续积累经历`,'emo-recoverer':`把${j}的沉默想象成"他们在认真审核"——给自己正面的解释`,'long-planner':`按你计划的节点检查${j}的状态——每个阶段都有对应准备`,'resume-edit-loop':`关注${j}的公众号就够了——存再多查询页面你也不会看`,'cross-field-rookie':`在备考群里关注${j}的进度——集体等待比一个人焦虑好`,'written-test-king':`如果${j}给了笔试通知——确认科目，调整刷题重心`,'offer-hesitator':`跟进${j}时明确你的时间线——"需要在X号前做决定"`};
  const w7:Record<string,string>={'mass-applyer':`把${j}的报名截图做个纪念——不管结果你行动了`,'resume-anxious':`报了${j}就是胜利——多报几个单位，让${j}不再是你唯一希望`,'jd-perfectionist':`如果${j}超过公告上的时间还没通知——可能是整个流程延迟了`,'ddl-sprinter':`设一个"不再想${j}"的日期——到那天还没笔试通知就move on`,'big-firm-only':`可以请教学长学姐${j}单位的招聘节奏——不同系统差别很大`,'broad-net':`在备考群里问问大家${j}的进度——信息共享减轻焦虑`,'over-preparer':`不要分析${j}为什么没发通知——你永远不会知道原因`,'zen-master':`报完${j}心态应该是"随缘但准备着"——继续备考但不执着`,'project-refactorer':`在${j}的申请跟进中保持"完成就好"的心态`,'intern-only':`等${j}通知的同时更新求职状态——让备选机会也能看到你`,'emo-recoverer':`设一个"${j}心情回顾日"——到那天和朋友聊聊感受`,'long-planner':`在每周回顾中更新${j}的状态——它是你求职计划中的一个task`,'resume-edit-loop':`不要天天给${j}人事打电话——国企反感这个`,'cross-field-rookie':`在求职记录里记下${j}的反馈（或没反馈）——这些数据对后续有用`,'written-test-king':`${j}给你笔试机会说明报名材料过关——面试没来不代表不行`,'offer-hesitator':`把所有在进行的申请画一条时间线——包括${j}，可视化减焦虑`};
  const w5:Record<string,string>={'mass-applyer':`${j}没回就报下一个——国央企上岸靠的是覆盖量`,'resume-anxious':`如果${j}没消息——再报3个类似的单位，机会翻倍焦虑减半`,'jd-perfectionist':`记录${j}的时间线：报名日→预计通知日→实际通知日——用数据代替情绪`,'ddl-sprinter':`${j}没消息超过预期时间——别再等了，继续冲下一个`,'big-firm-only':`央企的招聘节奏是玄学——${j}可能在走流程，也可能已内定`,'broad-net':`忘了${j}吧——最好的跟进就是不跟进，报下一个`,'over-preparer':`忘掉${j}的最好方法：马上开始准备下一个单位的笔试`,'zen-master':`${j}如果没回，缘分没到——缘分没到不强求`,'project-refactorer':`不等${j}了——在等的过程中你已经可以刷完整本题库了`,'intern-only':`等${j}但不all-in——实习转正才是你当前最重要的进程`,'emo-recoverer':`把${j}的沉默当作一个buffer——你有时间处理自己的情绪`,'long-planner':`在计划表标注${j}的"放弃等待日"——过了就归档`,'resume-edit-loop':`别刷新${j}的报名系统了——那不会让人事审核得更快`,'cross-field-rookie':`即使${j}没回，你在准备过程中学到的东西已经是你的了`,'written-test-king':`${j}笔试过了就是过了——面试通知没来是流程问题不是你的`,'offer-hesitator':`与其死等${j}的回复，不如多了解手里offer的细节`};
  const w3:Record<string,string>={'mass-applyer':`${j}杳无音信就下一个——拜拜就拜拜，下一个更香`,'resume-anxious':`不要幻想${j}的人事正在认真考虑你——他们可能只是还没排到`,'jd-perfectionist':`分析${j}的报录比——有些岗位竞争比你想的激烈，不中是常态`,'ddl-sprinter':`在国聘网上看到${j}还在招同类岗——那就不用太担心`,'big-firm-only':`${j}这种央企，有时候需要点运气——你有能力，等风来`,'broad-net':`${j}没回也许是好事——说明这个单位效率低，不去也罢`,'over-preparer':`给${j}的报名写一个"心理结案"——然后move on`,'zen-master':`回顾你为${j}做的准备——这些能力不会白费，下一个单位用得上`,'project-refactorer':`把为${j}准备的材料归档——下一个类似单位直接复用`,'intern-only':`即使${j}没回，你的实习经历仍是简历上最有分量的部分`,'emo-recoverer':`如果${j}没回让你难过——允许自己难过一天，明天继续`,'long-planner':`在求职报告中标记${j}为"待通知"——这是系统正常状态`,'resume-edit-loop':`让${j}去吧——你已经为它改过足够多简历了`,'cross-field-rookie':`${j}没回不代表转行失败——只代表这条路还没通`,'written-test-king':`${j}如果笔试过了但不排面试——可能是编制问题，不是你的`,'offer-hesitator':`忘记跟进——把精力放在手上已有的选择上`};
  const w2:Record<string,string>={'mass-applyer':`${p}，把${j}忘了吧——下一个更香，国央企多的是`,'resume-anxious':`${p}，不回复不是否定——人事处可能有一千份材料要看`,'jd-perfectionist':`${p}，你为${j}做的追踪表格比大多数人正式简历还详细`,'ddl-sprinter':`${p}，等通知比等DDL更煎熬——但你已习惯了在压力下工作`,'big-firm-only':`${p}，央企人事可能一个月后才打开你的材料——别把沉默当拒绝`,'broad-net':`${p}，广撒网的代价就是有些网会空——但总有一网有鱼`,'over-preparer':`${p}，等通知的焦虑版本号已经v8了——其实v1时你就该放下的`,'zen-master':`${p}，报了就不看——你泡的茶不会因为盯着它凉得更快`,'project-refactorer':`${p}，反复查看公告不会让人事处理得更快——不如去刷题`,'intern-only':`${p}，你的实习是最好的跟进信——用成果说话`,'emo-recoverer':`${p}，沉默不是对你的评判——下次报名的结果会不同`,'long-planner':`${p}，在你的求职仪表盘上，${j}只是一个待更新的节点`,'resume-edit-loop':`${p}，你公告看了N遍——其实"等通知中"三个字就够了`,'cross-field-rookie':`${p}，转行的第一份体制内工作最难——${j}没回不代表之后都没回`,'written-test-king':`${p}，你的笔试过了说明实力被认可——面试只是时间问题`,'offer-hesitator':`${p}，与其等${j}，不如多了解你手上offer的发展空间`};
  return [w10[pid],w9[pid],w8[pid],w7[pid],w5[pid],w3[pid],w2[pid]];
}

function soSlot8(pid: PersonaId, v: VoiceProfile): string[] {
  const j='{{jobName}}';const d='{{daysLeft}}';const p='{{personaName}}';
  const w10:Record<string,string>={'mass-applyer':`完成以上7步，给自己加个鸡腿——${j}只是你撒的网之一，心态放平`,'resume-anxious':`你已经为${j}做了足够多的准备，现在关掉书去散个步——你值得休息`,'jd-perfectionist':`${j}的准备到这里就够了——国央企备考80分已经很好了`,'ddl-sprinter':`在${j}截止前完成了一切——现在打把游戏，你的大脑需要放电`,'big-firm-only':`${j}只是你体制内目标之一——完成准备后把注意力切回生活`,'broad-net':`报完${j}就放下——命运帮你安排了什么到时候就知道了，先吃顿好的`,'over-preparer':`够了！你已经做得够多了——现在奖励自己一个"不复习"的晚上`,'zen-master':`按你的节奏走完了${j}全部准备流程——平常心，保持状态`,'project-refactorer':`以上7步你每一步都只做了一遍——没反复纠结，这就是进步`,'intern-only':`${j}只是你职业路上一个可能性——完成准备后把注意力还给自己`,'emo-recoverer':`你已经走完了${j}准备全流程——不管结果，你行动了，这就够了`,'long-planner':`按照计划完成${j}的全部准备——这是你求职项目里一个漂亮的milestone`,'resume-edit-loop':`你的成就是：你报了${j}，而且用的是第一时间准备好的材料`,'cross-field-rookie':`从迷茫到完成${j}完整准备——你已经走了很远了`,'written-test-king':`行测只是求职一部分——聊得来比考得好更重要`,'offer-hesitator':`你的选择是甜蜜烦恼——不管怎么选，有能力的人永远有选择`};
  const w9:Record<string,string>={'mass-applyer':`来跟我念：${j}只是大海里的一条鱼，这条没上钩还有下一网`,'resume-anxious':`你已经比${d}天前的自己更了解国央企招聘了——这就是成长`,'jd-perfectionist':`关掉${j}所有相关页面——你的大脑需要清空才能做出更好判断`,'ddl-sprinter':`任务完成！在日历上划掉${j}——没有比划掉待办更爽的`,'big-firm-only':`你为${j}的准备会让你在类似单位申请中也受益——这不是孤注一掷`,'broad-net':`做完这些你就是考编特种兵了——继续下一个或者休息随你`,'over-preparer':`你为${j}付出的准备时间已超过必要水平——剩下的事交给命运`,'zen-master':`好，${j}的事告一段落。喝茶、散步、做和工作无关的事`,'project-refactorer':`不纠结、不回头、不反复——你今天的表现已经是满分了`,'intern-only':`Plan A是实习转正，Plan B是${j}——你两头都有安排，焦虑什么`,'emo-recoverer':`如果${j}让你焦虑——那是你在乎这份工作的证明，别让在乎变成负担`,'long-planner':`这一轮${j}的准备工作已走完流程——在计划表上写下"完成"`,'resume-edit-loop':`你做了所有该做的事——而且大部分只做了一遍。值得为自己骄傲`,'cross-field-rookie':`你已经从"迷茫"进步到"为${j}做完了准备"——这进步是真实的`,'written-test-king':`行测之外你还有很多闪光点——${j}的考官如果聪明就会看到`,'offer-hesitator':`你现在手里有选择脚下有方向——这已经是很多人羡慕的状态了`};
  const w8:Record<string,string>={'mass-applyer':`今天报了${j}和其他几个单位？数一下报名数量，给自己打个分`,'resume-anxious':`写下今天为${j}做的3件事——写出来你会发现比想象的多`,'jd-perfectionist':`回顾${j}准备全过程：你花了多少时间？哪些步骤可以更快？——但今天先别优化`,'ddl-sprinter':`完成${j}的8步流程！你的执行效率依然在线——记录这次用时`,'big-firm-only':`${j}只是你职业生涯中的一站——把眼光放远，今天的报名影响不了大局`,'broad-net':`给自己一个小小的庆祝——比如点一份一直想吃的甜品`,'over-preparer':`把为${j}准备的材料整理归档——但不要打开看了，归档就是归档`,'zen-master':`在笔记本写一句"${j}准备完成"——仪式感让大脑确认结束`,'project-refactorer':`今天没有反复纠结任何东西！这是你求职路上里程碑式的一天`,'intern-only':`不管${j}结果如何，你现在有两手准备——这种安全感值得庆祝`,'emo-recoverer':`今天的所有行动都是你抗焦虑的证明——记录这感觉，以后emo时回看`,'long-planner':`庆祝这个里程碑完成！在进度表上给自己画一颗星星`,'resume-edit-loop':`你今天做的最重要的事不是改了简历——是按下了报名提交键`,'cross-field-rookie':`你已经从一个门外走到了${j}的门口——不管门开不开，你已经到了`,'written-test-king':`把${j}的笔试当成智力体检——不管结果，你知道自己哪里强哪里弱`,'offer-hesitator':`做了个选择——今天不纠结。把决定推迟到明天，今天只庆祝完成`};
  const w7:Record<string,string>={'mass-applyer':`${j}只是你求职生涯一个逗号——后面还有整篇文章要写`,'resume-anxious':`你知道吗，你为${j}做的一切，换做一个月前的你根本不敢想`,'jd-perfectionist':`你为${j}设的标准可能比人事期待还高——试着放过自己`,'ddl-sprinter':`压力释放时间！选一种你的解压方式——运动/游戏/追剧/睡觉`,'big-firm-only':`${j}如果没成，不代表体制内梦碎——国央企有几千家，你才报了一家`,'broad-net':`今天的收获：你离上岸又近了一步——可能是${j}的，也可能是下一个的`,'over-preparer':`你为${j}积累的准备资料是你的资产——下一个单位考试直接复用`,'zen-master':`观察此刻你的状态——不焦虑了？因为你行动了。行动是焦虑的解药`,'project-refactorer':`你的准备流程里没有"反复纠结"这个词——这就是进步`,'intern-only':`你在实习+备考双线作战——能坚持到现在，你已经赢了`,'emo-recoverer':`今天你没有逃避——你面对了${j}。这份勇气比你想象的大`,'long-planner':`反思：按计划准备的感受如何？下次哪些步骤可以优化？——但今天只记下来`,'resume-edit-loop':`你今天完成了最难的事：在规定时间内停止纠结`,'cross-field-rookie':`你已经从方向模糊的求职者变成了有清晰步调的人——恭喜`,'written-test-king':`行测是基础，但人是多维的——今天你也练习了能力之外的一面`,'offer-hesitator':`有选择的人生是幸福的——哪怕选择的过程让人头疼`};
  const w5:Record<string,string>={'mass-applyer':`今天的报名成就：${j}。明天目标是：另一个单位。周而复始，直到上岸`,'resume-anxious':`你为${j}跨出的每一步都是勇气的证明——尤其是报名那一步`,'jd-perfectionist':`把对${j}的高标准转化为对自己的认可——你已经做得很好`,'ddl-sprinter':`没到deadline就完成了——这就是进步！下次试试再提前一点`,'big-firm-only':`${j}是目标但不是唯一目标——你的能力配得上很多好单位`,'broad-net':`今天撒的网里${j}是其中一个大鱼塘——收回来可能是惊喜`,'over-preparer':`告诉自己：我今天为${j}做的已足够。这是事实不是安慰`,'zen-master':`去阳台上站会儿——窗外的生活和${j}没关系，这才是你的主场`,'project-refactorer':`看，你没有反复修改就完成了${j}的报名——这是可以复制的`,'intern-only':`${j}这条线布置好了——现在专注你的实习日常，两手都不放`,'emo-recoverer':`你已证明了可以不被情绪绑架地行动——这是${j}给你的最大收获`,'long-planner':`你为${j}准备过程中展现了规划的力量——这感觉很好，保持`,'resume-edit-loop':`把这次"不再改"的体验作为模板——以后每次都这么来`,'cross-field-rookie':`从"不知道报什么"到"为${j}完成准备"——这是真实的进步`,'written-test-king':`表达是行测之外的第二门功课——今天你练习了自己的表达`,'offer-hesitator':`今天做过的所有事都是数据——明天你会更清楚自己要什么`};
  const w3:Record<string,string>={'mass-applyer':`如果${j}没回音——恭喜，排除了不合适的选项，省了后面好多流程`,'resume-anxious':`最差的情况？${j}没通知。最好的情况？你笔试过了。两种你都能承受`,'jd-perfectionist':`${j}可能不是你的完美匹配——但你的准备让你更接近那个完美匹配`,'ddl-sprinter':`如果在DDL前完成所有步骤——恭喜，你证明了自己不需要DDL也能行动`,'big-firm-only':`${j}不是唯一的体制内选择——把它当热身，真正的比赛在后面`,'broad-net':`${j}只是你求职路上一站——下一站可能会更好`,'over-preparer':`为自己设一个"庆祝日"——不是为了${j}的结果，是为了今天的行动`,'zen-master':`如果你此刻完全不焦虑——那就对了，行动是最好的镇定剂`,'project-refactorer':`你的备考不需要完美，你的求职流程也不需要——完成就是满分`,'intern-only':`有实习+有备选=有底气——你现在状态已经比很多人好`,'emo-recoverer':`如果${j}让你emo了——别急着"变好"，先允许自己不开心`,'long-planner':`即使计划被打乱——你依然走完了${j}流程，这就是灵活性`,'resume-edit-loop':`今天的MVP（最小可行产品）已交付——${j}报名完成`,'cross-field-rookie':`不管${j}怎么回复——你学到的技能和清晰的自我认知是你自己的`,'written-test-king':`行测可以刷题，但自信需要一次次行动来积累——今天你积累了`,'offer-hesitator':`选择困难是因为你在乎自己的未来——这是一个优点`};
  const w2:Record<string,string>={'mass-applyer':`${p}，如果${j}是条鱼，你就是整片大海——国央企几千家，鱼有的是`,'resume-anxious':`${p}，你的焦虑是因为你在乎——而在乎的人最终都会有好结果`,'jd-perfectionist':`${p}，80%准备+20%运气=100%上岸——你已备齐前80%`,'ddl-sprinter':`${p}，你又一次在最后关头完成了——但想象一下如果不等到最后`,'big-firm-only':`${p}，体制内梦可以慢慢追——你从今天报的${j}开始`,'broad-net':`${p}，报${j}就像买彩票——中了高兴，没中就当累积运气`,'over-preparer':`${p}，你已经可以给"如何备考国企"开讲座了——现在去轻松一下`,'zen-master':`${p}，你已经到了那种境界——事做了，心放下了，结果随缘`,'project-refactorer':`${p}，你最大成就不是完成了${j}准备——是你没反复纠结就完成了`,'intern-only':`${p}，实习不是牢笼，${j}不是逃路——两个都是你主动选择的可能性`,'emo-recoverer':`${p}，像你这样的人最终都会好起来的——因为你在行动，不是停在原地`,'long-planner':`${p}，你已按计划抵达这一站——下一站也不会例外`,'resume-edit-loop':`${p}，为你今天的果断干杯——人生苦短，别让纠结挡住真正的机会`,'cross-field-rookie':`${p}，你已从转行迷茫者变成了有方向的人——不靠运气，靠行动`,'written-test-king':`${p}，你证明了你不只是会刷题的机器——你也能走完整个求职流程`,'offer-hesitator':`${p}，选择恐惧是富人病——恭喜你，在求职这件事上你很富有`};
  return [w10[pid],w9[pid],w8[pid],w7[pid],w5[pid],w3[pid],w2[pid]];
}

const SLOT_FUNCTIONS: Record<number, OptionFn[]> = {
  1: slot1Options as unknown as OptionFn[],
  2: slot2Options as unknown as OptionFn[],
  3: slot3Options as unknown as OptionFn[],
  4: slot4Options as unknown as OptionFn[],
  5: slot5Options as unknown as OptionFn[],
  6: slot6Options as unknown as OptionFn[],
  7: slot7Options as unknown as OptionFn[],
  8: slot8Options as unknown as OptionFn[],
};

// Call the slot function and return 7 option strings
const SO_DISPATCH: Record<number, (pid: PersonaId, v: VoiceProfile) => string[]> = {
  1: soSlot1, 2: soSlot2, 3: soSlot3, 4: soSlot4,
  5: soSlot5, 6: soSlot6, 7: soSlot7, 8: soSlot8,
};

function getSlotOptions(slotPos: number, pid: PersonaId, v: VoiceProfile, cat: string): string[] {
  if (cat === 'state-owned') {
    const fn = SO_DISPATCH[slotPos];
    if (!fn) throw new Error(`No state-owned template for slot ${slotPos}`);
    return fn(pid, v);
  }
  const slotFn = SLOT_FUNCTIONS[slotPos];
  if (!slotFn || typeof slotFn !== 'function') {
    throw new Error(`No template function for slot ${slotPos}`);
  }
  return (slotFn as unknown as (pid: PersonaId, v: VoiceProfile, cat: string) => string[])(pid, v, cat);
}

// ──────────────────────────────────────
// 五、构建步骤库
// ──────────────────────────────────────

interface StepOptionOutput { text: string; weight: number }
interface StepTemplateOutput { position: number; title: string; options: StepOptionOutput[] }

function buildLibrary(category: string): {
  category: string;
  personas: Record<string, StepTemplateOutput[]>;
} {
  const personas: Record<string, StepTemplateOutput[]> = {};

  for (const pid of PERSONA_IDS) {
    const voice = VOICES[pid];
    const steps: StepTemplateOutput[] = [];

    for (const slot of SLOTS) {
      const title = slot.titleOverrides?.[category] ?? slot.title;
      const texts = getSlotOptions(slot.position, pid, voice, category);

      if (texts.length !== WEIGHTS.length) {
        throw new Error(
          `Slot ${slot.position}/${pid}: got ${texts.length} options, expected ${WEIGHTS.length}`,
        );
      }

      const options: StepOptionOutput[] = texts.map((text, i) => ({
        text,
        weight: WEIGHTS[i],
      }));

      steps.push({ position: slot.position, title, options });
    }

    personas[pid] = steps;
  }

  return { category, personas };
}

// ──────────────────────────────────────
// 五-半：变量覆盖率保障
// ──────────────────────────────────────
// CONTENT_STYLE_GUIDE 要求每条 option.text 至少含 1 个 {{变量}}。
// 以下函数扫描生成的库，为缺少变量的选项自动追加 {{personaName}}，前缀。
// 权重 2（彩蛋）已在源码层全部使用 ${p}，0 缺失。此处处理其余约 370 条。

const VAR_PATTERN = /\{\{\w+\}\}/;

function ensureVariables(library: ReturnType<typeof buildLibrary>): void {
  let patched = 0;
  for (const personaId of Object.keys(library.personas)) {
    const steps = library.personas[personaId];
    for (const step of steps) {
      for (const option of step.options) {
        if (!VAR_PATTERN.test(option.text)) {
          option.text = `{{personaName}}，${option.text}`;
          patched++;
        }
      }
    }
  }
  if (patched > 0) {
    console.log(`    🔧 auto-patched ${patched} options missing {{variable}}`);
  }
}

// ──────────────────────────────────────
// 六、主执行
// ──────────────────────────────────────

const assetsDir = path.resolve(__dirname, '..', 'src', 'assets', 'steps');
fs.mkdirSync(assetsDir, { recursive: true });

const CATEGORIES = [
  { key: 'frontend', label: '前端开发实习' },
  { key: 'general', label: '通用互联网岗' },
  { key: 'state-owned', label: '国企/事业单位' },
];

for (const cat of CATEGORIES) {
  console.log(`Generating ${cat.key} (${cat.label})...`);
  const library = buildLibrary(cat.key);
  ensureVariables(library);

  // Quick stats
  let totalOptions = 0;
  for (const steps of Object.values(library.personas)) {
    for (const step of steps) {
      totalOptions += step.options.length;
    }
  }

  const outPath = path.join(assetsDir, `${cat.key}.json`);
  fs.writeFileSync(outPath, JSON.stringify(library, null, 2), 'utf-8');
  console.log(`  → ${outPath}`);
  console.log(`  → ${Object.keys(library.personas).length} personas × 8 steps × 7 options = ${totalOptions} options`);
}

console.log('\n✅ Done! frontend.json + general.json generated.');
console.log('Run `npm run validate:content` to verify.');

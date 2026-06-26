/**
 * Fix missing {{variable}} placeholders in frontend.json serious options
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FRONTEND = path.resolve(__dirname, '..', 'src', 'assets', 'steps', 'frontend.json');

// Map of exact old text → new text with variables
const FIXES: Record<string, string> = {
  // over-preparer
  '打开录音，用提纲限时3分钟回答「请介绍一个你最有挑战的项目」，回放后优化逻辑链条，去掉冗余的细节描述。':
    '打开录音，用提纲限时3分钟回答「请介绍你在{{jobName}}相关项目中的最大技术挑战」，回放后优化逻辑链条，去掉冗余的细节描述。',

  '找一位有面试经验的朋友做一次15分钟模拟面试，设置一个你未准备过的追问环节，训练灵活应答能力。':
    '找一位有面试经验的朋友针对{{jobName}}做一次15分钟模拟面试，设置一个你未准备过的追问环节，训练灵活应答能力。',

  '用30分钟进行与求职无关的活动——运动、阅读或休息，恢复精力后再投入下一轮，保持可持续的准备节奏。':
    '{{personaName}}，完成{{jobName}}的准备后用30分钟进行与求职无关的活动——运动、阅读或休息，恢复精力后再投入下一轮，保持可持续的节奏。',

  // zen-master
  '在散步或通勤时默述项目核心亮点，训练不加准备即可流畅表达的能力，这比逐字背诵更接近真实面试状态。':
    '在散步或通勤时默述{{jobName}}相关项目的核心亮点，训练不加准备即可流畅表达的能力，这比逐字背诵更接近真实面试状态。',

  // emo-recoverer
  '面试结束后24小时内完成复盘：记录回答流畅的部分和需要改进的部分，为下轮面试积累经验':
    '{{jobName}}面试结束后24小时内完成复盘：记录回答流畅的部分和需要改进的部分，为下轮面试积累经验',

  '将本次求职经历中遇到的情绪波动记录下来，分析触发点和恢复用时，建立个人韧性数据档案':
    '{{personaName}}，将{{jobName}}求职过程中遇到的情绪波动记录下来，分析触发点和恢复用时，建立个人韧性数据档案',

  // long-planner
  '为每个项目经历准备STAR话术（3分钟版本和1分钟精简版），确保面试中根据不同时长要求灵活切换':
    '为{{jobName}}相关的每个项目经历准备STAR话术（3分钟版本和1分钟精简版），确保面试中根据不同时长要求灵活切换',

  '准备2个反问面试官的问题（技术方向/团队协作/项目规划），展现系统化思考能力':
    '准备2个反问{{jobName}}面试官的问题（技术方向/团队协作/项目规划），展现系统化思考能力',

  '将模拟录音转文字后逐段分析：逻辑连贯性、技术准确性、表达精炼度，形成书面改进清单':
    '将{{jobName}}的模拟录音转文字后逐段分析：逻辑连贯性、技术准确性、表达精炼度，形成书面改进清单',

  // written-test-king
  '用手机录制完整的模拟面试（自我介绍+项目讲解+技术问答），回放时逐段分析表达的清晰度、逻辑层次和节奏控制。':
    '用手机录制{{jobName}}的完整模拟面试（自我介绍+项目讲解+技术问答），回放时逐段分析表达的清晰度、逻辑层次和节奏控制。',
};

function main() {
  const data = JSON.parse(fs.readFileSync(FRONTEND, 'utf-8'));
  let fixed = 0;
  const notFound: string[] = [];

  for (const [, steps] of Object.entries(data.personas)) {
    for (const step of steps as any[]) {
      for (const opt of step.options) {
        if (FIXES[opt.text]) {
          opt.text = FIXES[opt.text];
          fixed++;
        }
      }
    }
  }

  // Check for any unfound fixes
  for (const oldText of Object.keys(FIXES)) {
    let found = false;
    for (const [, steps] of Object.entries(data.personas)) {
      for (const step of steps as any[]) {
        for (const opt of step.options) {
          if (FIXES[oldText] && opt.text === FIXES[oldText]) {
            found = true;
            break;
          }
        }
        if (found) break;
      }
      if (found) break;
    }
    if (!found) notFound.push(oldText);
  }

  fs.writeFileSync(FRONTEND, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  console.log(`✅ Fixed ${fixed} options with missing variables`);
  if (notFound.length > 0) {
    console.log(`⚠️  ${notFound.length} fix patterns not matched:`, notFound);
  }
}

main();

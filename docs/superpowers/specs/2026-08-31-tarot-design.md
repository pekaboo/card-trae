# ARCANA 塔罗 — 设计文档

日期：2026-08-31
基线仓库：`pekaboo/card`（trae.com 首页静态捕获）

## 目标

基于 card 仓库的视觉语言与资源，做一个**纯静态、离线可用**的塔罗牌占卜应用：
黑底网格 + 暗角舞台、白底卡牌、3D 翻牌、真实卡牌音效与氛围音乐。

## 已确认决策（用户拍板）

| 决策点 | 结论 |
|---|---|
| 解读来源 | 内置静态牌义库（无后端、无 API） |
| 牌库范围 | 22 张大阿卡纳 |
| 牌阵 | 单张「今日一牌」+ 三张「过去·现在·未来」 |
| 界面语言 | 中文为主，牌名中英双语 |
| 正逆位 | 支持，抽牌时随机（约 40% 逆位），牌义分正/逆 |
| 部署形态 | card 仓库内 `/tarot/` 子目录，`node server.mjs` 直接服务 |

## 方案取舍

- **不在抓取的 `index.html` 上改**：那是 Next.js 编译产物，业务逻辑在混淆 chunk 里，不可维护。改为用同样视觉语言**重写**一个无构建的静态页。
- **不放根路径**：保留 `/` 原捕获页不动（避免 React hydration 风险），塔罗在 `/tarot/`，`server.mjs` 增加目录 index 支持。
- **牌面用程序化 SVG 线稿**（stroke 风格统一、黑线白底），不引入外部图片素材；数据内联在 `cards.js`。
- 无框架、无构建、无依赖：HTML + CSS + ES Module JS。

## 架构

```
card/
├── server.mjs            # +目录 index 解析（/tarot → /tarot/index.html）
├── tarot/
│   ├── index.html        # 页面骨架：舞台、牌阵选择、牌扇、卡槽、解读面板
│   ├── style.css         # 视觉系统（网格背景/暗角/卡牌/动画/响应式）
│   ├── cards.js          # 22 张大阿卡纳数据：编号、罗马数字、中英名、关键词、正/逆位释义、SVG 线稿
│   └── app.js            # 状态机：choose → draw → reveal；洗牌/抽牌/翻牌/解读；音频
└── (复用) /sounds/… /_next/static/media/Geist*.woff2 /favicon.svg
```

### 状态机

1. **choose** — 可选输入问题（textarea，仅仪式感），选择牌阵（两个胶囊按钮）。
2. **draw** — 22 张牌背呈扇形展开（transform-origin 圆心旋转），点击凭直觉抽 N 张；
   被选牌淡出，上方虚线卡槽逐个填充（swish 音效）。
3. **reveal** — 卡槽依次 3D 翻面（rotateY，400ms 间隔）；逆位牌面内容旋转 180°；
   翻完展示解读面板；提供「再抽一次」「换牌阵」。

### 数据结构（cards.js）

```js
{ n: 13, numeral: 'XIII', en: 'Death', zh: '死神',
  keywords: { up: ['结束','转变','新生'], rev: ['抗拒改变','停滞','执念'] },
  up: '正位释义…', rev: '逆位释义…',
  art: '<circle …/>…' }   // viewBox 0 0 100 100，stroke=currentColor
```

### 音频

- 氛围音乐：`/sounds/music/Night_Patterns_loop.mp3`，loop，首次用户交互后播放（规避 autoplay 策略），音量 0.45。
- 翻牌：随机取 `/sounds/sfx/cards/Card Flips/Card Throw Swish 1-4.mp3`；UI 点击：`/sounds/sfx/Click.mp3`。
- 静音开关持久化 localStorage（`arcana:muted`）。

### 视觉

- 延续 trae：黑底、24px 网格线（#222）、径向暗角、Geist/GeistMono（本地 woff2）＋衬线牌名（系统衬线栈，中文走 PingFang SC/宋体）。
- 唯一强调色：古金 `#c9a227`（关键词、槽位标签、选中光晕），其余纯黑白。
- 牌背：白底黑框＋内框＋放射线 SVG＋底部黑色走马灯「· pick me · 选我 ·」（致敬原站）。
- 牌面：角标罗马数字（左上/右下倒置）、中央线稿徽记（径向线晕衬托）、下方中文名＋英文小字。
- 响应式：≤640px 牌扇收窄、卡槽缩小、解读面板纵向堆叠。

## 错误处理

- 音频播放失败静默降级（try/catch），不阻断流程。
- 无网络时仅 Typekit 字体缺失（本设计不依赖 Typekit），页面完全离线可用。

## 测试 / 验收

- `node --input-type=module` 冒烟校验 cards.js（22 条、字段齐全、art 非空）。
- 启动 `node server.mjs`，curl 验证 `/tarot/`、`/style.css`、`/cards.js`、`/app.js`、音频资源 200。
- 浏览器实际打开：抽牌→翻牌→解读全流程走通，控制台无报错（截图留证）。

## 非目标（V1 不做）

小阿卡纳、凯尔特十字、LLM 解读、抽牌历史记录、可撤销选牌、多语言切换。

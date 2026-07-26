<div align="center">

<img src="assets/logo.png" alt="claude-tuneup" width="220" />

# claude-tuneup

### 你为 Claude 写的指令规则，可能比你杂物箱里的旧东西还要昂贵。

AI Agent 会审查**每次会话**加载的指令规则 — 并同步清理磁盘碎片。<br/>
每次修改对应一个按钮。每个按钮都附带 *"这是做什么的？"* 选项。每次运行均可一键还原。

<br/>

[![安装](https://img.shields.io/badge/npx_skills_add-paulovitin%2Fclaude--tuneup-000?style=for-the-badge&logo=anthropic&logoColor=white)](https://github.com/paulovitin/claude-tuneup)
[![许可证: MIT](https://img.shields.io/badge/许可证-MIT-22c55e?style=for-the-badge)](#-许可证)
[![Claude Code](https://img.shields.io/badge/Claude_Code-skill-d97757?style=for-the-badge)](https://claude.com/claude-code)
[![EN](https://img.shields.io/badge/README-English-000?style=for-the-badge)](README.md)
[![pt-BR](https://img.shields.io/badge/README-pt--BR-30A3DC?style=for-the-badge)](README.pt-BR.md)
[![ja](https://img.shields.io/badge/README-日本語-red?style=for-the-badge)](README.ja.md)
[![es](https://img.shields.io/badge/README-Español-yellow?style=for-the-badge)](README.es.md)
[![fr](https://img.shields.io/badge/README-Français-blue?style=for-the-badge)](README.fr.md)
[![ru](https://img.shields.io/badge/README-Русский-purple?style=for-the-badge)](README.ru.md)

</div>

---

> **请先运行 `/doctor`。** 它是 Claude Code 内置的免费诊断工具，对安装环境的检查比任何第三方工具都更全面。之后再使用 `claude-tuneup` 处理剩余的问题。本 Skill 会自动运行 `/doctor` 并基于其报告展开工作 — 它是补充，而非替代。

数月使用 Claude Code 会在磁盘上留下痕迹。但更昂贵的痕迹存在于你的指令中：为旧模型编写的补偿规则、重复粘贴在四个文件中的相同指导、路由不精准的 Skill 描述，以及无论是否相关在每次会话都要加载付费的 `SOUL.md`。在你打出第一个字之前，这些就已经在消耗 Token 了。

因此本工具提出了一个不同的问题 — 不是“能删除什么？”，而是 **“这是否仍然有帮助？”**。`instructions` 分组中的每项检查均源自 Anthropic 官方文章：
[**The new rules of context engineering for Claude 5 generation models**](https://claude.com/blog/the-new-rules-of-context-engineering-for-claude-5-generation-models)。

```text
> claude-tuneup

📝 步骤 12: 应当交由模型自行判断的规则

   ~/.claude/CLAUDE.md:14
   "默认不写注释。切勿编写多段 docstring。"

   针对旧模型编写。当前模型能够根据上下文理解代码。
   建议: "编写符合周围代码风格的代码：保持相同的注释密度、命名方式和习惯。"

   [ 重写 ]   [ 保持现状 ]   [ 删除 ]   [ 这是做什么的？ ]
```

一如既往的安全承诺：未经按钮确认不会更改任何内容，运行 `claude-tuneup restore` 可随时全面还原。

## ⚡ 安装

```bash
npx skills add paulovitin/claude-tuneup
```

随后在 Claude Code 中运行：

```bash
claude-tuneup            # 运行所有步骤
```

首次使用？推荐先运行 `claude-tuneup --dry-run` — 仅预览将要进行的修改，不更改任何文件。

⏱️ 完整运行会在开头的 `/doctor` 步骤等待约 **6 分钟**，并在花费另外 6 分钟验证结果前向你确认。

---

## 🎛️ 使用方法

```bash
claude-tuneup                    # 运行所有步骤
claude-tuneup cleanup            # 按名称运行指定分组
claude-tuneup instructions       # 审计提示词规则与描述
claude-tuneup 1-3                # 运行指定步骤范围
claude-tuneup 6,7                # 运行特定步骤
claude-tuneup claude.md soul.md  # 组合运行分组
claude-tuneup --dry-run          # 仅扫描并报告，不修改文件
claude-tuneup help               # 列出分组与指令
claude-tuneup restore            # 还原之前的运行 (完全还原，或仅还原配置/项目)
```

| 分组 | 步骤 | 说明 |
| -------------------- | ------ | ------------- |
| 🧹 **`cleanup`**      | 1–8    | 清理垃圾文件并修复配置完整性 — Skills、Plugins、Hooks、MCPs、项目、状态目录、根文件及全局 `.claude.json` |
| 📝 **`instructions`** | 12–17  | 审计每次会话加载的内容：应交由判断的规则、与运行时冲突的指令、重复的规则、路由不精准的描述及未记录的重复工作流 |
| 📄 **`claude.md`**    | 9      | 全局 `CLAUDE.md` 与 `AGENTS.md` 的桥接 *(对于项目级别的 `CLAUDE.md`，建议直接使用 `/doctor`)* |
| ♻️ **`soul.md`**      | 10     | 将旧版 `SOUL.md` 迁移至 Claude 自动记忆并退役该文件 |
| 📊 **`summary`**      | 11     | 变更报告与还原指引 *(始终最后运行)* |

---

## 📐 规则来源

`instructions` 分组中的检查基于 Anthropic 官方文章 [**The new rules of context engineering for Claude 5 generation models**](https://claude.com/blog/the-new-rules-of-context-engineering-for-claude-5-generation-models)：

| 原则 | 检查项 |
| --- | --- |
| 优先使用判断力而非刚性规则 | **步骤 12** — 重写针对旧模型编写的规则，保留安全绝对项 |
| 不要与运行时对抗 | **步骤 13** — 标记与运行时固有行为相冲突的指令 |
| 避免重复表达 | **步骤 14** — 消除在 `CLAUDE.md` 与 Skill 描述中重复出现的规则 |
| 接口胜于示例 | **步骤 15** — 依据能力而非示例短语优化 `description` 字段 |
| 渐进式披露 (Progressive Disclosure) | **步骤 16** — 区分常驻加载内容与按需加载的 Skill |
| 充分利用自动记忆 | **步骤 10** — 将 `SOUL.md` 迁移至 Claude Code 内置记忆 |

---

## 🛟 安全与撤销 (Restore)

- **✍️ 尊重你的原始文字：** 步骤 12–16 仅提供重写建议。展示原句、建议修改及原因，点击按钮后才会应用修改。
- **🔘 必须确认方可删除：** 所有选择均为按钮交互，提供“这是做什么的？”解答。
- **🗂️ 聊天记录安全：** 不会自动批量删除对话记录或会话状态。
- **↩️ 随时可撤销：** 配置会自动备份，运行 `claude-tuneup restore` 可随时一键还原。

---

## 📄 许可证

[MIT](LICENSE) © [paulovitin](https://github.com/paulovitin)

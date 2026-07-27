<div align="center">

<img src="assets/logo.png" alt="claude-tuneup" width="220" />

# claude-tuneup

### 你为 Claude 写的指令规则，可能比你杂物箱里的旧东西还要昂贵。

AI Agent 会审查**每次会话**加载的指令规则 — 并同步清理磁盘碎片。<br/>
每次修改对应一个按钮。每个按钮都附带 *"这是做什么的？"* 选项。每次运行均可一键还原。

<br/>

[![安装](https://img.shields.io/badge/npx_skills_add-paulovitin%2Fclaude--tuneup-000?style=for-the-badge&logo=anthropic&logoColor=white)](https://github.com/paulovitin/claude-tuneup)
[![许可证: MIT](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)](#-许可证)
[![Claude Code](https://img.shields.io/badge/Claude_Code-skill-d97757?style=for-the-badge)](https://claude.com/claude-code)

<br/>

🌐 **选择语言:**<br/>
🇺🇸 [English](README.md) • 🇧🇷 [Português](README.pt-BR.md) • 🇯🇵 [日本語](README.ja.md) • 🇨🇳 **简体中文** • 🇪🇸 [Español](README.es.md) • 🇫🇷 [Français](README.fr.md) • 🇷🇺 [Русский](README.ru.md)

</div>

---

> [!IMPORTANT]
> **你知道吗？** Anthropic 为 Claude 5 代模型删除了 Claude Code 自身系统提示中超过 **80%** 的冗余指令。在 `CLAUDE.md` 或 `SOUL.md` 中为旧模型编写的陈旧规则会在每次会话中浪费推理 Token。`claude-tuneup` 依据 Anthropic 官方最新指引对你的上下文进行审计与优化！

使用 Claude Code 几个月后，磁盘上会留下痕迹。但更昂贵的痕迹藏在你的指令里：为迁就旧模型而写的规则、被复制到四个文件里的同一条指导、路由混乱的技能描述、无论相关与否每次会话都要付费加载的 `SOUL.md`。这一切都在你敲下第一个字之前就已加载完毕。

对一个想碰这些东西的工具，你一定有异议。**很好。** 这个工具正是为你这样的人打造的 — 那就让我们逐条听听。已经被说服了？安装命令[在下面](#-好吧我该敲什么)。还没被说服？更好。请继续读。

---

## 🧐 "你想改写*我*亲手写的规则？"

**不 — 它只想*提议*，笔始终在你手里。** `instructions` 组（步骤 12–18）从不擅自编辑任何规则。它会展示原始行、建议的改写和理由，在你按下按钮之前什么都不会改变：

```text
> claude-tuneup

📝 步骤 12: 应交给判断力的规则

   ~/.claude/CLAUDE.md:14
   "默认不写注释。绝不写多段的 docstring。"

   为旧模型而写。现在的模型会阅读周围的代码。
   建议: "写与周围代码风格一致的代码: 对齐它的注释密度、
        命名和惯用写法。"

   [ 改写 ]   [ 保持原样 ]   [ 删除 ]   [ 这是做什么的？ ]
```

这段记录展示不了的三件事：

- **安全底线不可触碰。** 像"绝不 push 到 main"、"绝不提交密钥"这样的规则会被**逐字**保留 — 绝不软化，绝不"优化"。
- **保留被标记的规则永远是有效答案。** 工具负责标记；判断权在你。
- **你永远不会被要求评判自己认不出的东西。** 每个问题都有 *"这是做什么的？"* 选项，在你决定**之前**检查并解释该项目。

---

## 📐 "凭什么改写 — 凭你的口味？"

**零个人观点。** `instructions` 组的每项检查都实现了 Anthropic
[**The new rules of context engineering for Claude 5 generation models**](https://claude.com/blog/the-new-rules-of-context-engineering-for-claude-5-generation-models)
中的一条规则：

| 规则 | 检查 |
| --- | --- |
| 判断力优先于僵硬规则 | **步骤 12** — 改写为迁就旧模型而写的规则，安全底线逐字保留 |
| 别和运行时对着干 | **步骤 13** — 标记与运行时既有行为相矛盾的指令 |
| 一件事只说一次 | **步骤 14** — 检查 `CLAUDE.md`、Agent 正文、Agent 与技能描述中的重复指令 |
| 接口优于示例 | **步骤 15** — 让 `description` 字段按能力路由，而不是按示例措辞 |
| 渐进式披露 | **步骤 16** — 区分该常驻加载的与该变成按需加载技能的 |
| 让自动记忆管记忆 | **步骤 10** — `SOUL.md` 退役，交给 Claude Code 自己的记忆 |

它问的不是"能删什么？"，而是**"这还有用吗？"**。
而且这个技能对自己也执行同样的规则：只有你正在运行的那个组的手册才会进入上下文 — 与它对你的 `CLAUDE.md` 强制执行的是同一种 token 纪律。

---

## 🔁 "那每次运行都要把同样的问题再问一遍？"

**它以前别无选择 —— 运行之间什么都不保留。** 第二次调优带着对第一次的全无记忆到来：同样被标记的规则、同样的拒绝、同样的回答。现在你的决定会被记录，重新运行时开场是一行，而不是重新翻案：

```text
> claude-tuneup

自上次调优（2026-06-14）以来，常驻上下文增加了约 380 个 token。
上次你要求保留的 3 项 —— 已跳过。（`--all` 可以重新过一遍。）
```

- **你改写过的规则会再次出现。** 键哈希的是*正文*，不是路径 —— 所以被重写的规则会重新提议，而这是对的：那版措辞你从未批准过。仅仅重排段落不会有任何变化，因为空白会先被规范化。
- **不会有东西悄悄消失。** 拒绝会折叠成那一行，而不是折叠成没有。
- **它记住的是你的决定，不是你的文字。** 路径、哈希和结论 —— 绝不保存指令文件的内容。它与备份并列存放，因此撤销某一次运行，不会抹掉你在其他所有运行里做过的决定。

---

## 🩺 "Claude Code 自带 `/doctor`。你存在的意义是什么？"

**因为 `/doctor` 先跑 — 这个工具坚持如此。** 做盘点 `/doctor` 更擅长：它能看到所有项目中每个组件的真实使用情况和常驻 token 成本，这是任何外部技能都无法测量的。所以 claude-tuneup 会替你运行它，并基于它的报告工作，把自己的精力花在 `/doctor` 不涉及的地方：你的**全局** `CLAUDE.md`、你的 Agent 和技能描述、遗留的 `SOUL.md`，以及磁盘。它是补充，不是替代。

> **"技能以无界面方式运行 `/doctor` 时，谁来阻止*它*改东西？"**
> 每次调用都带有仅报告指令，并有测试断言这条指令存在于技能构建的每一条命令中 — 无界面运行没有确认弹窗，所以指令就是保险，而测试是保险的保险。

⏱️ 诚实的预算：完整运行开头要在 `/doctor` 上等约 **6 分钟**，在再花 6 分钟验证结果之前会先征求你的同意。

---

## 🗂️ "它会碰我的聊天记录吗？"

**除非你主动要求、逐个文件夹确认并认可警告 — 而且绝不批量处理。**
对话记录和会话状态（`projects/`、`todos/`、`shell-snapshots/`、`file-history/`、`history.jsonl`）是这台机器上最不可替代的数据，**绝不**批量删除。默认永远是*保留*。它至多提供按时间范围的修剪 — "超过 6 个月的会话记录: 142 个会话, 1.2G" — 需逐文件夹明确确认，并提前警告这是永久性的，会破坏 `--resume` 和 `/insights`。

---

## ↩️ "哪天我后悔点了某个按钮呢？"

```bash
claude-tuneup restore    # 选择还原点 → 全部还原、仅配置或仅项目
```

**每次运行都是一个还原点。** 配置会做快照，被移除的项目是被*移动* — 绝非 `rm` — 到 `~/.claude-tuneup/backups/<run-id>/`，保存在技能目录**之外**，这样更新或重装都不会抹掉你的撤销历史（可用 `$CLAUDE_TUNEUP_STATE` 覆盖）。快照仅属主可读，因为 `.claude.json` 可能带有 token。

一次运行不只做减法，也做*加法*，而撤销现在两者都会还原：运行期间为你写下的技能会被记录，并在完整还原时移除 —— 是*移动*到 `undone-creations/`，不是删除，因为你可能已经改过它。

> **"还原本身会不会搞坏什么？"**
> 它同样偏执。回滚前，它会先把你*当前*的配置快照到 `pre-restore-…` 文件夹 — 也就是说连撤销都可以撤销 — 并且绝不覆盖重新占用了已删除路径的新项目：冲突会落在 `<路径>.restored-<ts>` 并被报告。

---

## 🔎 "那三天后在另一个会话里坏掉了呢？"

**这种情况有它自己的入口。** `restore` 假定你知道该撤销哪一次运行。三天之后你并不知道 —— 你手上有的是症状，不是运行 id：

```text
> claude-tuneup fix

   "我写的那条关于 commit 的规则不见了"

   2 个还原点提到它 —— 是排序，不是定论：

   ● 2026-06-14 14:02   CLAUDE.md:14 "push 前先 squash"   (已移除)
     2026-06-02 09:31   actions.log —— 技能 "git-helper" 被合并

   [ 只还原这一条 ]   [ 看整次运行 ]   [ 都不要 ]
```

- **它读的是每个还原点本来就存着的东西** —— 被移除的路径、操作日志，以及快照下来的 `CLAUDE.md`/`AGENTS.md`/`SOUL.md`。证据一直都在，只是没有东西能读回来。
- **回归可能来自两个方向。** 显眼的原因是被移除的东西，但运行*创建*的技能也可能盖住你原有的那个，在不删除任何东西的情况下改变路由。两者需要相反的修法，所以方向是从记录里读出来的，绝不从路径去猜。
- **还回来的是一项，不是整次运行** —— 那次调优的其余部分照旧生效。恢复本身也会被记录，这样下次运行不会再提议刚刚把你弄坏的那件事。
- **你的密钥不可被搜索。** 搜索绝不读取 `.claude.json` 和 `settings*.json`：它们可能带有令牌，而搜索结果是它打印回给你的文本。

---

## 🧯 "还有什么是我没想到要问的？"

它已经替你操心过的故障模式：

- **文件格式变更骗不了它去搞批量卸载。** 如果 `installed_plugins.json` 某天解析为空、而磁盘上还有插件内容，技能会拒绝把"不在列表里"当作"已卸载"。
- **它不向你兜售无意义的空间回收。** 自我再生的产物（venv、缓存、运行时、`statsig`）会被识别 — 它会指出真正的解决办法（禁用所属插件），而不是删掉一个下周就会重建的东西。
- **它靠发现，不靠假设。** 项目按特征分类 — 大小、时间、失效链接、传输类型 — 而不是按硬编码的名字。
- **你的 `/insights` 数据始终是你的。** 只做实时读取以驱动建议，绝不复制进技能或任何共享位置。MCP 配置中的内联凭证只按环境变量**名称**标记；值绝不打印。

---

## 🤝 "我已经用 `AGENTS.md` 做标准了。这会和我的配置打架吗？"

**恰恰相反 — 它提供干净的桥接。** Claude Code 不会自动加载 `AGENTS.md`，所以采用跨工具约定（Codex、Cursor、Gemini CLI…）的仓库通常会多出一份**悄悄漂移**的 `CLAUDE.md` 副本。tune-up 会检测这种漂移并整合：共享内容只在 `AGENTS.md` 里活一份，`CLAUDE.md` 变成三行垫片 —

```markdown
@AGENTS.md

# Claude 专属
- (只有 Claude Code 该看到的差异)
```

只问一个可选问题；只用 Claude 的用户永远不会看到它。这里 import 胜过软链接：软链接会让 `CLAUDE.md` *就是* `AGENTS.md`，于是每一行 Claude 专属内容都会泄漏进你其他工具读取的文件。而 token 预算按*合并*总量执行，因为 import 同样在启动时加载。

---

## ♻️ "我还留着你们旧版本的 `SOUL.md`。"

**那就迁移它，不是丢弃。** 早期版本会采访你并写一份 `SOUL.md`，通过 `@SOUL.md` 在每次会话中加载。现在 Claude Code 自己就能做这件事，而且做得更好 — 它把学到的关于你的内容保存为**在相关时才被唤起的记忆**，而不是无条件加载。

所以采访环节取消了，tune-up 会**转换**你现有的内容：每条事实一个记忆文件，类型正确，完整展示给你 — 然后才把文件移入还原点并移除 `@SOUL.md` 导入。在替代品生效之前不会删除任何东西，撤销会同时找回文件和导入。

> **"记忆是按项目的。`@SOUL.md` 到处都加载。这是降级。"**
> 说中了 — 也早有准备。tune-up 会提议用一项设置弥合这个差距，让迁移后的记忆在所有项目中生效，而且在你对这个明确的问题说"是"之前，它绝不碰你的 settings 文件。

---

## ⚡ "好吧。我该敲什么？"

```bash
npx skills add paulovitin/claude-tuneup
```

然后，在 Claude Code 中：

```bash
claude-tuneup                    # 运行全部
claude-tuneup cleanup            # 按名称运行某个组
claude-tuneup instructions       # 审查你的规则 + 描述
claude-tuneup 1-3                # 运行一段步骤区间
claude-tuneup 6,7                # 运行指定步骤
claude-tuneup claude.md soul.md  # 组合多个组
claude-tuneup --dry-run          # 扫描 + 报告将会发生的更改，不碰任何东西
claude-tuneup help               # 列出组 + 触发词
claude-tuneup restore            # 撤销之前的运行（全部，或仅配置/项目）
claude-tuneup fix                # “X 不工作了”：追溯是哪次运行造成的，只还原那一项
```

**第一次用？从 `--dry-run` 开始** — 它展示所有*将会*做的事，但什么都不碰。
（它只读取：不更改、不备份。但仍会发起两个诊断调用 — `/doctor` 和 `/insights`，都是只读且缓存一小时 — 所以要预留 `/doctor` 的等待时间。）

| 组 | 步骤 | 作用 |
| -------------------- | ------ | ------------- |
| 🧹 **`cleanup`**      | 1–8, 19 | 清除垃圾 + 修复配置完整性 — 技能、插件、钩子、MCP、项目、状态目录、根文件、全局 `.claude.json`，以及 `settings.json` 实际在说什么 — 失效路径、彼此矛盾的权限规则 |
| 📝 **`instructions`** | 12–18   | 审查每次会话加载的每个界面 — 规则、技能与 agent 描述、斜杠命令、output styles、插件自带组件：应交给判断力的规则、和运行时对着干的指令、出现在四个地方的同一条规则、路由混乱的描述、以及你反复执行却从未写下的工作流 |
| 📄 **`claude.md`**    | 9       | 你的全局 `CLAUDE.md` + `AGENTS.md` 桥接 *(项目内已提交的 `CLAUDE.md` 请交给 `/doctor` — 它做得更好)* |
| ♻️ **`soul.md`**      | 10      | 将遗留的 `SOUL.md` 迁移进 Claude 的自动记忆，然后让它退役 |
| 📊 **`summary`**      | 11      | 变更内容 + 撤销方式的最终报告 *(总是最后运行)* |

不带参数则运行全部。步骤编号是历史遗留；实际执行顺序是：诊断 → 精简 → 重组 → 添加。

**更新：** 重新运行 `npx skills add paulovitin/claude-tuneup` — 它在你的 shell 里执行，消耗零模型 token。有新版本时技能也会提醒你（一次，缓存一天）。

---

## 🧩 "我的机器上到底在跑什么？"

**一份清单和几个 Node 脚本 — 两者你都能读。** 一份供 Agent 遵循的 `SKILL.md`，配上处理机械部分的确定性辅助脚本。Agent 负责决策（分类、询问、删除/保留）；脚本只负责收集和执行，且每个动作都有日志，可以回退。

```
skills/claude-tuneup/
├─ SKILL.md               # 路由 + UX 契约 + 安全规则（精简 — 触发时加载）
├─ VERSION                # 发布的技能版本（驱动更新提醒）
├─ references/            # 按组划分的手册，仅在该组运行时加载
│  ├─ cleanup.md          #   步骤 1–8, 19
│  ├─ instructions.md     #   步骤 12–18
│  ├─ harness-invariants.md  # 运行时已经做了什么（步骤 13 的清单）
│  ├─ claude-md.md        #   步骤 9
│  └─ soul-md.md          #   步骤 10
└─ scripts/               # 确定性、跨系统（收集 & 执行）
   ├─ scan.mjs            # 只读探测 → JSON（--section 只取一个切片）
   ├─ backup.mjs          # 还原点 + 快照 + 暂存
   ├─ restore.mjs         # 列出 / 搜索 / 应用（全部、configs、items，或用 --only <路径> 只还原一项）
   ├─ ledger.mjs          # 上次运行你做的决定，避免重复询问（绝不保存文件内容）
   ├─ doctor.mjs          # 无界面运行内置 /doctor，仅报告（缓存 1 小时）
   ├─ insights.mjs        # 无界面运行 /insights（缓存 1 小时; --no-cache）
   ├─ audit-instructions.mjs  # 指令信号 + 常驻描述 → JSON
   ├─ consolidate.mjs     # 把技能移到 ~/.agents/skills + 链接回原处（Windows 用 junction）
   ├─ validate-json.mjs   # 每次配置编辑后的 JSON 完整性检查
   └─ version-check.mjs   # 低 token 成本的更新提醒（缓存 24 小时，离线静默）
skills.sh.json             # 注册表清单
```

> **"它是真的能在 Windows 上跑，还是'号称支持 Windows'？"**
> 辅助脚本是纯 Node — 零依赖，**不需要 `python3`** — 通过 Claude Code 自带的 `node` 在 macOS、Windows 和 Linux 上行为完全一致。在 Windows 上，当软链接需要管理员权限时，技能整合会退回到 junction。所有安全关键部分都由自动化测试套件覆盖（单元测试 + 端到端 backup→restore 往返），在三个系统的 CI 上运行。

---

## ⚖️ 裁决权在你

以上就是我们迄今听到的所有异议 — 如果你有新的，
[开一个 issue](https://github.com/paulovitin/claude-tuneup/issues)：这份文件里最好的问题，都始于某个人的怀疑。无论如何，契约始终有效：没有按钮，什么都不会改变；`claude-tuneup restore` 能把任何东西放回原处。

为谨慎的人而造 — 带着爱意。

---

## 📄 许可证

[MIT](LICENSE) © [paulovitin](https://github.com/paulovitin)

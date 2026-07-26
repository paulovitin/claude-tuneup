<div align="center">

<img src="assets/logo.png" alt="claude-tuneup" width="220" />

# claude-tuneup

### Claude用に書いた指示ルール、古いモデルのままで無駄なトークンコストになっていませんか？

AIエージェントが**毎セッション**読み込まれる指示ルールを監査し、ディスクの不要ファイルもクリーンアップします。<br/>
変更はすべてボタン選択。各ボタンに「これ何をするの？」説明付き。いつでもロールバック可能。

<br/>

[![Install](https://img.shields.io/badge/npx_skills_add-paulovitin%2Fclaude--tuneup-000?style=for-the-badge&logo=anthropic&logoColor=white)](https://github.com/paulovitin/claude-tuneup)
[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)](#-ライセンス)
[![Claude Code](https://img.shields.io/badge/Claude_Code-skill-d97757?style=for-the-badge)](https://claude.com/claude-code)
[![EN](https://img.shields.io/badge/README-English-000?style=for-the-badge)](README.md)
[![pt-BR](https://img.shields.io/badge/README-pt--BR-30A3DC?style=for-the-badge)](README.pt-BR.md)
[![zh-CN](https://img.shields.io/badge/README-简体中文-red?style=for-the-badge)](README.zh-CN.md)

</div>

---

> **最初に `/doctor` を実行してください。** Claude Codeに標準搭載されており、インストール環境のチェックにおいて最高かつ無料です。その上で残った課題に `claude-tuneup` を実行します。本スキルは `/doctor` を自動実行し、そのレポートに基づいて動作する補完ツールです。

長期間のClaude Code使用はディスクにログやキャッシュを残します。しかし最も高コストなのは指示ルール（instructions）です：古いモデルの補正用に書かれたルール、複数ファイルに重複コピーされた指示、ルーティング精度の低いスキル説明文、無条件で毎セッション読み込まれる `SOUL.md` など。これらすべてが、最初の1文字を入力する前に消費されています。

そのため本ツールは「何を削除できるか？」ではなく、**「これは今でも役に立っているか？」**を問います。`instructions` グループの各チェックは、Anthropic公式記事[**The new rules of context engineering for Claude 5 generation models**](https://claude.com/blog/the-new-rules-of-context-engineering-for-claude-5-generation-models)に基づいています。

```text
> claude-tuneup

📝 STEP 12: 判断力に任せるべきルール

   ~/.claude/CLAUDE.md:14
   "デフォルトでコメントは書かないこと。複数パラグラフのdocstringは禁止。"

   古いモデル向けに書かれたルールです。現在のモデルは周囲のコードを読み取ります。
   提案: "周囲のコードスタイルに合わせてコードを記述してください: コメントの密度、命名、スタイルを統一。"

   [ 書き換える ]   [ そのまま維持 ]   [ 削除する ]   [ これ何をするの？ ]
```

使い勝手は変わらず安心設計：ボタン確認なしに変更は行われず、`claude-tuneup restore` でいつでも完全に復元できます。

## ⚡ インストール

```bash
npx skills add paulovitin/claude-tuneup
```

その後、Claude Code内で実行：

```bash
claude-tuneup            # すべて実行
```

初回実行ですか？まずは `claude-tuneup --dry-run` からお試しください — 変更内容の試算プレビューのみで、ファイルには一切手を加えません。

⏱️ フル実行の場合、最初に `/doctor` の完了まで約**6分**待ちます。確認後に結果検証を行います。

---

## 🎛️ 使い方

```bash
claude-tuneup                    # すべて実行
claude-tuneup cleanup            # 指定グループの実行
claude-tuneup instructions       # 指示ルールと説明文の監査
claude-tuneup 1-3                # ステップ範囲の指定実行
claude-tuneup 6,7                # 特定ステップの実行
claude-tuneup claude.md soul.md  # 複数グループの組み合わせ実行
claude-tuneup --dry-run          # スキャン＆プレビュー（変更なし）
claude-tuneup help               # グループ一覧を表示
claude-tuneup restore            # 前回実行の復元（完全復元または設定のみ/ファイルのみ）
```

| グループ | ステップ | 説明 |
| -------------------- | ------ | ------------- |
| 🧹 **`cleanup`**      | 1–8    | 不要ファイル削除と設定の整合性修復 — スキル、プラグイン、フック、MCP、プロジェクト、状態ディレクトリ、ルートファイル、グローバル `.claude.json` |
| 📝 **`instructions`** | 12–17  | 毎セッション読み込まれる指示の監査：判断力に任せるべきルール、ランタイムとバッティングする指示、重複ルール、ルーティング精度の低い説明文、自動化されていない繰り返し作業 |
| 📄 **`claude.md`**    | 9      | グローバル `CLAUDE.md` と `AGENTS.md` の連携 *(プロジェクト内の `CLAUDE.md` には `/doctor` の利用を推奨)* |
| ♻️ **`soul.md`**      | 10     | 従来の `SOUL.md` をClaudeの自動メモリ機能へ移行し引退させる |
| 📊 **`summary`**      | 11     | 最終変更レポートおよび復元手順の案内 *(常に最後に実行)* |

---

## 📐 ルールの根拠

`instructions` グループのチェックは個人主観ではなく、Anthropicの[**The new rules of context engineering for Claude 5 generation models**](https://claude.com/blog/the-new-rules-of-context-engineering-for-claude-5-generation-models)に基づいています。

| 原則 | チェック項目 |
| --- | --- |
| 厳格なルールより判断力を優先 | **step 12** — 古いモデル向けのルールを書き換え（安全にかかわる絶対ルールは維持） |
| ランタイムの挙動と戦わない | **step 13** — ランタイムが既に行っている動作と矛盾する指示を検出 |
| 重複を避ける | **step 14** — `CLAUDE.md` やスキル記述間での重複指示の解消 |
| 例文よりインターフェース重視 | **step 15** — 例文ではなく機能に基づいた `description` の最適化 |
| 段階的開示 (Progressive Disclosure) | **step 16** — 常に読み込むものとオンデマンドで読み込むスキルの切り分け |
| メモリ機能の活用 | **step 10** — `SOUL.md` をClaude Code標準のメモリ機能に移行 |

---

## 🛟 安全性と復元 (Undo)

- **✍️ ユーザーの言葉を尊重:** step 12〜16 は提案形式です。変更前後の比較と理由を確認し、ボタンを押すまで変更されません。
- **🔘 確認なしの削除なし:** すべての選択はボタン操作で行い、「これ何をするの？」オプションで詳細を確認できます。
- **🗂️ チャット履歴の保護:** 会話トランスクリプトやセッション状態は一括削除されません。
- **↩️ 完全なロールバック機能:** 変更前の設定はバックアップされ、`claude-tuneup restore` でいつでも復元可能です。

---

## 📄 ライセンス

[MIT](LICENSE) © [paulovitin](https://github.com/paulovitin)

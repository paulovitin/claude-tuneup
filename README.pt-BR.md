<div align="center">

<img src="assets/logo.png" alt="claude-tuneup" width="220" />

# claude-tuneup

### As regras que você escreveu para o Claude custam mais que a sua gaveta de bagunça.

Um agente de IA audita as instruções que carregam em **toda sessão** — e limpa o disco também.<br/>
Cada mudança é um botão. Cada botão tem um *"O que isso faz?"*. Cada execução pode ser desfeita.

<br/>

[![Instalar](https://img.shields.io/badge/npx_skills_add-paulovitin%2Fclaude--tuneup-000?style=for-the-badge&logo=anthropic&logoColor=white)](https://github.com/paulovitin/claude-tuneup)
[![Licença: MIT](https://img.shields.io/badge/Licen%C3%A7a-MIT-22c55e?style=for-the-badge)](#-licença)
[![Claude Code](https://img.shields.io/badge/Claude_Code-skill-d97757?style=for-the-badge)](https://claude.com/claude-code)
[![EN](https://img.shields.io/badge/README-English-000?style=for-the-badge)](README.md)
[![ja](https://img.shields.io/badge/README-日本語-red?style=for-the-badge)](README.ja.md)
[![zh-CN](https://img.shields.io/badge/README-简体中文-red?style=for-the-badge)](README.zh-CN.md)
[![es](https://img.shields.io/badge/README-Español-yellow?style=for-the-badge)](README.es.md)
[![fr](https://img.shields.io/badge/README-Français-blue?style=for-the-badge)](README.fr.md)
[![ru](https://img.shields.io/badge/README-Русский-purple?style=for-the-badge)](README.ru.md)

</div>

---

> **Rode o `/doctor` primeiro.** Ele já vem com o Claude Code, faz o inventário da sua instalação
> melhor do que qualquer outra coisa, e é de graça. Depois rode o `claude-tuneup` no que sobrou.
> Esta skill roda o `/doctor` por você e trabalha em cima do relatório dele — é um complemento, não
> um substituto.

Meses de uso do Claude Code deixam rastro no disco. Mas o rastro mais caro está nas suas instruções:
regras escritas para compensar modelos antigos, a mesma orientação copiada em quatro arquivos,
descrições de skill que roteiam mal, um `SOUL.md` que você paga em toda sessão, sendo relevante ou
não. Tudo isso carrega antes de você digitar uma palavra.

Então a ferramenta faz outra pergunta, no lugar de "o que dá pra apagar?" — ela pergunta **"isso
ainda ajuda?"**. Cada verificação do grupo `instructions` vem de uma fonte só: o artigo da Anthropic
[**The new rules of context engineering for Claude 5 generation models**](https://claude.com/blog/the-new-rules-of-context-engineering-for-claude-5-generation-models).

```text
> claude-tuneup

📝 PASSO 12: Regras que deveriam ser julgamento

   ~/.claude/CLAUDE.md:14
   "por padrão não escreva comentários. Nunca escreva docstrings de vários parágrafos."

   Escrita para um modelo antigo. Os modelos atuais leem o código ao redor.
   Sugestão: "Escreva código parecido com o código ao redor: mesma densidade
             de comentários, mesma nomenclatura, mesmo estilo."

   [ Reescrever ]   [ Manter como está ]   [ Apagar ]   [ O que isso faz? ]
```

O contrato é o mesmo de sempre: nada muda sem um botão, e `claude-tuneup restore` traz qualquer
coisa de volta.

## ⚡ Instalação

```bash
npx skills add paulovitin/claude-tuneup
```

Depois, no Claude Code:

```bash
claude-tuneup            # executa tudo
```

⏱️ Uma execução completa espera cerca de **6 minutos** no `/doctor` no início, e pergunta antes de gastar mais 6 para conferir o resultado.

Primeira vez? Comece com `claude-tuneup --dry-run` — ele mostra tudo o que *faria* e não toca em nada.

**Atualizando.** Rode `npx skills add paulovitin/claude-tuneup` de novo para puxar a versão mais recente — roda no seu terminal, então custa zero tokens de modelo. A skill também te avisa (uma vez, em cache por um dia) quando existe uma release mais nova, pra você saber quando vale re-rodar.

---

## 🎛️ Uso

```bash
claude-tuneup                    # executa tudo
claude-tuneup cleanup            # executa um grupo pelo nome
claude-tuneup instructions       # audita suas regras + descrições
claude-tuneup 1-3                # executa um intervalo de passos
claude-tuneup 6,7                # executa passos específicos
claude-tuneup claude.md soul.md  # combina grupos
claude-tuneup --dry-run          # mostra o que mudaria, sem alterar nada
claude-tuneup help               # lista grupos + comandos
claude-tuneup restore            # desfaz uma execução anterior (tudo, ou só configs/itens)
```

| Grupo | Passos | O que faz |
| -------------------- | ------ | ---------- |
| 🧹 **`cleanup`**      | 1–8    | Remove lixo + corrige integridade da config — skills, plugins, hooks, MCPs, projetos, diretórios de estado, arquivos raiz, `.claude.json` global |
| 📝 **`instructions`** | 12–17  | Audita o que carrega em toda sessão: regras que deveriam ser julgamento, instruções que brigam com o próprio Claude Code, a mesma regra em quatro lugares, descrições que roteiam mal, e fluxos que você repete mas nunca escreveu |
| 📄 **`claude.md`**    | 9      | Seu `CLAUDE.md` global + a ponte com o `AGENTS.md` *(para o `CLAUDE.md` versionado de um projeto, rode o `/doctor` — ele faz isso melhor)* |
| ♻️ **`soul.md`**      | 10     | Migra um `SOUL.md` legado para a memória automática do Claude e o aposenta |
| 📊 **`summary`**      | 11     | Relatório final do que mudou + como desfazer *(sempre executa por último)* |

> Sem argumento, executa tudo. A numeração dos passos é histórica; a ordem real é diagnosticar → subtrair → reorganizar → adicionar.

---

## ♻️ O `SOUL.md` foi aposentado — e migrado, não descartado

Versões anteriores desta ferramenta entrevistavam você e escreviam um `SOUL.md`: um perfil carregado
em toda sessão via `@SOUL.md`. O Claude Code agora faz isso sozinho, e melhor — ele guarda o que
aprende sobre você como **memórias, lembradas quando são relevantes** em vez de carregadas sempre.

Então a entrevista acabou. Se você já tem um `SOUL.md`, o tune-up **converte** o arquivo — uma
memória por fato, com o tipo certo, mostradas inteiras para você — e só então move o arquivo para o
ponto de restauração e remove o `@SOUL.md`. Nada é apagado antes do substituto estar no ar, e o undo
traz de volta tanto o arquivo quanto o import.

Preocupado com alcance? As memórias são por projeto por padrão, enquanto o `@SOUL.md` carregava em
todos. O tune-up oferece fechar essa diferença com um ajuste, para que as memórias migradas valham em
qualquer projeto — e ele nunca mexe no seu arquivo de configuração sem você dizer sim a essa pergunta
específica.

---

## 🤝 Convive bem com o `AGENTS.md`

O Claude Code não carrega `AGENTS.md` automaticamente, então repos que padronizam na convenção cross-tool (Codex, Cursor, Gemini CLI…) acabam com uma cópia em `CLAUDE.md` que **diverge em silêncio**. O tune-up detecta esse drift e oferece a ponte limpa: a verdade compartilhada vive uma vez só no `AGENTS.md`, e o `CLAUDE.md` vira um shim de três linhas —

```markdown
@AGENTS.md

# Específico do Claude
- (deltas que só o Claude Code deve ver)
```

Uma pergunta opt-in; quem usa só Claude Code nunca vê isso. E import ganha de symlink aqui: um symlink faz o `CLAUDE.md` **ser** o `AGENTS.md`, então toda linha específica do Claude vaza para o arquivo que as outras ferramentas leem.

---

## 🛟 Segurança & undo (feito para os cautelosos — com carinho)

Esta skill edita coisas que você escreveu e apaga coisas que são suas, então ela é paranoica por design:

- **✍️ Suas palavras são suas.** O grupo `instructions` reescreve as regras que **você** escreveu — um
  tipo de mudança mais delicado que apagar um cache. Por isso os passos 12–16 **só propõem**: mostram
  a linha original, a reescrita sugerida e o motivo, e não mudam nada até você clicar. Absolutos de
  segurança ("nunca dê push na main", "nunca comite segredo") ficam **literais** e nunca são
  suavizados. Manter uma regra que a ferramenta sinalizou é sempre uma resposta válida.
- **🔘 Nada é apagado sem confirmação.** Toda escolha é um botão, e toda pergunta tem a opção *"O que isso faz?"*, que inspeciona e explica o item **antes** de você decidir. Você nunca vai julgar algo que não consegue identificar.
- **🗂️ Seu histórico de conversas é sagrado.** Transcrições e estado de sessão (`projects/`, `todos/`, `shell-snapshots/`, `file-history/`, `history.jsonl`) são os dados menos substituíveis da máquina e **nunca** são apagados em massa. O padrão é *manter*; no máximo ela oferece poda por idade ("transcrições com mais de 6 meses: 142 sessões, 1.2G") com confirmação explícita por pasta — avisando antes que é permanente e quebra `--resume` e `/insights`.
- **↩️ Toda execução é reversível.** Configs são fotografadas e itens removidos são *movidos* (nunca `rm`) para `~/.claude-tuneup/backups/<run-id>/` — mantido **fora** do diretório da skill, para que uma atualização ou reinstalação não leve seu histórico de undo junto (sobrescreva com `$CLAUDE_TUNEUP_STATE`). Os snapshots ficam restritos ao dono (o `.claude.json` pode carregar tokens). Desfaça quando quiser — tudo, só as configs, ou só os itens removidos:

  ```bash
  claude-tuneup restore
  ```
- **🛡️ O restore não atropela nada.** Antes de reverter, ele fotografa as configs *atuais* numa pasta `pre-restore-…` (então o próprio restore é reversível) e nunca sobrescreve um item mais novo que reocupou um caminho removido — colisões caem em `<caminho>.restored-<ts>` e são reportadas.
- **🧯 Fusível contra mudança de formato.** Se o `installed_plugins.json` algum dia parsear vazio enquanto há conteúdo de plugin no disco, a skill se recusa a tratar "fora da lista" como "desinstalado" — uma mudança de formato de arquivo não consegue induzi-la a propor uma desinstalação em massa.
- **♻️ Sem reclaims inúteis.** Artefatos que se regeneram (venvs, caches, runtimes, `statsig`) são detectados — a skill aponta a correção de verdade (desabilitar o plugin dono) em vez de apagar algo que só vai se reconstruir.
- **🔒 Privacidade.** O relatório do `/insights` é dado *seu* e local — lido ao vivo para guiar sugestões, nunca copiado para a skill ou para qualquer lugar compartilhado. Credenciais inline em configs de MCP são sinalizadas só pelo **nome** da variável de ambiente; valores nunca são impressos.

---

## 📐 De onde vêm as regras

O grupo `instructions` não é um conjunto de opiniões. Cada verificação implementa uma regra do artigo
[**The new rules of context engineering for Claude 5 generation models**](https://claude.com/blog/the-new-rules-of-context-engineering-for-claude-5-generation-models):

| A regra | A verificação |
| --- | --- |
| Prefira julgamento a regras rígidas | **passo 12** — reescreve regras feitas para modelos antigos, mantendo os absolutos de segurança intactos |
| Não brigue com o próprio agente | **passo 13** — sinaliza instruções que contradizem o que o Claude Code já faz |
| Diga uma vez só | **passo 14** — a mesma instrução no `CLAUDE.md`, no corpo dos agentes, e nas descrições de agentes e skills |
| Interface em vez de exemplos | **passo 15** — descrições que roteiam por capacidade, não por frases de exemplo |
| Revelação progressiva | **passo 16** — o que fica sempre carregado e o que vira skill carregada sob demanda |
| Deixe a memória automática ser a memória | **passo 10** — o `SOUL.md` se aposenta na memória do próprio Claude Code |

A skill se cobra as mesmas regras: a divisão abaixo é revelação progressiva, e só o playbook do grupo
que você está rodando entra no contexto.

---

## 🧩 Como funciona

Um `SKILL.md` que o agente segue como checklist, apoiado por helpers determinísticos em Node para a parte mecânica. Ele **descobre** sua instalação em vez de presumi-la — itens são classificados por características (tamanho, idade, links quebrados, tipo de transporte), não por nomes fixos — pergunta antes de cada mudança e registra cada ação para poder reverter.

Os helpers são Node puro (zero dependências, **sem precisar de `python3`**), então rodam idênticos em macOS, Windows e Linux com o `node` que o Claude Code já traz — inclusive no Windows, onde a consolidação de skills usa junctions quando symlinks exigiriam direitos de admin.

```
skills/claude-tuneup/
├─ SKILL.md               # roteamento + contrato de UX + regras de segurança (enxuto — carrega no trigger)
├─ VERSION                # versão da skill instalada (alimenta o aviso de update)
├─ references/            # playbooks por grupo, carregados só quando o grupo roda
│  ├─ cleanup.md          #   passos 1–8
│  ├─ instructions.md     #   passos 12–17
│  ├─ harness-invariants.md  # o que o Claude Code já faz sozinho (lista do passo 13)
│  ├─ claude-md.md        #   passo 9
│  └─ soul-md.md          #   passo 10
└─ scripts/               # determinísticos, cross-OS (coletar & aplicar)
   ├─ scan.mjs            # descoberta read-only → JSON (--section para só uma fatia)
   ├─ backup.mjs          # restore point + snapshot + stash
   ├─ restore.mjs         # listar / aplicar (tudo, --configs-only, --items-only)
   ├─ doctor.mjs          # roda o /doctor nativo headless, só relatório (cache 1h)
   ├─ insights.mjs        # roda /insights headless (cache 1h; --no-cache)
   ├─ audit-instructions.mjs  # sinais nas instruções + descrições residentes → JSON
   ├─ consolidate.mjs     # move uma skill para ~/.agents/skills + link de volta (junction no Windows)
   ├─ validate-json.mjs   # sanidade de JSON após cada edição de config
   └─ version-check.mjs   # aviso de update barato em tokens (cache 24h, silencioso offline)
skills.sh.json             # manifesto do registry
```

A divisão é higiene de tokens deliberada: só o playbook do grupo que você está rodando entra no contexto — a mesma disciplina que a skill cobra do seu `CLAUDE.md`.

Tudo que é crítico para segurança é coberto por uma suíte de testes automatizada (unitários + roundtrips end-to-end de backup→restore) rodando em CI no Linux, macOS e Windows.

---

## ❓ FAQ

**Vai apagar meu histórico de conversas?**
Só se você pedir explicitamente, confirmar pasta por pasta e aceitar o aviso — e mesmo assim só fatias por idade, nunca tudo de uma vez. O padrão é sempre *manter*.

**Apaguei algo e me arrependi.**
`claude-tuneup restore` → escolha o restore point → tudo, só configs, ou só itens. O próprio restore fotografa seu estado atual antes, então até o desfazer é desfazível.

**Funciona no Windows?**
Sim — os helpers são Node puro, a validação de JSON não depende de `python3`, e a consolidação usa junctions onde symlinks pediriam admin.

**Uso Codex/Cursor com `AGENTS.md` — isso vai brigar com meu setup?**
O contrário: ele detecta drift entre CLAUDE.md↔AGENTS.md, consolida com a sua confirmação e transforma o `CLAUDE.md` num shim de import para toda ferramenta ler uma fonte de verdade só. O budget de tokens passa a valer no total *combinado*, já que imports também carregam no launch.

**Quanto custa um dry run?**
Nenhuma mudança e nenhum backup — ele só lê. Mas ele ainda faz as duas chamadas de diagnóstico (`/doctor` e `/insights`), as duas somente-leitura e em cache por uma hora, então conte com a espera do `/doctor`.

**Por que ele roda o `/doctor` em vez de substituir?**
Porque o `/doctor` é melhor no inventário — ele enxerga o uso real de cada componente em todos os seus projetos, e o custo em tokens residentes, que nenhuma skill externa consegue medir. Rodar ele primeiro faz o claude-tuneup gastar esforço no que o `/doctor` não toca: seu `CLAUDE.md` **global**, as descrições dos seus agentes e skills, um `SOUL.md` legado, e o disco.

**Ele vai reescrever meu `CLAUDE.md` sem me avisar?**
Não. Toda reescrita aparece como antes/depois com o motivo, e só é aplicada se você clicar. Regras de segurança ficam palavra por palavra. E a execução inteira fica dentro de um ponto de restauração, então `claude-tuneup restore` traz o arquivo original de volta.

**O `/doctor` pode mudar coisas quando a skill roda ele?**
Não. A chamada sempre carrega uma instrução de só relatar, e um teste garante que ela está presente em todo comando que a skill monta — uma execução headless não tem confirmação para segurar nada, então a instrução é a trava.

---

## 📄 Licença

[MIT](LICENSE) © [paulovitin](https://github.com/paulovitin)

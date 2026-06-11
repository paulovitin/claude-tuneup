<div align="center">

<img src="assets/logo.png" alt="claude-tuneup" width="220" />

# claude-tuneup

### Seu `~/.claude` é uma gaveta de bagunça. Isto limpa ela — e dá uma alma à sua instalação.

Um tune-up guiado e **totalmente reversível** que um agente de IA executa *com* você.<br/>
Cada mudança é um botão. Cada botão tem um *"O que isso faz?"*. Cada execução pode ser desfeita.

<br/>

[![Instalar](https://img.shields.io/badge/npx_skills_add-paulovitin%2Fclaude--tuneup-000?style=for-the-badge&logo=anthropic&logoColor=white)](https://github.com/paulovitin/claude-tuneup)
[![Licença: MIT](https://img.shields.io/badge/Licen%C3%A7a-MIT-22c55e?style=for-the-badge)](#-licença)
[![Claude Code](https://img.shields.io/badge/Claude_Code-skill-d97757?style=for-the-badge)](https://claude.com/claude-code)
[![EN](https://img.shields.io/badge/README-English-000?style=for-the-badge)](README.md)

</div>

---

Meses de uso do Claude Code deixam rastro: symlinks mortos, hooks órfãos, entradas de MCP apontando para o nada, marketplaces que nada mais usa, caches de plugin comendo **gigabytes** em silêncio — e um `CLAUDE.md` que ou está vazio, ou virou um imposto de 400 linhas de tokens que você paga em *toda sessão*.

Você pode fuçar o `~/.claude` na mão. Ou pode dizer uma palavra e deixar um agente te guiar item por item, explicando qualquer coisa que você não reconheça **antes** de você decidir:

```text
> claude-tuneup

🧹 PASSO 2: Plugins — 1.2G no total

   marketplaces/old-experiments (412M) — nenhum plugin instalado usa

   [ Remover (libera 412M) ]   [ Manter ]   [ O que isso faz? ]
```

A experiência é essa. Sem flags para decorar, sem "espera, o que ele acabou de apagar?" — e se você se arrepender de algo, `claude-tuneup restore` traz de volta.

## ⚡ Instalação

```bash
npx skills add paulovitin/claude-tuneup
```

Depois, no Claude Code:

```bash
claude-tuneup            # pergunta qual grupo executar
```

Primeira vez? Comece com `claude-tuneup --dry-run` — ele mostra tudo o que *faria* e não toca em nada.

**Atualizando.** Rode `npx skills add paulovitin/claude-tuneup` de novo para puxar a versão mais recente — roda no seu terminal, então custa zero tokens de modelo. A skill também te avisa (uma vez, em cache por um dia) quando existe uma release mais nova, pra você saber quando vale re-rodar.

---

## 🎛️ Uso

```bash
claude-tuneup                    # pergunta qual grupo executar
claude-tuneup cleanup            # executa um grupo pelo nome
claude-tuneup 1-3                # executa um intervalo de passos
claude-tuneup 6,7                # executa passos específicos
claude-tuneup claude.md soul.md  # combina grupos
claude-tuneup --dry-run          # mostra o que mudaria, sem alterar nada
claude-tuneup help               # lista grupos + comandos
claude-tuneup restore            # desfaz uma execução anterior (tudo, ou só configs/itens)
```

| Grupo | Passos | O que faz |
| ----------------- | ------ | ---------- |
| 🧹 **`cleanup`**   | 1–8    | Remove lixo + corrige integridade da config — skills, plugins, hooks, MCPs, projetos, diretórios de estado, arquivos raiz, `.claude.json` global |
| 📄 **`claude.md`** | 9      | Melhora o `CLAUDE.md` com base no seu **uso real** via o relatório nativo `/insights` — mantendo enxuto (≤ 200 linhas), já que carrega em toda sessão |
| ✨ **`soul.md`**   | 10     | Entrevista você e constrói um perfil `SOUL.md` — tom, autonomia, manias, stack, definição de pronto (também enxuto) |
| 📊 **`summary`**   | 11     | Relatório final do que mudou + como desfazer *(sempre executa por último)* |

> Execute tudo, ou apenas um grupo. Sem argumento → ele pergunta primeiro.

---

## ✨ Por que um `SOUL.md`?

Limpar o Claude é metade do trabalho — a outra metade é o Claude saber **com quem está falando**.

| Arquivo     | Responde        | Escopo |
| ----------- | --------------- | ------- |
| `CLAUDE.md` | **como** trabalhar | regras operacionais, por projeto |
| `SOUL.md`   | **quem** você é | identidade estável — tom, autonomia, manias, stack, o que significa *"pronto"* |

Ele carrega em toda sessão via `@SOUL.md`, então cada resposta serve a **você** em vez de um dev genérico. Chega de se reapresentar no começo de toda conversa.

---

## 🛟 Segurança & undo (feito para os cautelosos — com carinho)

O trabalho desta skill é apagar coisas, então ela é paranoica por design:

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

## 🧩 Como funciona

Um `SKILL.md` que o agente segue como checklist, apoiado por helpers determinísticos em Node para a parte mecânica. Ele **descobre** sua instalação em vez de presumi-la — itens são classificados por características (tamanho, idade, links quebrados, tipo de transporte), não por nomes fixos — pergunta antes de cada mudança e registra cada ação para poder reverter.

Os helpers são Node puro (zero dependências, **sem precisar de `python3`**), então rodam idênticos em macOS, Windows e Linux com o `node` que o Claude Code já traz — inclusive no Windows, onde a consolidação de skills usa junctions quando symlinks exigiriam direitos de admin.

```
skills/claude-tuneup/
├─ SKILL.md               # roteamento + contrato de UX + regras de segurança (enxuto — carrega no trigger)
├─ VERSION                # versão da skill instalada (alimenta o aviso de update)
├─ references/            # playbooks por grupo, carregados só quando o grupo roda
│  ├─ cleanup.md          #   passos 1–8
│  ├─ claude-md.md        #   passo 9
│  └─ soul-md.md          #   passo 10
└─ scripts/               # determinísticos, cross-OS (coletar & aplicar)
   ├─ scan.mjs            # descoberta read-only → JSON (--section para só uma fatia)
   ├─ backup.mjs          # restore point + snapshot + stash
   ├─ restore.mjs         # listar / aplicar (tudo, --configs-only, --items-only)
   ├─ insights.mjs        # roda /insights headless (cache 1h; --no-cache)
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

**Quanto custa um dry run?**
Nada. Ele lê, reporta tamanhos e candidatos, e não cria backup, não muda nada, não faz chamada de modelo (a chamada do `/insights` só acontece no passo 9 e fica em cache por uma hora).

---

## 📄 Licença

[MIT](LICENSE) © [paulovitin](https://github.com/paulovitin)

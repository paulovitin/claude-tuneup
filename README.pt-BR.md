<div align="center">

<img src="assets/logo.png" alt="claude-tuneup" width="220" />

# claude-tuneup

### Limpe sua instalação do Claude Code. Otimize. E dê uma alma a ela.

Um tune-up guiado e **reversível** que um agente de IA executa *com* você —<br/>
ele pergunta antes de cada alteração e explica qualquer coisa que você não reconhecer.

<br/>

[![Instalar](https://img.shields.io/badge/npx_skills_add-paulovitin%2Fclaude--tuneup-000?style=for-the-badge&logo=anthropic&logoColor=white)](https://github.com/paulovitin/claude-tuneup)
[![Licença: MIT](https://img.shields.io/badge/Licen%C3%A7a-MIT-22c55e?style=for-the-badge)](#-licença)
[![Claude Code](https://img.shields.io/badge/Claude_Code-skill-d97757?style=for-the-badge)](https://claude.com/claude-code)
[![EN](https://img.shields.io/badge/README-English-000?style=for-the-badge)](README.md)

</div>

---

## ⚡ Instalação

```bash
npx skills add paulovitin/claude-tuneup
```

Depois, no Claude Code:

```bash
claude-tuneup            # pergunta qual grupo executar
```

---

## 🎛️ Uso

```bash
claude-tuneup                    # pergunta qual grupo executar
claude-tuneup cleanup            # executa um grupo pelo nome
claude-tuneup 1-3                # executa um intervalo de passos
claude-tuneup 6,7                # executa passos específicos
claude-tuneup claude.md soul.md  # combina grupos
claude-tuneup --dry-run          # mostra o que seria feito, sem alterar nada
claude-tuneup help               # lista grupos + comandos
claude-tuneup restore            # desfaz uma execução anterior a partir de um backup
```

| Grupo | Passos | O que faz |
|:------|:------:|:----------|
| 🧹 **`cleanup`** | 1–8 | Remove lixo + corrige integridade da config — skills, plugins, hooks, MCPs, projetos, diretórios de estado, arquivos raiz, `.claude.json` global |
| 📄 **`claude.md`** | 9 | Melhora o `CLAUDE.md` com base no seu **uso real** via o relatório `/insights` — mantendo enxuto (≤ 200 linhas) já que carrega em toda sessão |
| ✨ **`soul.md`** | 10 | Entrevista você e constrói um perfil `SOUL.md` — tom, autonomia, manias, stack, definição de pronto |
| 📊 **`summary`** | 11 | Relatório final do que mudou + como desfazer *(sempre executa por último)* |

> Execute tudo, ou apenas um grupo. Sem argumento → ele pergunta primeiro.

---

## ✨ Por que um `SOUL.md`?

Limpar o Claude é metade do trabalho — a outra metade é o Claude saber **com quem está falando**.

| Arquivo | Responde | Escopo |
|:--------|:---------|:-------|
| `CLAUDE.md` | **como** trabalhar | regras operacionais, por projeto |
| `SOUL.md` | **quem** você é | identidade estável — tom, autonomia, manias, stack, o que *"pronto"* significa |

Carrega a cada sessão via `@SOUL.md`, então cada resposta se ajusta a **você** em vez de um dev genérico.

---

## 🛟 Segurança & desfazer

- **🔘 Nada é deletado sem confirmação.** Cada escolha é um botão, e toda pergunta tem uma opção *"O que isso faz?"* que explica o item **antes** de você decidir.
- **🗂️ Histórico de sessão é protegido.** Seus transcripts e estado de sessão são os dados menos substituíveis e **nunca** são deletados em massa. O skill só oferece poda por idade com confirmação explícita por pasta — avisando antes que é permanente e quebra `--resume` e `/insights`.
- **↩️ Toda execução é reversível.** Configs são snapshotted e itens removidos são *movidos* (nunca `rm`) para um backup em `~/.claude-tuneup/backups/<run-id>/` — guardado **fora** do diretório da skill, para que uma atualização ou reinstalação da skill não apague seu histórico de undo (sobrescreva com `$CLAUDE_TUNEUP_STATE`). Reverta a qualquer momento com `claude-tuneup restore`.
- **🛡️ O restore não sobrescreve.** Antes de reverter, ele tira um snapshot das configs *atuais* (o próprio restore é reversível) e nunca sobrescreve um item mais novo que reassumiu um caminho removido — colisões viram `<path>.restored-<ts>` e são reportadas.
- **♻️ Sem reclaim inútil.** Artefatos que se regeneram sozinhos (venvs, caches, runtimes) são detectados — o skill aponta a solução real (desabilitar o plugin dono) em vez de deletar algo que só vai ser recriado.
- **🔒 Privacidade.** O relatório `/insights` é *seu* dado local — lido ao vivo para gerar sugestões, nunca copiado para o skill ou compartilhado. Backups são git-ignorados.

---

## 🧩 Como funciona

Um `SKILL.md` que o agente segue como checklist, apoiado por helpers Node determinísticos para as partes mecânicas. Ele **descobre** sua instalação em vez de presumir — sem listas de arquivos hardcoded — pergunta antes de cada alteração, e registra toda ação para que possa ser revertida. Os helpers são Node puro (sem dependências), rodando em macOS, Windows e Linux via o `node` que o Claude Code já tem.

```
skills/claude-tuneup/
├─ SKILL.md            # o skill (julgamento: classificar, perguntar, decidir)
└─ scripts/            # determinísticos, cross-OS (coletar & aplicar)
   ├─ scan.mjs         # descoberta read-only → JSON
   ├─ backup.mjs       # restore point + snapshot + stash
   ├─ restore.mjs      # listar / aplicar um restore point
   └─ insights.mjs     # executar /insights headless, extrair seções
skills.sh.json         # manifesto de registro
```

---

## 📄 Licença

[MIT](LICENSE) © [paulovitin](https://github.com/paulovitin)

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

<br/>

🌐 **Leia no seu idioma:**<br/>
🇺🇸 [English](README.md) • 🇧🇷 **Português** • 🇯🇵 [日本語](README.ja.md) • 🇨🇳 [简体中文](README.zh-CN.md) • 🇪🇸 [Español](README.es.md) • 🇫🇷 [Français](README.fr.md) • 🇷🇺 [Русский](README.ru.md)

</div>

---

> [!IMPORTANT]
> **Você sabia?** A Anthropic eliminou mais de **80%** do prompt do sistema do próprio Claude Code para os modelos da geração Claude 5. Regras antigas escritas no `CLAUDE.md` ou `SOUL.md` gastam tokens desnecessários em toda sessão. O `claude-tuneup` audita seu contexto com base nas diretrizes oficiais da Anthropic!

Meses de uso do Claude Code deixam um rastro no disco. Mas o rastro mais caro está nas suas
instruções: regras escritas para compensar modelos antigos, a mesma orientação copiada em quatro
arquivos, descrições de skill que roteiam mal, um `SOUL.md` que você paga em toda sessão sendo
relevante ou não. Tudo isso carrega antes de você digitar uma palavra.

Você tem objeções a uma ferramenta que quer mexer em qualquer coisa disso. **Ótimo.** Esta
ferramenta foi feita exatamente para gente como você — então vamos ouvi-las, uma de cada vez. Já
está convencido? O comando de instalação está [aqui embaixo](#-tá-bom-o-que-eu-digito). Não está?
Melhor ainda. Continue lendo.

---

## 🧐 "Você quer reescrever regras que *EU* escrevi?"

**Não — ela quer *propor*, e a única caneta é sua.** O grupo `instructions` (passos 12–18) nunca
edita uma regra por conta própria. Ele mostra a linha original, a reescrita sugerida e o motivo,
e não muda nada até você apertar um botão:

```text
> claude-tuneup

📝 PASSO 12: Regras que deveriam ser julgamento

   ~/.claude/CLAUDE.md:14
   "por padrão não escreva comentários. Nunca escreva docstrings de vários parágrafos."

   Escrita para um modelo antigo. Modelos atuais leem o código ao redor.
   Sugestão: "Escreva código que se lê como o código ao redor: acompanhe a
             densidade de comentários, nomes e idioma dele."

   [ Reescrever ]   [ Manter como está ]   [ Apagar ]   [ O que isso faz? ]
```

Três coisas que esse transcript não consegue mostrar:

- **Absolutos de segurança são intocáveis.** Regras como "nunca faça push na main" ou "nunca
  commite segredos" são mantidas **palavra por palavra** — nunca suavizadas, nunca "melhoradas".
- **Manter uma regra sinalizada é sempre uma resposta válida.** A ferramenta sinaliza; você julga.
- **Você nunca vai julgar algo que não consegue identificar.** Toda pergunta tem uma opção
  *"O que isso faz?"* que inspeciona e explica o item **antes** de você decidir.

---

## 📐 "Reescrever com base em *quê* — no seu gosto?"

**Zero opinião.** Cada verificação do grupo `instructions` implementa uma regra de
[**The new rules of context engineering for Claude 5 generation models**](https://claude.com/blog/the-new-rules-of-context-engineering-for-claude-5-generation-models),
da Anthropic:

| A regra | A verificação |
| --- | --- |
| Prefira julgamento a regras rígidas | **passo 12** — reescreve regras feitas para compensar modelos antigos, mantendo absolutos de segurança palavra por palavra |
| Não brigue com o harness | **passo 13** — sinaliza instruções que contradizem o que o runtime já faz |
| Diga uma vez só | **passo 14** — a mesma instrução em `CLAUDE.md`, corpos de agentes, descrições de agentes e skills |
| Interfaces em vez de exemplos | **passo 15** — campos `description` que roteiam por capacidade, não por frases de exemplo |
| Divulgação progressiva | **passo 16** — o que fica sempre carregado vs. o que vira uma skill carregada sob demanda |
| Deixe a auto-memória cuidar da memória | **passo 10** — o `SOUL.md` se aposenta na memória do próprio Claude Code |

Ela faz uma pergunta diferente de "o que dá para apagar?" — ela pergunta **"isso ainda ajuda?"**.
E a skill se cobra pelas mesmas regras: só o playbook do grupo que você está rodando entra no
contexto — a mesma disciplina de tokens que ela cobra do seu `CLAUDE.md`.

---

## 🔁 "Então toda execução me pergunta as mesmas coisas de novo?"

**Não tinha como não perguntar — nada persistia entre execuções.** A segunda passada chegava
sem memória da primeira: as mesmas regras sinalizadas, as mesmas recusas, as mesmas respostas.
Agora o que você decidiu fica registrado, e uma nova execução abre com uma linha em vez de
reabrir a discussão:

```text
> claude-tuneup

O contexto residente subiu ~380 tokens desde o último tune-up (2026-06-14).
3 itens que você pediu para manter da última vez — pulados. (`--all` revisa mesmo assim.)
```

- **Uma regra que você reescreveu volta a aparecer.** As chaves são hash do *texto*, não do
  caminho — então uma regra reescrita é proposta de novo, e corretamente: você nunca aprovou
  aquela redação. Só reformatar o parágrafo não muda nada, porque o espaço em branco é
  normalizado antes.
- **Nada some em silêncio.** As recusas colapsam naquela única linha, nunca em nada.
- **Ele lembra suas decisões, não sua escrita.** Caminhos, hashes e vereditos — nunca o
  conteúdo dos seus arquivos de instrução. Fica ao lado dos backups, então desfazer uma
  execução não apaga o que você decidiu em todas as outras.

---

## 🩺 "O Claude Code já vem com o `/doctor`. Por que você existe?"

**Porque o `/doctor` roda primeiro — esta ferramenta faz questão.** O `/doctor` é melhor em
fazer inventário: ele enxerga o uso real por componente em todos os projetos e os custos de
tokens residentes, coisa que nenhuma skill externa consegue medir. Então o claude-tuneup roda ele
por você e trabalha em cima do relatório, gastando o próprio esforço no que o `/doctor` não
toca: seu `CLAUDE.md` **global**, suas descrições de agentes e skills, um `SOUL.md` legado, e o
disco. Um complemento, não um substituto.

> **"E quando a skill roda o `/doctor` sem interface, o que impede *ele* de mudar coisas?"**
> A chamada sempre carrega uma instrução de somente-relatório, e um teste garante que ela está
> presente em todo comando que a skill monta — uma execução headless não tem prompts de
> confirmação, então a instrução é a salvaguarda, e o teste é a salvaguarda da salvaguarda.

⏱️ Orçamento honesto: uma execução completa espera cerca de **6 minutos** no passo do `/doctor`
logo no início, e pede permissão antes de gastar mais 6 verificando o resultado.

---

## 🗂️ "Vai mexer no meu histórico de conversas?"

**Só se você pedir, confirmar pasta por pasta e aceitar um aviso — e nunca por atacado.**
Transcripts de conversa e estado de sessão (`projects/`, `todos/`, `shell-snapshots/`,
`file-history/`, `history.jsonl`) são os dados menos substituíveis da máquina e **nunca** são
apagados em massa. O padrão é *manter*. No máximo ela oferece poda por idade — "transcripts com
mais de 6 meses: 142 sessões, 1.2G" — com confirmação explícita por pasta, avisando antes que é
permanente e quebra o `--resume` e o `/insights`.

---

## ↩️ "E no dia em que eu me arrepender de um clique?"

```bash
claude-tuneup restore    # escolha o ponto de restauração → completo, só configs, ou só itens
```

**Toda execução é um ponto de restauração.** Configs são fotografadas e itens removidos são
*movidos* — nunca `rm` — para `~/.claude-tuneup/backups/<run-id>/`, guardados **fora** do
diretório da skill, para que uma atualização ou reinstalação não apague seu histórico de desfazer
(sobrescreva com `$CLAUDE_TUNEUP_STATE`). Snapshots são somente-dono, porque o `.claude.json`
pode carregar tokens.

Uma execução *adiciona* além de subtrair, e o undo agora reverte os dois: skills escritas para
você durante a execução são registradas e retiradas num restore completo — *movidas* para
`undone-creations/`, não apagadas, já que você pode ter editado alguma.

> **"E a própria restauração, pode quebrar algo?"**
> Ela também é paranoica. Antes de reverter, ela fotografa suas configs *atuais* numa pasta
> `pre-restore-…` — ou seja, até o desfazer é desfazível — e nunca sobrescreve um item mais novo
> que reocupou um caminho removido: colisões pousam em `<caminho>.restored-<ts>` e são reportadas.

---

## 🔎 "E quando quebrar três dias depois, em outra sessão?"

**Esse caso tem porta de entrada própria.** O `restore` pressupõe que você sabe qual execução
desfazer. Três dias depois você não sabe — você tem um sintoma, não um id de execução:

```text
> claude-tuneup fix

   "sumiu a regra que eu tinha sobre commits"

   2 pontos de restauração mencionam isso — ranqueados, não um veredito:

   ● 2026-06-14 14:02   CLAUDE.md:14 "squash antes de push"   (removido)
     2026-06-02 09:31   actions.log — skill "git-helper" consolidada

   [ Devolver só isso ]   [ Ver a execução inteira ]   [ Nenhum dos dois ]
```

- **Ele lê o que todo ponto de restauração já guardava** — caminhos removidos, o log de ações,
  e os `CLAUDE.md`/`AGENTS.md`/`SOUL.md` snapshotados. A evidência sempre esteve ali; o que
  faltava era algo que soubesse ler.
- **Uma regressão vem dos dois lados.** O suspeito óbvio é algo removido, mas uma skill que a
  execução *criou* pode ofuscar uma que você já tinha e mudar o roteamento sem apagar nada. Os
  dois casos pedem correções opostas, então a direção é lida do registro, nunca deduzida do
  caminho.
- **Volta um item, não a execução inteira** — o resto daquele tune-up continua aplicado. A
  recuperação também é registrada, para a próxima execução não propor de novo justamente o que
  acabou de quebrar.
- **Seus segredos não são pesquisáveis.** `.claude.json` e `settings*.json` nunca são lidos pela
  busca: podem carregar tokens, e um resultado de busca é texto que ele imprime de volta pra você.

---

## 🧯 "O que eu ainda não pensei em perguntar?"

Os modos de falha com que ela já se preocupou para você não precisar:

- **Uma mudança de formato de arquivo não engana ela para uma desinstalação em massa.** Se o
  `installed_plugins.json` algum dia parsear vazio enquanto existe conteúdo de plugin no disco, a
  skill se recusa a tratar "fora da lista" como "desinstalado".
- **Ela não te vende reclames inúteis.** Artefatos que se regeneram sozinhos (venvs, caches,
  runtimes, `statsig`) são detectados — ela aponta a solução real (desativar o plugin dono) em
  vez de apagar algo que se reconstrói semana que vem.
- **Ela descobre, não presume.** Itens são classificados por características — tamanho, idade,
  links quebrados, tipo de transporte — não por nomes fixos no código.
- **Seus dados do `/insights` continuam seus.** São lidos ao vivo para guiar sugestões, nunca
  copiados para a skill nem para lugar nenhum compartilhado. Credenciais inline em configs de
  MCP são sinalizadas só pelo **nome** da variável de ambiente; valores nunca são impressos.

---

## 🤝 "Eu padronizei no `AGENTS.md`. Isso vai brigar com o meu setup?"

**O contrário — ela oferece a ponte limpa.** O Claude Code não carrega `AGENTS.md`
automaticamente, então repositórios na convenção multi-ferramenta (Codex, Cursor, Gemini CLI…)
costumam acabar com uma cópia em `CLAUDE.md` que **deriva em silêncio**. O tune-up detecta essa
deriva e consolida: a verdade compartilhada vive uma vez só no `AGENTS.md`, e o `CLAUDE.md` vira
um shim de três linhas —

```markdown
@AGENTS.md

# Específico do Claude
- (deltas que só o Claude Code deve ver)
```

Uma pergunta opt-in; quem só usa Claude nunca a vê. Imports ganham de symlinks aqui: um symlink
faz o `CLAUDE.md` *ser* o `AGENTS.md`, então toda linha exclusiva do Claude vaza para o arquivo
que suas outras ferramentas leem. E o orçamento de tokens é cobrado sobre o total *combinado*, já
que imports também carregam na inicialização.

---

## ♻️ "Eu ainda tenho um `SOUL.md` das suas versões antigas."

**Então ele é migrado, não descartado.** Versões anteriores te entrevistavam e escreviam um
`SOUL.md` carregado em toda sessão via `@SOUL.md`. O Claude Code agora faz isso sozinho, melhor —
ele salva o que aprende sobre você como **memórias, recuperadas quando relevantes** em vez de
carregadas incondicionalmente.

Então a entrevista acabou, e o tune-up **converte** o que você tem: um arquivo de memória por
fato, devidamente tipado, mostrado a você por inteiro — e só então move o arquivo para o ponto de
restauração e remove o import `@SOUL.md`. Nada é apagado antes de o substituto estar no ar, e o
desfazer traz de volta tanto o arquivo quanto o import.

> **"Memórias são por projeto. O `@SOUL.md` carregava em todo lugar. Isso é um downgrade."**
> Pego — e coberto. O tune-up oferece fechar essa lacuna com uma configuração para que as
> memórias migradas valham em todos os projetos, e ele nunca toca no seu arquivo de settings sem
> você dizer sim a exatamente essa pergunta.

---

## ⚡ "Tá bom. O que eu digito?"

```bash
npx skills add paulovitin/claude-tuneup
```

Depois, dentro do Claude Code:

```bash
claude-tuneup                    # roda tudo
claude-tuneup cleanup            # roda um grupo pelo nome
claude-tuneup instructions       # audita suas regras + descrições
claude-tuneup 1-3                # roda um intervalo de passos
claude-tuneup 6,7                # roda passos específicos
claude-tuneup claude.md soul.md  # combina grupos
claude-tuneup --dry-run          # escaneia + reporta o que mudaria, sem tocar em nada
claude-tuneup help               # lista grupos + gatilhos
claude-tuneup restore            # desfaz uma execução anterior (completa, ou só configs/itens)
claude-tuneup fix                # "X parou de funcionar": acha qual execução causou e devolve só aquilo
```

**Primeira vez? Comece com `--dry-run`** — ele mostra tudo o que *faria* e não toca em nada.
(Ele só lê: sem mudanças, sem backup. Mas ainda faz as duas chamadas de diagnóstico — `/doctor`
e `/insights`, ambas somente-leitura e com cache de uma hora — então reserve a espera do
`/doctor`.)

| Grupo | Passos | O que faz |
| -------------------- | ------ | ------------- |
| 🧹 **`cleanup`**      | 1–8, 19 | Remove lixo + conserta a integridade das configs — skills, plugins, hooks, MCPs, projetos, diretórios de estado, arquivos da raiz, `.claude.json` global, e o que o `settings.json` realmente diz — caminhos mortos, regras de permissão que se contradizem |
| 📝 **`instructions`** | 12–18   | Audita toda superfície que carrega em cada sessão — regras, descrições de skills e agents, slash commands, output styles, componentes de plugins: regras que deveriam ser julgamento, instruções que brigam com o runtime, a mesma regra em quatro lugares, descrições que roteiam mal, e fluxos que você repete mas nunca escreveu |
| 📄 **`claude.md`**    | 9       | Seu `CLAUDE.md` global + a ponte com `AGENTS.md` *(para o `CLAUDE.md` versionado de um projeto, rode `/doctor` — ele faz isso melhor)* |
| ♻️ **`soul.md`**      | 10      | Migra um `SOUL.md` legado para a auto-memória do Claude, e o aposenta |
| 📊 **`summary`**      | 11      | Relatório final do que mudou + como desfazer *(sempre roda por último)* |

Sem argumento, roda tudo. Os números dos passos são históricos; a ordem de execução é
diagnosticar → subtrair → reorganizar → adicionar.

**Atualizando:** rode de novo `npx skills add paulovitin/claude-tuneup` — executa no seu shell,
então custa zero tokens de modelo. A skill também te avisa (uma vez, com cache de um dia) quando
existe uma versão mais nova.

---

## 🧩 "O que exatamente está rodando na minha máquina?"

**Um checklist e uns scripts Node — você pode ler os dois.** Um `SKILL.md` que o agente segue,
apoiado por helpers determinísticos para as partes mecânicas. O agente decide (classifica,
pergunta, apaga/mantém); os scripts só coletam e aplicam, e toda ação é registrada para poder ser
revertida.

```
skills/claude-tuneup/
├─ SKILL.md               # roteamento + contrato de UX + regras de segurança (enxuto — carrega no gatilho)
├─ VERSION                # versão da skill publicada (alimenta o aviso de atualização)
├─ references/            # playbooks por grupo, carregados só quando aquele grupo roda
│  ├─ cleanup.md          #   passos 1–8, 19
│  ├─ instructions.md     #   passos 12–18
│  ├─ harness-invariants.md  # o que o runtime já faz (a lista do passo 13)
│  ├─ claude-md.md        #   passo 9
│  └─ soul-md.md          #   passo 10
└─ scripts/               # determinísticos, multi-OS (coletar & aplicar)
   ├─ scan.mjs            # descoberta somente-leitura → JSON (--section para uma fatia só)
   ├─ backup.mjs          # ponto de restauração + snapshot + stash
   ├─ restore.mjs         # listar / buscar / aplicar (completo, configs, itens, ou um só --only <caminho>)
   ├─ ledger.mjs          # o que você decidiu na run anterior, para não perguntar de novo (nunca o conteúdo dos arquivos)
   ├─ doctor.mjs          # roda o /doctor embutido headless, somente-relatório (cache 1h)
   ├─ insights.mjs        # roda o /insights headless (cache 1h; --no-cache)
   ├─ audit-instructions.mjs  # sinais de instruções + descrições residentes → JSON
   ├─ consolidate.mjs     # move uma skill para ~/.agents/skills + link de volta (junction no Windows)
   ├─ validate-json.mjs   # checagem de sanidade JSON após toda edição de config
   └─ version-check.mjs   # aviso de atualização barato em tokens (cache 24h, silencioso offline)
skills.sh.json             # manifesto do registro
```

> **"Funciona no Windows de verdade, ou 'funciona no Windows'?"**
> Os helpers são Node puro — sem dependências, **sem exigir `python3`** — então rodam de forma
> idêntica no macOS, Windows e Linux via o `node` que o Claude Code já traz. No Windows, a
> consolidação de skills usa junctions onde symlinks exigiriam direitos de administrador. Tudo
> que é crítico para segurança é coberto por uma suíte de testes automatizada (unitários +
> roundtrips backup→restore de ponta a ponta) rodando em CI nos três sistemas.

---

## ⚖️ O veredito é seu

Essas são todas as objeções que ouvimos até agora — se você tiver uma nova,
[abra uma issue](https://github.com/paulovitin/claude-tuneup/issues): as melhores perguntas deste
arquivo começaram como a desconfiança de alguém. O contrato vale de qualquer jeito: nada muda sem
um botão, e o `claude-tuneup restore` põe qualquer coisa de volta.

Feito para os cautelosos — com carinho.

---

## 📄 Licença

[MIT](LICENSE) © [paulovitin](https://github.com/paulovitin)

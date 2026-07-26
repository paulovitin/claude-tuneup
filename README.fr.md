<div align="center">

<img src="assets/logo.png" alt="claude-tuneup" width="220" />

# claude-tuneup

### Les règles que vous avez écrites pour Claude vous coûtent plus cher que votre tiroir à babioles.

Un agent IA audite les instructions chargées à **chaque session** — et nettoie aussi le disque.<br/>
Chaque modification est un bouton. Chaque bouton a un *"Que fait cette option ?"*. Chaque exécution peut être annulée.

<br/>

[![Installer](https://img.shields.io/badge/npx_skills_add-paulovitin%2Fclaude--tuneup-000?style=for-the-badge&logo=anthropic&logoColor=white)](https://github.com/paulovitin/claude-tuneup)
[![Licence : MIT](https://img.shields.io/badge/Licence-MIT-22c55e?style=for-the-badge)](#-licence)
[![Claude Code](https://img.shields.io/badge/Claude_Code-skill-d97757?style=for-the-badge)](https://claude.com/claude-code)

<br/>

🌐 **Choisissez votre langue :**<br/>
🇺🇸 [English](README.md) • 🇧🇷 [Português](README.pt-BR.md) • 🇯🇵 [日本語](README.ja.md) • 🇨🇳 [简体中文](README.zh-CN.md) • 🇪🇸 [Español](README.es.md) • 🇫🇷 **Français** • 🇷🇺 [Русский](README.ru.md)

</div>

---

> [!IMPORTANT]
> **Le saviez-vous ?** Anthropic a supprimé plus de **80%** du prompt système de Claude Code pour les modèles de génération Claude 5. Les règles obsolètes écrites pour les anciens modèles dans `CLAUDE.md` ou `SOUL.md` gaspillent des tokens à chaque session. `claude-tuneup` audite votre contexte selon les directives officielles d'Anthropic !

Des mois d'utilisation de Claude Code laissent une trace sur le disque. Mais la trace la plus
coûteuse est dans vos instructions : des règles écrites pour compenser d'anciens modèles, la même
consigne copiée dans quatre fichiers, des descriptions de skills qui routent mal, un `SOUL.md`
que vous payez à chaque session qu'il soit pertinent ou non. Tout cela se charge avant que vous
ne tapiez un mot.

Vous avez des objections contre un outil qui veut toucher à tout ça. **Tant mieux.** Cet outil a
été conçu exactement pour des gens comme vous — alors écoutons-les, une par une. Déjà convaincu ?
La commande d'installation est [juste ici](#--très-bien-je-tape-quoi--). Pas convaincu ? Encore
mieux. Continuez à lire.

---

## 🧐 « Vous voulez réécrire des règles que *J'AI* écrites ? »

**Non — il veut *proposer*, et vous seul tenez le stylo.** Le groupe `instructions` (étapes
12–16) ne modifie jamais une règle de lui-même. Il montre la ligne d'origine, la réécriture
suggérée et la raison, et ne change rien tant que vous n'avez pas appuyé sur un bouton :

```text
> claude-tuneup

📝 ÉTAPE 12 : Des règles qui devraient être du discernement

   ~/.claude/CLAUDE.md:14
   "par défaut n'écris aucun commentaire. N'écris jamais de docstrings de plusieurs paragraphes."

   Écrite pour un ancien modèle. Les modèles actuels lisent le code environnant.
   Suggestion : "Écris du code qui se lit comme le code qui l'entoure : suis sa
                densité de commentaires, ses noms et ses idiomes."

   [ Réécrire ]   [ Garder tel quel ]   [ Supprimer ]   [ Que fait cette option ? ]
```

Trois choses que ce transcript ne peut pas montrer :

- **Les absolus de sécurité sont intouchables.** Des règles comme « ne jamais pousser sur main »
  ou « ne jamais committer de secrets » sont conservées **mot pour mot** — jamais adoucies,
  jamais « améliorées ».
- **Garder une règle signalée est toujours une réponse valable.** L'outil signale ; vous jugez.
- **Vous ne jugerez jamais quelque chose que vous ne pouvez pas identifier.** Chaque question a
  une option *« Que fait cette option ? »* qui inspecte et explique l'élément **avant** que vous
  ne décidiez.

---

## 📐 « Les réécrire selon *quoi* — vos goûts ? »

**Zéro opinion.** Chaque vérification du groupe `instructions` implémente une règle de
[**The new rules of context engineering for Claude 5 generation models**](https://claude.com/blog/the-new-rules-of-context-engineering-for-claude-5-generation-models),
d'Anthropic :

| La règle | La vérification |
| --- | --- |
| Préférer le discernement aux règles rigides | **étape 12** — réécrit les règles conçues pour compenser d'anciens modèles, en gardant les absolus de sécurité mot pour mot |
| Ne pas lutter contre le harnais | **étape 13** — signale les instructions qui contredisent ce que le runtime fait déjà |
| Le dire une seule fois | **étape 14** — la même instruction dans `CLAUDE.md`, les corps d'agents, les descriptions d'agents et de skills |
| Des interfaces plutôt que des exemples | **étape 15** — des champs `description` qui routent par capacité, pas par tournures d'exemple |
| Divulgation progressive | **étape 16** — ce qui reste chargé en permanence vs. ce qui devient une skill chargée à la demande |
| Laisser l'auto-mémoire gérer la mémoire | **étape 10** — le `SOUL.md` prend sa retraite dans la mémoire native de Claude Code |

Il pose une question différente de « que peut-on supprimer ? » — il demande **« est-ce que ça
aide encore ? »**. Et la skill s'impose les mêmes règles : seul le playbook du groupe que vous
exécutez entre dans le contexte — la même discipline de tokens qu'elle impose à votre
`CLAUDE.md`.

---

## 🩺 « Claude Code fournit déjà `/doctor`. Pourquoi existez-vous ? »

**Parce que `/doctor` passe en premier — cet outil y tient.** `/doctor` est meilleur pour faire
l'inventaire : il voit l'usage réel par composant sur tous les projets et les coûts de tokens
résidents, ce qu'aucune skill externe ne peut mesurer. Alors claude-tuneup l'exécute pour vous et
travaille à partir de son rapport, en concentrant son effort sur ce que `/doctor` ne touche pas :
votre `CLAUDE.md` **global**, vos descriptions d'agents et de skills, un `SOUL.md` hérité, et le
disque. Un complément, pas un remplacement.

> **« Et quand la skill exécute `/doctor` sans interface, qu'est-ce qui empêche *celui-ci* de
> changer des choses ? »**
> L'appel porte toujours une instruction rapport-seulement, et un test vérifie qu'elle est
> présente dans chaque commande que la skill construit — une exécution headless n'a pas
> d'invites de confirmation, donc l'instruction est le garde-fou, et le test est le garde-fou du
> garde-fou.

⏱️ Budget honnête : une exécution complète attend environ **6 minutes** sur la passe `/doctor`
au départ, et demande avant d'en dépenser 6 de plus pour vérifier le résultat.

---

## 🗂️ « Touchera-t-il à mon historique de conversations ? »

**Seulement si vous le demandez, confirmez dossier par dossier et acceptez un avertissement — et
jamais en bloc.** Les transcripts de conversation et l'état de session (`projects/`, `todos/`,
`shell-snapshots/`, `file-history/`, `history.jsonl`) sont les données les moins remplaçables de
la machine et ne sont **jamais** supprimés en masse. Le défaut est *conserver*. Au plus, il
propose un élagage par ancienneté — « transcripts de plus de 6 mois : 142 sessions, 1.2G » —
avec confirmation explicite par dossier, en vous prévenant d'abord que c'est permanent et que
cela casse `--resume` et `/insights`.

---

## ↩️ « Et le jour où je regrette un clic ? »

```bash
claude-tuneup restore    # choisissez le point de restauration → complet, configs seules, ou éléments seuls
```

**Chaque exécution est un point de restauration.** Les configs sont photographiées et les
éléments supprimés sont *déplacés* — jamais `rm` — vers `~/.claude-tuneup/backups/<run-id>/`,
conservés **hors** du répertoire de la skill pour qu'une mise à jour ou une réinstallation ne
puisse pas effacer votre historique d'annulation (surchargez avec `$CLAUDE_TUNEUP_STATE`). Les
snapshots sont réservés au propriétaire, car `.claude.json` peut contenir des tokens.

> **« Et la restauration elle-même, peut-elle casser quelque chose ? »**
> Elle est paranoïaque aussi. Avant de revenir en arrière, elle photographie vos configs
> *actuelles* dans un dossier `pre-restore-…` — même l'annulation est donc annulable — et elle
> n'écrase jamais un élément plus récent qui a repris un chemin supprimé : les collisions
> atterrissent en `<chemin>.restored-<ts>` et sont signalées.

---

## 🧯 « Qu'est-ce que je n'ai pas pensé à demander ? »

Les modes de défaillance dont il s'est déjà inquiété pour que vous n'ayez pas à le faire :

- **Un changement de format de fichier ne peut pas le piéger en désinstallation massive.** Si
  `installed_plugins.json` se parse un jour vide alors que du contenu de plugins existe sur le
  disque, la skill refuse de traiter « non listé » comme « désinstallé ».
- **Il ne vous vend pas de récupérations inutiles.** Les artefacts auto-régénérants (venvs,
  caches, runtimes, `statsig`) sont détectés — il vous indique la vraie solution (désactiver le
  plugin propriétaire) au lieu de supprimer quelque chose qui se reconstruit la semaine
  suivante.
- **Il découvre, il ne présume pas.** Les éléments sont classés par traits — taille, ancienneté,
  liens cassés, type de transport — pas par noms codés en dur.
- **Vos données `/insights` restent les vôtres.** Elles sont lues en direct pour guider les
  suggestions, jamais copiées dans la skill ni nulle part de partagé. Les identifiants inline
  dans les configs MCP sont signalés par le **nom** de la variable d'environnement uniquement ;
  les valeurs ne sont jamais imprimées.

---

## 🤝 « J'ai standardisé sur `AGENTS.md`. Ça va se battre avec mon setup ? »

**Au contraire — il propose le pont propre.** Claude Code ne charge pas `AGENTS.md`
automatiquement, donc les dépôts sur la convention multi-outils (Codex, Cursor, Gemini CLI…)
finissent souvent avec une copie `CLAUDE.md` qui **dérive en silence**. Le tune-up détecte cette
dérive et consolide : la vérité partagée vit une seule fois dans `AGENTS.md`, et `CLAUDE.md`
devient un shim de trois lignes —

```markdown
@AGENTS.md

# Spécifique à Claude
- (deltas que seul Claude Code doit voir)
```

Une question opt-in ; les utilisateurs Claude-only ne la voient jamais. Les imports battent les
symlinks ici : un symlink fait que `CLAUDE.md` *est* `AGENTS.md`, donc chaque ligne réservée à
Claude fuit dans le fichier que lisent vos autres outils. Et le budget de tokens s'applique au
total *combiné*, puisque les imports se chargent aussi au lancement.

---

## ♻️ « J'ai encore un `SOUL.md` de vos anciennes versions. »

**Alors il est migré, pas abandonné.** Les versions précédentes vous interviewaient et
écrivaient un `SOUL.md` chargé à chaque session via `@SOUL.md`. Claude Code le fait désormais
lui-même, en mieux — il enregistre ce qu'il apprend de vous sous forme de **mémoires, rappelées
quand elles sont pertinentes** plutôt que chargées inconditionnellement.

L'interview a donc disparu, et le tune-up **convertit** ce que vous avez : un fichier de mémoire
par fait, correctement typé, montré en intégralité — et seulement ensuite il déplace le fichier
dans le point de restauration et retire l'import `@SOUL.md`. Rien n'est supprimé avant que le
remplaçant soit en place, et l'annulation ramène à la fois le fichier et l'import.

> **« Les mémoires sont par projet. `@SOUL.md` se chargeait partout. C'est une régression. »**
> Vu — et couvert. Le tune-up propose de combler cet écart avec un réglage pour que les mémoires
> migrées s'appliquent à tous les projets, et il ne touchera jamais votre fichier de settings
> sans que vous disiez oui à exactement cette question.

---

## ⚡ « Très bien. Je tape quoi ? »

```bash
npx skills add paulovitin/claude-tuneup
```

Puis, dans Claude Code :

```bash
claude-tuneup                    # exécute tout
claude-tuneup cleanup            # exécute un groupe par son nom
claude-tuneup instructions       # audite vos règles + descriptions
claude-tuneup 1-3                # exécute une plage d'étapes
claude-tuneup 6,7                # exécute des étapes précises
claude-tuneup claude.md soul.md  # combine des groupes
claude-tuneup --dry-run          # scanne + rapporte ce qui changerait, sans rien toucher
claude-tuneup help               # liste les groupes + déclencheurs
claude-tuneup restore            # annule une exécution précédente (complète, ou configs/éléments seuls)
```

**Première fois ? Commencez par `--dry-run`** — il montre tout ce qu'il *ferait* et ne touche à
rien. (Il ne fait que lire : aucun changement, aucun backup. Il effectue quand même les deux
appels de diagnostic — `/doctor` et `/insights`, tous deux en lecture seule et en cache pendant
une heure — alors prévoyez l'attente du `/doctor`.)

| Groupe | Étapes | Ce qu'il fait |
| -------------------- | ------ | ------------- |
| 🧹 **`cleanup`**      | 1–8    | Supprime les déchets + répare l'intégrité des configs — skills, plugins, hooks, MCPs, projets, répertoires d'état, fichiers racine, `.claude.json` global |
| 📝 **`instructions`** | 12–17  | Audite ce qui se charge à chaque session : règles qui devraient être du discernement, instructions qui luttent contre le runtime, la même règle à quatre endroits, descriptions qui routent mal, et workflows que vous répétez sans jamais les avoir écrits |
| 📄 **`claude.md`**    | 9      | Votre `CLAUDE.md` global + le pont `AGENTS.md` *(pour le `CLAUDE.md` versionné d'un projet, lancez `/doctor` — il le fait mieux)* |
| ♻️ **`soul.md`**      | 10     | Migre un `SOUL.md` hérité vers l'auto-mémoire de Claude, puis le retire |
| 📊 **`summary`**      | 11     | Rapport final de ce qui a changé + comment annuler *(passe toujours en dernier)* |

Sans argument, tout s'exécute. Les numéros d'étapes sont historiques ; l'ordre d'exécution est
diagnostiquer → soustraire → réorganiser → ajouter.

**Mise à jour :** relancez `npx skills add paulovitin/claude-tuneup` — cela s'exécute dans votre
shell, donc coûte zéro token de modèle. La skill vous prévient aussi (une fois, en cache un jour)
quand une version plus récente existe.

---

## 🧩 « Qu'est-ce qui tourne exactement sur ma machine ? »

**Une checklist et quelques scripts Node — vous pouvez lire les deux.** Un `SKILL.md` que
l'agent suit, appuyé par des helpers déterministes pour les parties mécaniques. L'agent décide
(classer, demander, supprimer/garder) ; les scripts ne font que collecter et appliquer, et chaque
action est journalisée pour pouvoir être annulée.

```
skills/claude-tuneup/
├─ SKILL.md               # routage + contrat UX + règles de sécurité (léger — chargé au déclenchement)
├─ VERSION                # version livrée de la skill (alimente le rappel de mise à jour)
├─ references/            # playbooks par groupe, chargés seulement quand ce groupe s'exécute
│  ├─ cleanup.md          #   étapes 1–8
│  ├─ instructions.md     #   étapes 12–17
│  ├─ harness-invariants.md  # ce que le runtime fait déjà (la liste de l'étape 13)
│  ├─ claude-md.md        #   étape 9
│  └─ soul-md.md          #   étape 10
└─ scripts/               # déterministes, multi-OS (collecter & appliquer)
   ├─ scan.mjs            # découverte en lecture seule → JSON (--section pour une seule tranche)
   ├─ backup.mjs          # point de restauration + snapshot + stash
   ├─ restore.mjs         # lister / appliquer (complet, --configs-only, --items-only)
   ├─ doctor.mjs          # exécute le /doctor intégré en headless, rapport-seulement (cache 1h)
   ├─ insights.mjs        # exécute /insights en headless (cache 1h ; --no-cache)
   ├─ audit-instructions.mjs  # signaux d'instructions + descriptions résidentes → JSON
   ├─ consolidate.mjs     # déplace une skill vers ~/.agents/skills + lien retour (junction sous Windows)
   ├─ validate-json.mjs   # contrôle de cohérence JSON après chaque édition de config
   └─ version-check.mjs   # rappel de mise à jour économe en tokens (cache 24h, silencieux hors ligne)
skills.sh.json             # manifeste du registre
```

> **« Ça marche vraiment sous Windows, ou 'ça marche sous Windows' ? »**
> Les helpers sont du Node pur — sans dépendances, **sans `python3` requis** — donc ils
> s'exécutent à l'identique sous macOS, Windows et Linux via le `node` que Claude Code embarque
> déjà. Sous Windows, la consolidation de skills se rabat sur des junctions là où les symlinks
> exigeraient des droits admin. Tout ce qui est critique pour la sécurité est couvert par une
> suite de tests automatisée (unitaires + allers-retours backup→restore de bout en bout)
> exécutée en CI sur les trois systèmes.

---

## ⚖️ Le verdict vous appartient

Voilà toutes les objections entendues jusqu'ici — si vous en avez une nouvelle,
[ouvrez une issue](https://github.com/paulovitin/claude-tuneup/issues) : les meilleures questions
de ce fichier ont commencé comme le soupçon de quelqu'un. Le contrat tient dans tous les cas :
rien ne change sans un bouton, et `claude-tuneup restore` remet tout en place.

Conçu pour les prudents — affectueusement.

---

## 📄 Licence

[MIT](LICENSE) © [paulovitin](https://github.com/paulovitin)

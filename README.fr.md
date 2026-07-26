<div align="center">

<img src="assets/logo.png" alt="claude-tuneup" width="220" />

# claude-tuneup

### Les règles que vous avez écrites pour Claude vous coûtent plus cher que votre tiroir à babioles.

Un agent IA audite les instructions chargées à **chaque session** — et nettoie aussi le disque.<br/>
Chaque modification est un bouton. Chaque bouton a un *"Que fait cette option ?"*. Chaque exécution peut être annulée.

<br/>

[![Installer](https://img.shields.io/badge/npx_skills_add-paulovitin%2Fclaude--tuneup-000?style=for-the-badge&logo=anthropic&logoColor=white)](https://github.com/paulovitin/claude-tuneup)
[![Licence: MIT](https://img.shields.io/badge/Licence-MIT-22c55e?style=for-the-badge)](#-licence)
[![Claude Code](https://img.shields.io/badge/Claude_Code-skill-d97757?style=for-the-badge)](https://claude.com/claude-code)
[![EN](https://img.shields.io/badge/README-English-000?style=for-the-badge)](README.md)
[![pt-BR](https://img.shields.io/badge/README-pt--BR-30A3DC?style=for-the-badge)](README.pt-BR.md)
[![ja](https://img.shields.io/badge/README-日本語-red?style=for-the-badge)](README.ja.md)
[![zh-CN](https://img.shields.io/badge/README-简体中文-red?style=for-the-badge)](README.zh-CN.md)
[![es](https://img.shields.io/badge/README-Español-yellow?style=for-the-badge)](README.es.md)
[![ru](https://img.shields.io/badge/README-Русский-purple?style=for-the-badge)](README.ru.md)

</div>

---

> **Lancez d'abord `/doctor`.** Il est directement fourni avec Claude Code, fait l'inventaire de votre installation mieux que n'importe quoi d'autre et est gratuit. Lancez ensuite `claude-tuneup` sur ce qui reste. Ce skill exécute `/doctor` pour vous et travaille à partir de son rapport — c'est un complément, pas un remplacement.

Des mois d'utilisation de Claude Code laissent des traces sur le disque. Mais la trace la plus coûteuse réside dans vos instructions : règles écrites pour compenser d'anciens modèles, même consigne copiée dans quatre fichiers, descriptions de skill mal routées, un `SOUL.md` payé à chaque session qu'il soit pertinent ou non. Tout cela est chargé avant même que vous n'écriviez un mot.

L'outil pose donc une question différente de "que puis-je supprimer ?" — il demande **"est-ce que cela aide toujours ?"**. Chaque vérification du groupe `instructions` provient d'une seule source : l'article d'Anthropic
[**The new rules of context engineering for Claude 5 generation models**](https://claude.com/blog/the-new-rules-of-context-engineering-for-claude-5-generation-models).

```text
> claude-tuneup

📝 ÉTAPE 12 : Règles qui devraient relever du jugement

   ~/.claude/CLAUDE.md:14
   "par défaut n'écrivez aucun commentaire. N'écrivez jamais de docstrings sur plusieurs paragraphes."

   Écrit pour un ancien modèle. Les modèles actuels lisent le code environnant.
   Suggéré : "Écrivez du code qui se lit comme le code environnant : respectez sa
              densité de commentaires, son nommage et son style."

   [ Réécrire ]   [ Conserver tel quel ]   [ Supprimer ]   [ Que fait cette option ? ]
```

Même contrat que toujours : rien ne change sans un bouton, et `claude-tuneup restore` remet tout en place.

## ⚡ Installation

```bash
npx skills add paulovitin/claude-tuneup
```

Ensuite, dans Claude Code :

```bash
claude-tuneup            # exécute tout
```

Première fois ? Commencez par `claude-tuneup --dry-run` — il affiche tout ce qu'il *ferait* sans rien modifier.

⏱️ Une exécution complète attend environ **6 minutes** pour l'étape `/doctor` au début, et demande avant de consacrer 6 autres minutes à vérifier le résultat.

---

## 🎛️ Utilisation

```bash
claude-tuneup                    # exécute tout
claude-tuneup cleanup            # exécute un groupe par nom
claude-tuneup instructions       # audite vos règles + descriptions
claude-tuneup 1-3                # exécute une plage d'étapes
claude-tuneup 6,7                # exécute des étapes spécifiques
claude-tuneup claude.md soul.md  # combine plusieurs groupes
claude-tuneup --dry-run          # analyse et rapporte ce qui changerait, sans toucher à rien
claude-tuneup help               # liste les groupes + commandes
claude-tuneup restore            # annule une exécution précédente (totalement, ou configs/éléments uniquement)
```

| Groupe | Étapes | Description |
| -------------------- | ------ | ------------- |
| 🧹 **`cleanup`**      | 1–8    | Supprime les fichiers inutiles + répare l'intégrité de la config — skills, plugins, hooks, MCPs, projets, répertoires d'état, fichiers racines, `.claude.json` global |
| 📝 **`instructions`** | 12–17  | Audite ce qui est chargé à chaque session : règles devant relever du jugement, instructions en conflit avec le runtime, même règle en quatre endroits, descriptions mal routées |
| 📄 **`claude.md`**    | 9      | Votre `CLAUDE.md` global + passerelle vers `AGENTS.md` *(pour le `CLAUDE.md` d'un projet, utilisez `/doctor`)* |
| ♻️ **`soul.md`**      | 10     | Migre un `SOUL.md` hérité vers la mémoire automatique de Claude puis le prend sa retraite |
| 📊 **`summary`**      | 11     | Rapport final des modifications + comment annuler *(s'exécute toujours en dernier)* |

---

## 📐 Origine des règles

Le groupe `instructions` applique directement les directives de l'article d'Anthropic [**The new rules of context engineering for Claude 5 generation models**](https://claude.com/blog/the-new-rules-of-context-engineering-for-claude-5-generation-models) :

| La règle | La vérification |
| --- | --- |
| Préférer le jugement aux règles rigides | **étape 12** — réécrit les règles écrites pour les anciens modèles |
| Ne pas lutter contre le runtime | **étape 13** — signale les instructions en conflit avec le comportement du runtime |
| Le dire une seule fois | **étape 14** — élimine les règles dupliquées entre `CLAUDE.md` et les descriptions |
| Interfaces plutôt qu'exemples | **étape 15** — optimise les champs `description` selon la capacité |
| Divulgation progressive | **étape 16** — sépare le contenu chargé en permanence de celui chargé à la demande |
| Laisser l'auto-mémoire gérer la mémoire | **étape 10** — migre `SOUL.md` vers la mémoire de Claude Code |

---

## 🛟 Sécurité et annulation (Restore)

- **✍️ Vos mots vous appartiennent :** les étapes 12 à 16 proposent des modifications avec explication sans rien appliquer sans votre clic.
- **🔘 Aucune suppression sans confirmation :** chaque choix est un bouton expliqué.
- **🗂️ Votre historique de chat est sacré :** les transcriptions de conversation ne sont jamais supprimées en bloc.
- **↩️ Chaque exécution est annulable :** sauvegarde automatique dans `~/.claude-tuneup/backups/<run-id>/`, et `claude-tuneup restore` remet tout en état.

---

## 📄 Licence

[MIT](LICENSE) © [paulovitin](https://github.com/paulovitin)

<div align="center">

<img src="assets/logo.png" alt="claude-tuneup" width="220" />

# claude-tuneup

### Las reglas que escribiste para Claude te están costando más que tu cajón de desastre.

Un agente de IA audita las instrucciones que se cargan en **cada sesión** — y limpia el disco también.<br/>
Cada cambio es un botón. Cada botón tiene un *"¿Qué hace esto?"*. Cada ejecución se puede deshacer.

<br/>

[![Instalar](https://img.shields.io/badge/npx_skills_add-paulovitin%2Fclaude--tuneup-000?style=for-the-badge&logo=anthropic&logoColor=white)](https://github.com/paulovitin/claude-tuneup)
[![Licencia: MIT](https://img.shields.io/badge/Licencia-MIT-22c55e?style=for-the-badge)](#-licencia)
[![Claude Code](https://img.shields.io/badge/Claude_Code-skill-d97757?style=for-the-badge)](https://claude.com/claude-code)
[![EN](https://img.shields.io/badge/README-English-000?style=for-the-badge)](README.md)
[![pt-BR](https://img.shields.io/badge/README-pt--BR-30A3DC?style=for-the-badge)](README.pt-BR.md)
[![ja](https://img.shields.io/badge/README-日本語-red?style=for-the-badge)](README.ja.md)
[![zh-CN](https://img.shields.io/badge/README-简体中文-red?style=for-the-badge)](README.zh-CN.md)
[![fr](https://img.shields.io/badge/README-Français-blue?style=for-the-badge)](README.fr.md)
[![ru](https://img.shields.io/badge/README-Русский-purple?style=for-the-badge)](README.ru.md)

</div>

---

> **Ejecuta `/doctor` primero.** Viene incluido con Claude Code, toma inventario de tu instalación mejor que cualquier otra cosa y es gratuito. Luego ejecuta `claude-tuneup` en lo que quede. Esta skill ejecuta `/doctor` por ti y trabaja sobre su informe — es un complemento, no un reemplazo.

Meses de uso de Claude Code dejan rastro en el disco. Pero el rastro más costoso está en tus instrucciones: reglas escritas para compensar modelos antiguos, la misma guía copiada en cuatro archivos, descripciones de skills que enrutan mal, un `SOUL.md` que pagas en cada sesión sea relevante o no. Todo ello se carga antes de que escribas una sola palabra.

Así que la herramienta hace una pregunta diferente a "¿qué puedo eliminar?" — pregunta **"¿esto todavía ayuda?"**. Cada verificación en el grupo `instructions` proviene de una sola fuente: el artículo de Anthropic
[**The new rules of context engineering for Claude 5 generation models**](https://claude.com/blog/the-new-rules-of-context-engineering-for-claude-5-generation-models).

```text
> claude-tuneup

📝 PASO 12: Reglas que deberían ser criterio

   ~/.claude/CLAUDE.md:14
   "por defecto no escribas comentarios. Nunca escribas docstrings de varios párrafos."

   Escrita para un modelo antiguo. Los modelos actuales leen el código circundante.
   Sugerencia: "Escribe código que se lea como el código circundante: coincide con su
              densidad de comentarios, nombres y estilo."

   [ Reescribir ]   [ Mantener ]   [ Eliminar ]   [ ¿Qué hace esto? ]
```

Mismo contrato de siempre: nada cambia sin un botón, y `claude-tuneup restore` lo devuelve todo.

## ⚡ Instalación

```bash
npx skills add paulovitin/claude-tuneup
```

Luego, en Claude Code:

```bash
claude-tuneup            # ejecuta todo
```

¿Primera vez? Empieza con `claude-tuneup --dry-run` — muestra todo lo que *haría* y no toca nada.

⏱️ Una ejecución completa espera unos **6 minutos** en el paso inicial de `/doctor`, y pregunta antes de gastar otros 6 en verificar el resultado.

---

## 🎛️ Uso

```bash
claude-tuneup                    # ejecuta todo
claude-tuneup cleanup            # ejecuta un grupo por nombre
claude-tuneup instructions       # audita tus reglas + descripciones
claude-tuneup 1-3                # ejecuta un rango de pasos
claude-tuneup 6,7                # ejecuta pasos específicos
claude-tuneup claude.md soul.md  # combina grupos
claude-tuneup --dry-run          # escanea y reporta qué cambiaría, sin modificar nada
claude-tuneup help               # lista grupos + comandos
claude-tuneup restore            # deshace una ejecución anterior (todo, o solo configs/elementos)
```

| Grupo | Pasos | Qué hace |
| -------------------- | ------ | ------------- |
| 🧹 **`cleanup`**      | 1–8    | Elimina basura + corrige integridad de configuración — skills, plugins, hooks, MCPs, proyectos, directorios de estado, archivos raíz, `.claude.json` global |
| 📝 **`instructions`** | 12–17  | Audita lo que se carga en cada sesión: reglas que deberían ser criterio, instrucciones que chocan con el runtime, la misma regla en cuatro lugares, descripciones que enrutan mal y flujos repetidos no documentados |
| 📄 **`claude.md`**    | 9      | Tu `CLAUDE.md` global + el puente con `AGENTS.md` *(para el `CLAUDE.md` de un proyecto, ejecuta `/doctor`)* |
| ♻️ **`soul.md`**      | 10     | Migra un `SOUL.md` heredado a la memoria automática de Claude y lo retira |
| 📊 **`summary`**      | 11     | Informe final de lo que cambió + cómo deshacer *(siempre se ejecuta al final)* |

---

## 📐 De dónde vienen las reglas

El grupo `instructions` no es un conjunto de opiniones. Cada verificación implementa una regla de [**The new rules of context engineering for Claude 5 generation models**](https://claude.com/blog/the-new-rules-of-context-engineering-for-claude-5-generation-models):

| La regla | La verificación |
| --- | --- |
| Prefiere el criterio a las reglas rígidas | **paso 12** — reescribe reglas escritas para modelos antiguos, manteniendo absolutos de seguridad |
| No luches contra el runtime | **paso 13** — marca instrucciones que contradicen lo que el runtime ya hace |
| Dilo una sola vez | **paso 14** — elimina instrucciones duplicadas en `CLAUDE.md` y descripciones |
| Interfaces sobre ejemplos | **paso 15** — optimiza campos `description` basados en capacidad en lugar de frases de ejemplo |
| Divulgación progresiva (Progressive disclosure) | **paso 16** — separa lo cargado permanentemente de lo cargado bajo demanda |
| Permite que la auto-memoria actúe | **paso 10** — retira `SOUL.md` hacia la memoria de Claude Code |

---

## 🛟 Seguridad y deshacer (Restore)

- **✍️ Tus palabras son tuyas:** los pasos 12–16 solo proponen. Muestran el original, la sugerencia y la razón. Nada cambia sin hacer clic.
- **🔘 Nada eliminado sin confirmación:** cada opción es un botón con explicación.
- **🗂️ Tu historial de chat es sagrado:** las transcripciones y estados de sesión no se eliminan masivamente.
- **↩️ Toda ejecución es deshacible:** las configuraciones se respaldan en `~/.claude-tuneup/backups/<run-id>/` y `claude-tuneup restore` lo restaura todo.

---

## 📄 Licencia

[MIT](LICENSE) © [paulovitin](https://github.com/paulovitin)

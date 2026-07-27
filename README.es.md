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

<br/>

🌐 **Selecciona tu idioma:**<br/>
🇺🇸 [English](README.md) • 🇧🇷 [Português](README.pt-BR.md) • 🇯🇵 [日本語](README.ja.md) • 🇨🇳 [简体中文](README.zh-CN.md) • 🇪🇸 **Español** • 🇫🇷 [Français](README.fr.md) • 🇷🇺 [Русский](README.ru.md)

</div>

---

> [!IMPORTANT]
> **¿Sabías que...?** Anthropic eliminó más del **80%** del system prompt del propio Claude Code para los modelos de la generación Claude 5. Las reglas antiguas escritas en `CLAUDE.md` o `SOUL.md` malgastan tokens de razonamiento en cada sesión. ¡`claude-tuneup` audita tu contexto según las pautas oficiales de Anthropic!

Meses de uso de Claude Code dejan rastro en el disco. Pero el rastro más costoso está en tus
instrucciones: reglas escritas para compensar modelos antiguos, la misma guía copiada en cuatro
archivos, descripciones de skills que enrutan mal, un `SOUL.md` que pagas en cada sesión sea
relevante o no. Todo ello se carga antes de que escribas una sola palabra.

Tienes objeciones contra una herramienta que quiere tocar algo de eso. **Bien.** Esta herramienta
se hizo exactamente para gente como tú — así que escuchémoslas, una por una. ¿Ya estás
convencido? El comando de instalación está [aquí abajo](#-está-bien-qué-tecleo). ¿No lo estás?
Mejor. Sigue leyendo.

---

## 🧐 "¿Quieres reescribir reglas que escribí *YO*?"

**No — quiere *proponer*, y la única pluma la tienes tú.** El grupo `instructions` (pasos 12–18)
nunca edita una regla por su cuenta. Muestra la línea original, la reescritura sugerida y el
motivo, y no cambia nada hasta que pulsas un botón:

```text
> claude-tuneup

📝 PASO 12: Reglas que deberían ser criterio

   ~/.claude/CLAUDE.md:14
   "por defecto no escribas comentarios. Nunca escribas docstrings de varios párrafos."

   Escrita para un modelo antiguo. Los modelos actuales leen el código circundante.
   Sugerencia: "Escribe código que se lea como el código que lo rodea: iguala su
               densidad de comentarios, nombres e idioma."

   [ Reescribir ]   [ Mantener tal cual ]   [ Borrar ]   [ ¿Qué hace esto? ]
```

Tres cosas que ese transcript no puede mostrar:

- **Los absolutos de seguridad son intocables.** Reglas como "nunca hagas push a main" o "nunca
  comitees secretos" se conservan **palabra por palabra** — nunca se suavizan, nunca se
  "mejoran".
- **Mantener una regla señalada siempre es una respuesta válida.** La herramienta señala; tú
  juzgas.
- **Nunca juzgarás algo que no puedas identificar.** Cada pregunta tiene una opción *"¿Qué hace
  esto?"* que inspecciona y explica el elemento **antes** de que decidas.

---

## 📐 "¿Reescribirlas según *qué* — tu gusto?"

**Cero opiniones.** Cada comprobación del grupo `instructions` implementa una regla de
[**The new rules of context engineering for Claude 5 generation models**](https://claude.com/blog/the-new-rules-of-context-engineering-for-claude-5-generation-models),
de Anthropic:

| La regla | La comprobación |
| --- | --- |
| Prefiere el criterio a las reglas rígidas | **paso 12** — reescribe reglas hechas para compensar modelos antiguos, conservando los absolutos de seguridad palabra por palabra |
| No pelees con el harness | **paso 13** — señala instrucciones que contradicen lo que el runtime ya hace |
| Dilo una sola vez | **paso 14** — la misma instrucción en `CLAUDE.md`, cuerpos de agentes, descripciones de agentes y skills |
| Interfaces antes que ejemplos | **paso 15** — campos `description` que enrutan por capacidad, no por frases de ejemplo |
| Divulgación progresiva | **paso 16** — qué queda siempre cargado vs. qué se convierte en una skill de carga diferida |
| Deja que la auto-memoria haga de memoria | **paso 10** — el `SOUL.md` se retira a la memoria propia de Claude Code |

Hace una pregunta distinta a "¿qué se puede borrar?" — pregunta **"¿esto sigue ayudando?"**.
Y la skill se exige las mismas reglas: solo el playbook del grupo que estás ejecutando entra en
el contexto — la misma disciplina de tokens que impone a tu `CLAUDE.md`.

---

## 🩺 "Claude Code ya trae `/doctor`. ¿Por qué existes?"

**Porque `/doctor` corre primero — esta herramienta insiste en ello.** `/doctor` es mejor
haciendo inventario: ve el uso real por componente en todos los proyectos y los costes de tokens
residentes, algo que ninguna skill externa puede medir. Así que claude-tuneup lo ejecuta por ti y
trabaja a partir de su informe, gastando su propio esfuerzo en lo que `/doctor` no toca: tu
`CLAUDE.md` **global**, tus descripciones de agentes y skills, un `SOUL.md` heredado, y el disco.
Un complemento, no un reemplazo.

> **"Y cuando la skill ejecuta `/doctor` sin interfaz, ¿qué impide que *ese* cambie cosas?"**
> La llamada siempre lleva una instrucción de solo-informe, y un test verifica que está presente
> en cada comando que la skill construye — una ejecución headless no tiene prompts de
> confirmación, así que la instrucción es la salvaguarda, y el test es la salvaguarda de la
> salvaguarda.

⏱️ Presupuesto honesto: una ejecución completa espera unos **6 minutos** en el paso de `/doctor`
al principio, y pide permiso antes de gastar otros 6 verificando el resultado.

---

## 🗂️ "¿Tocará mi historial de chats?"

**Solo si lo pides, lo confirmas carpeta por carpeta y aceptas una advertencia — y nunca al por
mayor.** Los transcripts de conversación y el estado de sesión (`projects/`, `todos/`,
`shell-snapshots/`, `file-history/`, `history.jsonl`) son los datos menos reemplazables de la
máquina y **nunca** se borran en masa. El valor por defecto es *conservar*. Como mucho ofrece una
poda por antigüedad — "transcripts de más de 6 meses: 142 sesiones, 1.2G" — con confirmación
explícita por carpeta, advirtiéndote antes de que es permanente y rompe `--resume` y `/insights`.

---

## ↩️ "¿Y el día que me arrepienta de un clic?"

```bash
claude-tuneup restore    # elige el punto de restauración → completo, solo configs, o solo elementos
```

**Cada ejecución es un punto de restauración.** Las configs se fotografían y los elementos
eliminados se *mueven* — nunca `rm` — a `~/.claude-tuneup/backups/<run-id>/`, guardados **fuera**
del directorio de la skill para que una actualización o reinstalación no borre tu historial de
deshacer (anúlalo con `$CLAUDE_TUNEUP_STATE`). Los snapshots son solo-propietario, porque
`.claude.json` puede llevar tokens.

Una ejecución *añade* además de restar, y el undo ahora revierte ambas: las skills escritas para
ti durante la ejecución quedan registradas y se retiran en un restore completo — *movidas* a
`undone-creations/`, no borradas, porque puede que hayas editado alguna.

> **"¿Y la propia restauración puede romper algo?"**
> También es paranoica. Antes de revertir, fotografía tus configs *actuales* en una carpeta
> `pre-restore-…` — así que hasta deshacer es deshacible — y nunca sobrescribe un elemento más
> nuevo que reocupó una ruta eliminada: las colisiones aterrizan en `<ruta>.restored-<ts>` y se
> reportan.

---

## 🧯 "¿Qué no se me ha ocurrido preguntar?"

Los modos de fallo de los que ya se preocupó para que tú no tengas que hacerlo:

- **Un cambio de formato de archivo no puede engañarla para una desinstalación masiva.** Si
  `installed_plugins.json` alguna vez parsea vacío mientras existe contenido de plugins en
  disco, la skill se niega a tratar "no listado" como "desinstalado".
- **No te vende recuperaciones inútiles.** Los artefactos que se regeneran solos (venvs, cachés,
  runtimes, `statsig`) se detectan — te señala la solución real (desactivar el plugin dueño) en
  vez de borrar algo que se reconstruye la semana que viene.
- **Descubre, no asume.** Los elementos se clasifican por rasgos — tamaño, antigüedad, enlaces
  rotos, tipo de transporte — no por nombres codificados.
- **Tus datos de `/insights` siguen siendo tuyos.** Se leen en vivo para guiar sugerencias,
  nunca se copian a la skill ni a ningún lugar compartido. Las credenciales inline en configs de
  MCP se señalan solo por el **nombre** de la variable de entorno; los valores nunca se
  imprimen.

---

## 🤝 "Yo estandaricé con `AGENTS.md`. ¿Esto peleará con mi setup?"

**Al contrario — ofrece el puente limpio.** Claude Code no carga `AGENTS.md` automáticamente,
así que los repos con la convención multi-herramienta (Codex, Cursor, Gemini CLI…) suelen acabar
con una copia en `CLAUDE.md` que **deriva en silencio**. El tune-up detecta esa deriva y
consolida: la verdad compartida vive una sola vez en `AGENTS.md`, y `CLAUDE.md` se convierte en
un shim de tres líneas —

```markdown
@AGENTS.md

# Específico de Claude
- (deltas que solo Claude Code debe ver)
```

Una pregunta opt-in; quien solo usa Claude nunca la ve. Los imports ganan a los symlinks aquí: un
symlink hace que `CLAUDE.md` *sea* `AGENTS.md`, así que cada línea exclusiva de Claude se filtra
al archivo que leen tus otras herramientas. Y el presupuesto de tokens se aplica sobre el total
*combinado*, ya que los imports también se cargan al arranque.

---

## ♻️ "Todavía tengo un `SOUL.md` de tus versiones antiguas."

**Entonces se migra, no se descarta.** Las versiones anteriores te entrevistaban y escribían un
`SOUL.md` cargado en cada sesión vía `@SOUL.md`. Claude Code ahora lo hace solo, y mejor —
guarda lo que aprende de ti como **memorias, recuperadas cuando son relevantes** en vez de
cargadas incondicionalmente.

Así que la entrevista desapareció, y el tune-up **convierte** lo que tienes: un archivo de
memoria por hecho, debidamente tipado, mostrado completo — y solo entonces mueve el archivo al
punto de restauración y elimina el import `@SOUL.md`. Nada se borra antes de que el reemplazo
esté vivo, y deshacer devuelve tanto el archivo como el import.

> **"Las memorias son por proyecto. `@SOUL.md` se cargaba en todas partes. Eso es un downgrade."**
> Pillado — y cubierto. El tune-up ofrece cerrar esa brecha con un ajuste para que las memorias
> migradas apliquen en todos los proyectos, y nunca tocará tu archivo de settings sin que digas
> que sí a exactamente esa pregunta.

---

## ⚡ "Está bien. ¿Qué tecleo?"

```bash
npx skills add paulovitin/claude-tuneup
```

Luego, dentro de Claude Code:

```bash
claude-tuneup                    # lo ejecuta todo
claude-tuneup cleanup            # ejecuta un grupo por nombre
claude-tuneup instructions       # audita tus reglas + descripciones
claude-tuneup 1-3                # ejecuta un rango de pasos
claude-tuneup 6,7                # ejecuta pasos concretos
claude-tuneup claude.md soul.md  # combina grupos
claude-tuneup --dry-run          # escanea + informa de lo que cambiaría, sin tocar nada
claude-tuneup help               # lista grupos + disparadores
claude-tuneup restore            # deshace una ejecución anterior (completa, o solo configs/elementos)
claude-tuneup fix                # "X dejó de funcionar": rastrea qué ejecución fue y repone solo eso
```

**¿Primera vez? Empieza con `--dry-run`** — muestra todo lo que *haría* y no toca nada.
(Solo lee: sin cambios, sin backup. Aun así hace las dos llamadas de diagnóstico — `/doctor` y
`/insights`, ambas de solo lectura y con caché de una hora — así que reserva la espera del
`/doctor`.)

| Grupo | Pasos | Qué hace |
| -------------------- | ------ | ------------- |
| 🧹 **`cleanup`**      | 1–8, 19 | Elimina basura + arregla la integridad de las configs — skills, plugins, hooks, MCPs, proyectos, directorios de estado, archivos raíz, `.claude.json` global, y lo que el `settings.json` dice de verdad — rutas muertas, reglas de permiso que se contradicen |
| 📝 **`instructions`** | 12–18   | Audita cada superficie que se carga en cada sesión — reglas, descripciones de skills y agents, slash commands, output styles, componentes de plugins: reglas que deberían ser criterio, instrucciones que pelean con el runtime, la misma regla en cuatro sitios, descripciones que enrutan mal, y flujos que repites pero nunca escribiste |
| 📄 **`claude.md`**    | 9       | Tu `CLAUDE.md` global + el puente con `AGENTS.md` *(para el `CLAUDE.md` versionado de un proyecto, ejecuta `/doctor` — lo hace mejor)* |
| ♻️ **`soul.md`**      | 10      | Migra un `SOUL.md` heredado a la auto-memoria de Claude, y lo retira |
| 📊 **`summary`**      | 11      | Informe final de lo que cambió + cómo deshacerlo *(siempre corre al final)* |

Sin argumento lo ejecuta todo. Los números de paso son históricos; el orden de ejecución es
diagnosticar → sustraer → reorganizar → añadir.

**Actualizar:** vuelve a ejecutar `npx skills add paulovitin/claude-tuneup` — corre en tu shell,
así que cuesta cero tokens de modelo. La skill también te avisa (una vez, con caché de un día)
cuando existe una versión más nueva.

---

## 🧩 "¿Qué está corriendo exactamente en mi máquina?"

**Un checklist y unos scripts de Node — puedes leer ambos.** Un `SKILL.md` que el agente sigue,
respaldado por helpers deterministas para las partes mecánicas. El agente decide (clasifica,
pregunta, borra/conserva); los scripts solo recopilan y aplican, y cada acción se registra para
poder revertirse.

```
skills/claude-tuneup/
├─ SKILL.md               # enrutado + contrato de UX + reglas de seguridad (ligero — se carga al disparo)
├─ VERSION                # versión publicada de la skill (alimenta el aviso de actualización)
├─ references/            # playbooks por grupo, cargados solo cuando ese grupo corre
│  ├─ cleanup.md          #   pasos 1–8, 19
│  ├─ instructions.md     #   pasos 12–18
│  ├─ harness-invariants.md  # lo que el runtime ya hace (la lista del paso 13)
│  ├─ claude-md.md        #   paso 9
│  └─ soul-md.md          #   paso 10
└─ scripts/               # deterministas, multi-OS (recopilar & aplicar)
   ├─ scan.mjs            # descubrimiento de solo lectura → JSON (--section para una sola porción)
   ├─ backup.mjs          # punto de restauración + snapshot + stash
   ├─ restore.mjs         # listar / buscar / aplicar (completo, configs, ítems, o uno solo --only <ruta>)
   ├─ ledger.mjs          # lo que decidiste en la run anterior, para no volver a preguntar (nunca el contenido de los archivos)
   ├─ doctor.mjs          # ejecuta el /doctor integrado headless, solo-informe (caché 1h)
   ├─ insights.mjs        # ejecuta /insights headless (caché 1h; --no-cache)
   ├─ audit-instructions.mjs  # señales de instrucciones + descripciones residentes → JSON
   ├─ consolidate.mjs     # mueve una skill a ~/.agents/skills + enlace de vuelta (junction en Windows)
   ├─ validate-json.mjs   # comprobación de sanidad JSON tras cada edición de config
   └─ version-check.mjs   # aviso de actualización barato en tokens (caché 24h, silencioso offline)
skills.sh.json             # manifiesto del registro
```

> **"¿Funciona en Windows de verdad, o 'funciona en Windows'?"**
> Los helpers son Node puro — sin dependencias, **sin requerir `python3`** — así que corren
> idénticos en macOS, Windows y Linux vía el `node` que Claude Code ya incluye. En Windows, la
> consolidación de skills recurre a junctions donde los symlinks exigirían derechos de
> administrador. Todo lo crítico para la seguridad está cubierto por una suite de tests
> automatizada (unitarios + roundtrips backup→restore de extremo a extremo) corriendo en CI en
> los tres sistemas.

---

## ⚖️ El veredicto es tuyo

Esas son todas las objeciones que hemos oído hasta ahora — si tienes una nueva,
[abre un issue](https://github.com/paulovitin/claude-tuneup/issues): las mejores preguntas de
este archivo empezaron como la sospecha de alguien. El contrato se mantiene igual: nada cambia
sin un botón, y `claude-tuneup restore` devuelve cualquier cosa a su sitio.

Hecho para los cautelosos — con cariño.

---

## 📄 Licencia

[MIT](LICENSE) © [paulovitin](https://github.com/paulovitin)

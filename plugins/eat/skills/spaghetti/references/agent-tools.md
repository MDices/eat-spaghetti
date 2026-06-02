# Agent Tools — mapa de ferramentas por agente

Esta skill foi escrita com os **nomes de ferramenta do Claude Code**. Codex e Antigravity
executam as mesmas ações por outras ferramentas (em geral, shell + apply_patch). Use esta
tabela pra traduzir cada passo. **A lógica da skill é a mesma; só muda o "como".**

| Ação na SKILL.md | Claude Code | Codex (GPT) | Antigravity (Gemini) |
|------------------|-------------|-------------|----------------------|
| Buscar por conteúdo ("Grep for X") | `Grep` | shell: `rg X` (ripgrep) | shell: `rg X` |
| Achar arquivos ("Glob") | `Glob` | shell: `rg --files`, `find` | shell: `find` / glob |
| Ler arquivo | `Read` | shell: `sed -n`, `cat` | leitura nativa / `cat` |
| Editar arquivo | `Edit` / `Write` | `apply_patch` | edição nativa / `apply_patch` |
| Rodar comando | `Bash` | shell nativo | shell nativo |
| **Verificar testes (Fase 3)** | skill `loop-test` (wrapper) | shell: o comando de teste do projeto direto | shell: idem |
| **Blast radius (Fase 0)** | `node scripts/blast-radius.mjs <f> --root <repo>` | **mesmo comando** (`node ...`) | **mesmo comando** |
| Invocar a skill | tool `Skill` / `/eat:spaghetti` | `/skills` ou `$` (escaneia `.agents/skills`) | match por *description* |

## Princípios que não mudam entre agentes

1. **As 6 Hard Rules valem em qualquer agente** (escopo único, não mudar comportamento, só
   refactorings do catálogo, não pular Fase 2, re-testar entre micro-steps, nunca burlar guards).
2. **Verificação entre micro-steps** = rodar a **suíte filtrada** pelo runner do projeto:
   - JS/TS: `npx vitest related --run <file>` ou `npm test -- <pattern>`
   - Python: `pytest <path>`
   - Go: `go test ./pkg/...`
   - Rust: `cargo test <module>`
   O `loop-test` do Claude é só um wrapper disso — em outros agentes, rode o comando direto.
3. **Primitivos agnósticos > ferramenta de agente.** O `blast-radius.mjs` é Node puro de
   propósito: roda igual em Claude, Codex, Antigravity e no CI (`npx eat-spaghetti-blast-radius`).
   Sempre que possível, prefira um script/CLI a depender de uma ferramenta específica de um agente.

## Descoberta da skill por agente

- **Claude Code:** plugin via marketplace (`/eat:spaghetti`).
- **Codex:** coloque a skill em `.agents/skills/spaghetti/` (Codex escaneia do cwd até a raiz do repo).
- **Antigravity:** skill carregada sob demanda pela *description*; em `.agents/skills/`.

> O `SKILL.md` (name + description + corpo) é o **mesmo arquivo** pros três — só o local de
> instalação/descoberta muda. Não duplique o conteúdo da skill por agente.

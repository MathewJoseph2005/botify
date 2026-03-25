---
name: project-context-expert
description: 'Act as a project context expert by deeply scanning code, docs, and architecture to answer high-level prompts using repository-specific intent inference. Use when prompts are vague, use project terms, or ask for changes without file-level detail.'
argument-hint: 'Describe the user prompt to interpret and any scope limits (full repo, frontend only, backend only).'
user-invocable: true
disable-model-invocation: false
---

# Project Context Expert

## Purpose
Build strong repository context before proposing or making changes, then infer user intent from existing project structure and logic instead of asking avoidable clarification questions.

## Use When
- The user prompt is high-level or ambiguous but likely resolvable from the codebase.
- The prompt references product behavior without naming files.
- The prompt uses domain terms that exist in project docs/routes/components.
- You need to map requirements to architecture quickly and safely.

## Inputs
- User request text
- Current workspace contents
- Optional scope constraints (for example: backend only)

## Procedure
1. Define scan boundary.
   - Default to full repository.
   - Narrow only if user explicitly scopes the task.

2. Build project map.
   - Identify major apps/services, entry points, routing, config, and data layers.
   - Read root docs and service-level docs first.

3. Build domain glossary.
   - Extract repeated domain entities and operations from code and docs.
   - Map user vocabulary to the closest project terms.

4. Trace execution paths.
   - Follow likely request flow from UI/API entry points to controllers/services/data.
   - Note auth, validation, side effects, external integrations, and error boundaries.

5. Infer intent from evidence.
   - Generate the most likely interpretation from discovered entities and flows.
   - Prefer concrete, repository-backed assumptions over generic guesses.

6. Choose action strategy.
   - If intent is strongly supported: proceed with implementation.
   - If 2-3 plausible interpretations remain: present concise options and continue once selected.
   - If blocked by missing external facts (credentials, business policy): ask only the minimum required question.

7. Validate completeness.
   - Confirm impacted files, tests, config, and docs are covered.
   - Check for security, auth, migration, and backward-compatibility risks.

8. Report with context anchors.
   - Summarize inferred intent and why.
   - Cite key files/symbols that support the interpretation.
   - Then provide implementation or next action.

## Decision Rules
- Do not ask for clarification when the answer is already inferable from repository context.
- Ask clarification only when multiple interpretations have materially different outcomes.
- Prefer smallest safe change that satisfies inferred intent.
- Preserve existing architecture and style unless user asks for redesign.

## Quality Checks
- Inference is tied to concrete code/docs evidence.
- Proposed changes align with existing conventions.
- Risks and assumptions are explicit.
- Minimal clarifications asked.
- Task can be executed end-to-end from inferred context.

## Output Contract
When responding to a vague prompt:
1. State inferred intent in one sentence.
2. List key evidence from project context.
3. Execute or propose the smallest complete implementation path.
4. Ask at most one clarifying question only if genuinely blocking.

## Example Triggers
- "Add analytics for campaigns"
- "Fix login edge case"
- "Make marketplace bot creation safer"
- "Improve reset password flow"
- "Why is checkout data missing?"

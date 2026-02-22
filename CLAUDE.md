# GENBA-OS — AI Assistant Guide

## Project Overview

**GENBA-OS** is an MVP application built around a voice-first workflow:

```
Voice → Transcribe → Summarize → Save
```

The goal is to capture spoken input (field notes, meetings, on-site reports), automatically transcribe and summarize it, then persist the result. "GENBA" (現場) is Japanese for "the site" or "the field," suggesting the primary use case is fieldwork or on-site recording.

## Current Repository State

This repository is in its **initial bootstrap phase**. As of the last commit:

- `README.md` — single-line project description
- No source code, dependencies, or configuration files exist yet

All architecture decisions are still open. Conventions documented below should be followed as the codebase is built out.

## Repository Structure (Intended)

As the project grows, adopt this directory layout:

```
GENBA-OS/
├── CLAUDE.md               # This file
├── README.md               # Project overview for humans
├── src/                    # Application source code
│   ├── audio/              # Voice capture / recording modules
│   ├── transcribe/         # Speech-to-text integration
│   ├── summarize/          # Summarization logic (LLM or rules-based)
│   └── storage/            # Persistence layer (file, DB, cloud)
├── tests/                  # Test files mirroring src/ structure
├── docs/                   # Architecture decisions, API references
└── scripts/                # Dev utilities, one-off tools
```

Update this section when the actual structure diverges.

## Development Workflow

### Branching

- Main integration branch: `main`
- Feature branches: `feature/<short-description>`
- AI-generated branches: `claude/<description>-<session-id>` (required naming convention)
- Never push directly to `main` without a PR review

### Commits

Write commit messages in the imperative mood:
- `Add voice capture module`
- `Fix transcription timeout handling`
- `Remove unused storage adapter`

Keep commits focused. One logical change per commit.

### Pull Requests

- Title must be ≤ 70 characters
- Body should include a summary and a test plan checklist
- All CI checks must pass before merge

## Key Conventions

### Language / Runtime

Not yet decided. When a language is chosen, document it here along with:
- Minimum required version
- Package manager used (`npm`, `pip`, `cargo`, etc.)
- How to install dependencies
- How to run the project locally

### Testing

- Write tests alongside source code in a `tests/` directory
- Prefer unit tests for pure logic (transcription parsing, summarization output)
- Integration tests for I/O boundaries (audio input, storage writes)
- Document the test command here once the toolchain is chosen

### Environment Variables

- Never commit secrets or API keys
- Use a `.env` file locally (add `.env` to `.gitignore`)
- Document all required variables in a `.env.example` file

### External Services

The pipeline will likely depend on:
| Service | Purpose | Notes |
|---------|---------|-------|
| Speech-to-text API | Transcription | (e.g., Whisper, Google STT) |
| LLM API | Summarization | (e.g., Claude via Anthropic SDK) |
| Storage | Save results | (file system, S3, DB — TBD) |

Document chosen services and their configuration when integrated.

## Common Commands

> Update this section as the toolchain is established.

```bash
# Install dependencies
# <command TBD>

# Run the app
# <command TBD>

# Run tests
# <command TBD>

# Lint / format
# <command TBD>
```

## AI Assistant Notes

- This project is in MVP phase: keep implementations minimal and direct
- Avoid premature abstractions — prefer simple, readable code over clever patterns
- When adding a new pipeline stage (audio → transcribe → summarize → save), keep each stage in its own module with a clear interface
- Do not add features beyond the current sprint scope without explicit instruction
- If the chosen LLM for summarization is Claude/Anthropic, use the `@anthropic-ai/sdk` (Node) or `anthropic` (Python) SDK — refer to official docs for current API usage
- Update this `CLAUDE.md` whenever significant architectural decisions are made or new tooling is introduced

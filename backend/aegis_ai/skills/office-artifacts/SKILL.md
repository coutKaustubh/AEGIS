---
name: office-artifacts
description: Guidelines for generating high-quality official office artifacts, reports, briefing documents, and markdown notes.
version: 1.0.0
category: documentation
---

# Office Artifacts Skill

This skill governs the generation of executive briefings, technical documentation, compliance reports, and structured office artifacts.

## 1. Document Structure & Formatting
- Official documents created in AEGIS must follow clean GitHub-flavored markdown standards:
  - Header: `# <Document Title>` followed by document metadata (Author: AEGIS Workbench, Date, Classification: OFFICIAL-SENSITIVE / UNRESTRICTED).
  - Executive Summary: Concise 1-2 paragraph overview of objectives, findings, and recommendations.
  - Core Sections: 2 to 5 well-structured sections using `##` and `###` headers.
  - Data Tables: Format structured comparisons and metrics in standard markdown tables.
  - Action Items / Next Steps: Clear, numbered lists with owners and verification criteria.

## 2. Generating Documents
- Use `create_file` to write documents to `docs/` or `artifacts/`:
  `{"action": "tool", "tool": "create_file", "arguments": {"path": "docs/EXECUTIVE_SUMMARY.md", "content": "..."}}`
- When generating compliance or audit notes:
  - Include SHA-256 integrity hashes for referenced source files.
  - Ensure zero hallucination: every stated finding must reference observed tool output or verified repository facts.

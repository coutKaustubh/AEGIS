---
name: document-intelligence
description: Work with unstructured documents, PDFs, metadata extraction, OCR, and structured analytical reporting.
version: 1.0.0
category: intelligence
---

# Document Intelligence Skill

This skill guides specialist agents through parsing, OCR extraction, metadata inspection, and semantic synthesis of local documents without external API dependencies.

## 1. Document Discovery & Inspection
- To survey available workspace documents:
  - Call `list_documents` with `{"path": "."}` or `list_directory`.
  - To inspect metadata, page counts, author, and MIME type:
    Call `inspect_document_metadata` with `{"path": "<doc_path>"}`.
- For images and scanned files:
  - Call `analyze_image` or `compare_images` from the vision toolset.

## 2. Text Extraction & OCR
- To extract raw or OCR text:
  - Use `extract_document_text` with `{"path": "<doc_path>"}`.
  - For targeted research across multiple documents:
    Call `search_documents` with `{"query": "<keyword>", "path": "."}`.
  - To read a specific chapter or bounded section:
    Call `read_document_section` with `{"path": "<doc_path>", "section": "<section_name_or_number>"}`.

## 3. Analysis & Structured Reporting
- Synthesize findings into clear, deterministic reports.
- Include:
  - Document Title & Source Path
  - Executive Summary
  - Extracted Key Metrics & Data Points
  - Verbatim Supporting Quotes/Snippets (citing page/section)
  - Potential Discrepancies or Verification Warnings
- Never hallucinate unobserved data, dates, financial amounts, or legal clauses.

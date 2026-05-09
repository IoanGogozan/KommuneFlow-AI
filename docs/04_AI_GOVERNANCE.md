# AI Governance

## Purpose Of This Document

This document defines how AI is used, what AI is allowed to do, what it must never do, prompt versioning, human review, structured output, and auditability.

## AI Purpose

AI is used to assist municipal employees with triage. It must help classify, summarize, detect missing information, and suggest routing.

AI must not make final administrative decisions.

## Allowed AI Actions

AI may:

- suggest a case category
- suggest a department
- suggest urgency
- summarize the citizen request
- summarize extracted document text
- identify missing information
- produce a short explanation for its suggestion

## Forbidden AI Actions

AI must not:

- close a case automatically
- reject a case automatically
- send official replies to citizens without human review
- change assigned department without human approval
- make legal or administrative decisions
- store chain-of-thought
- process unnecessary personal data

## Human-In-The-Loop Requirement

Every AI triage result must be reviewed by a human case worker before it becomes the official classification.

The UI must clearly show:

- AI suggested category
- AI suggested department
- AI suggested urgency
- AI summary
- confidence score
- missing information
- short explanation

The case worker must be able to:

- accept AI suggestion
- correct category
- correct department
- correct urgency
- add review comment

## Prompt Versioning

Every AI request must record:

- model name
- prompt version
- timestamp
- input type
- output JSON

Prompt templates must be stored in code or database with explicit version names such as:

- `case_triage_v1`
- `document_summary_v1`

## Structured Output

AI responses must be parsed as structured JSON.

Required schema:

```json
{
  "category": "building_case",
  "suggestedDepartmentSlug": "technical_department",
  "urgency": "normal",
  "summary": "Short summary for the case worker.",
  "missingInformation": ["property number"],
  "confidence": 0.82,
  "reasoningSummary": "The request mentions renovation and property details."
}
```

## AI Safety Rules

- Validate AI output with Zod before saving.
- Treat AI output as untrusted input.
- Do not render AI output as raw HTML.
- Do not allow AI output to bypass permissions.
- Do not send entire documents to AI unless necessary.
- Redact or minimize personal data where reasonable.
- Store failures clearly and safely.

## AI Testing Requirements

Tests must use a mock AI provider.

Required tests:

- valid AI response is parsed correctly
- invalid AI response is rejected
- AI provider failure does not crash case creation
- AI suggestion does not change official case fields before human review
- human review creates audit event

---
name: UtilityCodes browser-only scope
description: The product's non-negotiable privacy and processing boundary.
---

**Rule:** Keep UtilityCodes code generation, uploaded-file handling, batch exports, and OCR entirely in the user's browser. Do not add login, a database, or server-side processing for these workflows.

**Why:** The user explicitly requires a zero-login, browser-only utility suite with no server-side database.

**How to apply:** New features should operate locally and should not transmit code contents or user files to a backend or third-party service.

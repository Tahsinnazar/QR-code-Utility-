# UtilityCodes

A browser-only toolkit for creating QR codes, barcodes, batch ZIP exports, printable labels, and extracting text from images.

## Run & Operate

- `pnpm --filter @workspace/utility-codes... install --frozen-lockfile` — install the app's dependencies without installing unused workspace services.
- Start the managed workflow `artifacts/utility-codes: web` for the root (`/`) preview. It runs `pnpm --filter @workspace/utility-codes run dev` and supplies `PORT` and `BASE_PATH`.
- `pnpm --filter @workspace/utility-codes run typecheck` — check the app's TypeScript.
- `PORT=18908 BASE_PATH=/ pnpm --filter @workspace/utility-codes run build` — build the app into `artifacts/utility-codes/dist/public`.
- No secrets, database, login, or API server are required for UtilityCodes.
- The imported API server and component-preview workspace are not needed to run the app. Leave their workflows stopped unless working on those services.
- A full workspace install encountered a registry block for the unused API server's `proxy-addr@2.0.7` dependency. The filtered app install above succeeds without bypassing the block.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- App: React 19, Vite 7, Tailwind CSS, Wouter
- Local processing: qr-code-styling, JsBarcode, JSZip, file-saver, Tesseract.js
- The imported workspace also includes an Express API scaffold and shared libraries; these are not required by the browser tools.

## Where things live

- `artifacts/utility-codes/src/App.tsx` — tools, browser-side generation, guide pages, and routing.
- `artifacts/utility-codes/src/index.css` — app styles.
- `artifacts/utility-codes/vite.config.ts` — proxy-compatible host, base path, and build configuration.
- `artifacts/utility-codes/public/` — favicon and search-engine files.

## Architecture decisions

- Code generation, uploaded-file handling, batch exports, and OCR must remain on the user's device. Do not introduce login, a database, or server-side processing for these workflows.

## Product

Create customizable QR codes and barcodes, export batches as ZIP files, prepare label sheets, and recognize text locally from images or camera captures.

## Gotchas

- Use the managed workflow rather than invoking Vite without environment variables: the Vite configuration requires both `PORT` and `BASE_PATH`.
- OCR runs locally, but Tesseract may download its worker and English language assets on first use. Camera access requires browser permission.
- The production build currently reports non-fatal large-bundle and tooltip sourcemap warnings.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

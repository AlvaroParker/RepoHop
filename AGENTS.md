# RepoHop project guidance

## Scope and architecture

Keep the extension limited to opening selected `owner/repo` text on GitHub.
Preserve the single context-menu item; add no settings, popup, extra hosts,
input formats, network existence checks, or runtime dependencies.

`src/selection.ts` is pure validation and fixed-origin URL construction.
`src/menu.ts` integrates native Firefox APIs; `src/background.ts` registers its
listeners synchronously. Firefox MV3 uses `background.scripts`; menus persist
across event-page restarts. Create them only on installation/update. Preserve
serialized updates, obsolete-work checks, hiding on close, and click-time
validation. Report browser API failures through the background console.

## Tooling and dependencies

Use the Node version in `.node-version`, npm, and the committed lockfile.
Run `npm ci` to install. Keep new code and supported tool configurations in
TypeScript. ESLint's TypeScript config needs the pinned jiti dependency;
Prettier and build/test scripts use Node's native type stripping. Include every
TypeScript config/script in type, lint, and format checks. Keep the browser-only
type check free of Node globals.

When changing dependencies or permissions, consult the decisions and linked
primary sources in `README.md`. Verify current compatibility, pin direct
versions, and update the lockfile. TypeScript's latest release may be newer
than typescript-eslint supports. Recheck the documented web-ext advisory.
Use web-ext's CLI through package scripts; it has no documented TypeScript
configuration format. Keep manifest and package versions consistent.

## Validation and commits

Run relevant tests before each small Conventional Commit (`feat:`, `fix:`,
`chore:`, `ci:`, or `docs:`). Stage only task changes and preserve unrelated work.
Use the native patch tool for manual edits.

Before handoff, run `npm run check` and `npm run package`. Inspect the ZIP: it
must contain only `manifest.json` and `background.js` at its root. The package
command validates both `dist/` and the ZIP with warnings treated as failures.
For menu changes, exercise valid/invalid selections, updates, close/reopen,
background restart, click URLs, and rejected API calls. Follow README's browser
checklist when possible and distinguish mocks, automated browser checks, and
manual Firefox/Zen testing in the handoff. The artifact is unsigned; signing
and permanent installation are separate from temporary loading.

Keep CI as one job using package scripts, minimum permissions, and verified
full action commit pins. Pushes, signing, and publishing require a user request.

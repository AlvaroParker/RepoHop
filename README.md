# RepoHop

RepoHop adds one context-menu action to Firefox and Zen Browser. Select
`AlvaroParker/RepoHop`, right-click, and choose
**Open github.com/AlvaroParker/RepoHop**. It opens
`https://github.com/AlvaroParker/RepoHop` in a new tab.

Surrounding whitespace is trimmed. The menu is hidden for invalid selections.
RepoHop accepts a single `owner/repo`: owners have 1–39 ASCII letters, digits,
or single internal hyphens; repository names have 1–100 ASCII letters, digits,
hyphens, underscores, or periods, excluding `.` and `..`. Full URLs, extra path
segments, query strings, and fragments are rejected. Validation is local; the
extension never checks whether a repository exists. A valid name can still lead
to GitHub's unavailable-repository page.

There is no popup, settings page, analytics, or stored history. GitHub receives
the normal page request only when you choose the menu item.

## Development

Use Node.js **24.21.0 LTS** from `.node-version` and its bundled npm **11.19.0**.
CI reads that same version file. Select this version with your Node version
manager, then run:

```sh
npm ci
npm run check
npm run package
```

| Command                    | Purpose                                                                |
| -------------------------- | ---------------------------------------------------------------------- |
| `npm run format`           | Format source, tests, configuration, and documentation                 |
| `npm run format:check`     | Check formatting without editing files                                 |
| `npm run lint`             | Run ESLint, including type-aware TypeScript rules                      |
| `npm run typecheck`        | Check all TypeScript, plus the browser code without Node globals       |
| `npm test`                 | Run parser and browser-integration tests with Node's test runner       |
| `npm run check`            | Run formatting, lint, types, and tests                                 |
| `npm run build`            | Clean `dist/`, bundle the background script, and copy the manifest     |
| `npm run validate`         | Validate an existing `dist/` using `web-ext`; warnings fail            |
| `npm run package`          | Build, validate, create `artifacts/repohop.zip`, and validate that ZIP |
| `npm run validate:package` | Validate an existing `artifacts/repohop.zip`                           |
| `npm start`                | Build and temporarily load the extension in a separate Firefox profile |

Tests use lightweight browser API mocks to exercise menu creation, visibility,
changing labels, delayed updates, closing/reopening menus, event-page restarts,
click URLs, and API failures. They do not replace testing the browser's native
context menu.

## Try it in Firefox or Zen

Use desktop Firefox 142 or later, or a current Zen release based on Firefox 142
or later. [Zen supports Firefox extensions](https://docs.zen-browser.app/user-manual/extensions).

1. Run `npm ci` and `npm run build`.
2. Open `about:debugging#/runtime/this-firefox` in Firefox or Zen.
3. Choose **Load Temporary Add-on…** and select `dist/manifest.json`.
4. Grant RepoHop access to the sites where you want it to work. If site access
   is disabled in the extension's permissions, Firefox withholds the selection
   and the item stays hidden.
5. On an ordinary webpage, select `AlvaroParker/RepoHop`, open the context menu,
   and check the exact title and the new tab's URL after clicking.
6. Try another repository, surrounding whitespace, `owner/repo/issues`,
   `owner/..`, and a full URL. Valid selections should update the same item;
   invalid selections should show no RepoHop item. Close/reopen the menu and
   repeat to check for stale labels or duplicate items.

Browser-internal pages such as `about:addons` and protected Mozilla pages can
restrict extensions. Use an ordinary webpage for these checks. Private windows
also require explicitly allowing the extension in private browsing.

For an isolated temporary profile, use `npm start` for Firefox. To launch Zen
through the same tooling:

```sh
npm start -- --firefox /absolute/path/to/zen
```

After editing TypeScript, run `npm run build`. `web-ext run` reloads when the
generated files change; when loading through `about:debugging`, press **Reload**
on RepoHop's entry. Use **Inspect** on that entry to view background errors.

Temporary loading ends when the browser restarts. See Mozilla's
[temporary installation guide](https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/).

## Packaging and installation

```sh
npm run check
npm run package
unzip -l artifacts/repohop.zip
```

The archive contains only `manifest.json` and the bundled `background.js` at
its root. It includes no dependencies, tests, source maps, or development files.
CI runs the same checks on pushes and pull requests and uploads the unsigned
ZIP as the `repohop-unsigned` workflow artifact. No secrets are needed.

**This ZIP is unsigned.** Temporary loading is suitable for development;
ordinary permanent installation in Firefox release/beta requires Mozilla
signing. Submit the ZIP through the AMO Developer Hub for a public listing or
unlisted signing, then distribute the signed extension. Zen users can install
Firefox extensions from AMO. Renaming the unsigned ZIP to `.xpi` does not sign
it. See Mozilla's [signing and distribution guide](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/).

## Implementation and tooling decisions

- `src/selection.ts` owns parsing and constructs a URL with a fixed HTTPS GitHub
  origin. `src/menu.ts` owns the menu lifecycle; `src/background.ts` registers it
  synchronously. Menu changes are serialized and obsolete updates skipped;
  closing the menu clears its label and visibility. Clicks validate their own
  selection again.
- Firefox MV3 uses a non-persistent **event page** through `background.scripts`.
  Menu items survive background suspension, so creation runs on installation or
  update, while listeners register on every load. See MDN's
  [background guidance](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Background_scripts).
- The only API permission is `menus`. The `<all_urls>` host permission is
  necessary to read selection text in
  [`menus.onShown`](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/menus/onShown)
  before a click, across websites and local files. `activeTab` alone does not
  provide that initial access. No `tabs`, content-script, or storage permission
  is needed. RepoHop reads only the menu event's selection. Its
  [CSP](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/content_security_policy)
  allows bundled scripts and blocks extension network connections. The manifest
  declares no data collection; the Firefox 142 baseline also satisfies current
  validator compatibility checks for that declaration.
- [esbuild](https://esbuild.github.io/content-types/#typescript) bundles without
  type-checking, so `tsc --noEmit` is a separate gate. Strict TypeScript also uses
  checked indexed access and exact optional properties. Node's native
  [type stripping](https://nodejs.org/docs/latest-v24.x/api/typescript.html) runs
  `scripts/build.ts` and the tests, with explicit `.ts` imports and erasable syntax.
- `eslint.config.ts` uses flat config and the documented **jiti** loader.
  Nicholas C. Zakas's [flat-config rationale](https://eslint.org/blog/2022/08/new-config-system-part-2/)
  informed the single-config approach; its older JavaScript examples were
  checked against the current [TypeScript configuration instructions](https://eslint.org/docs/latest/use/configure/configuration-files#typescript-configuration-files).
  `prettier.config.ts` loads natively on the pinned Node version; see
  [Prettier's requirements](https://prettier.io/docs/configuration#typescript-configuration-files).
  `eslint-config-prettier` disables conflicting formatting rules. Both configs
  and the build script are type-checked, linted, and formatted.
- Dependencies are pinned exactly in `package.json` and `package-lock.json`.
  TypeScript 6.0.3 is intentional: typescript-eslint 8.71.0 supports `<6.1.0`,
  so TypeScript 7 is outside its [supported range](https://typescript-eslint.io/users/dependency-versions/).
  Node 24 is a [supported LTS line](https://nodejs.org/en/about/previous-releases).
  `web-ext` options live in npm scripts because its documented config formats
  do not include TypeScript. No custom config loader is needed. See its
  [command reference](https://extensionworkshop.com/documentation/develop/web-ext-command-reference/).
- CI uses read-only repository permissions and full commit pins verified
  against the official action release tags, following GitHub's
  [workflow security guidance](https://docs.github.com/en/actions/reference/security/secure-use).

Dependency audit on 2026-10-04: `npm audit` reports three high-severity entries
from one unpatched [node-forge advisory](https://github.com/advisories/GHSA-86w9-cpqp-85rv)
through `web-ext` → `@devicefarmer/adbkit`. These are development dependencies
and are absent from the ZIP. There is no patched node-forge release at this
check; recheck upstream when updating tooling instead of applying npm's suggested
downgrade to obsolete web-ext 5.1.0.

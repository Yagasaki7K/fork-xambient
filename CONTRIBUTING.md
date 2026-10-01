# Contributing

Use Node.js 22 or newer. No npm dependency installation is required. The extension can be loaded directly from the repository root.

## Before sending a change

```sh
npm run check
npm test
npm run demo
```

Check the behavior affected by your change in the demo and, when changing X selectors, on X with the unpacked extension. Useful cases include both themes, portrait video, multiple photos, narrow windows, scrolling, new posts, and switching settings on and off. Include your validation in the pull request.

For bug reports, include your Chrome version, OS, reproduction steps, and affected settings. Screenshots are helpful; remove personal information before sharing them. Saved authenticated pages and browser profiles belong in local test output, rather than in the repository.

## Code layout

| Path | Purpose |
| --- | --- |
| `src/content.js` | X media detection, hover handling, frame updates, and masking |
| `src/ambient-core.js` | Media geometry and edge projection |
| `src/card-layout.js` | Optional responsive timeline width |
| `src/i18n.js` | Bundled translation loading and language selection |
| `_locales/` | English, Spanish, and Japanese message catalogs |
| `src/streaming.js` | Twitch/Kick routing and visible player selection |
| `src/settings.js` | Defaults and stored setting normalization |
| `src/popup.*` | Extension settings UI |
| `demo/` | Local demo and original media assets |
| `tests/` | Geometry and settings regression checks |
| `scripts/` | Local demo server and distribution packaging |

## Release process

1. Update the version in `manifest.json`, `package.json`, and the demo footer.
2. Add the release entry to `CHANGELOG.md`.
3. Run `npm run check`, `npm test`, and `npm run package`. Packaging uses built-in Node.js modules.
4. Commit the change and push `main`.
5. Create and push a tag matching the manifest version, for example:

   ```sh
   git tag v0.2.2
   git push origin v0.2.2
   ```

The Release workflow validates the tag, reruns checks, builds `x-ambient.zip`, and publishes it with installation instructions and generated release notes. The archive uses an explicit file list and is rebuilt from scratch. `output/`, browser recordings, local profiles, and saved X pages are excluded from Git.

## Localization and streaming checks

Keep the same message keys in all three `_locales/*/messages.json` files. Translate text, tooltips, accessible labels, status messages, and newly added demo posts. Use `textContent` rather than translated HTML. Check both English and Spanish in the popup and demo, plus automatic regional locales such as `es-AR`.

Open `tests/fixtures/stream.html?site=twitch` and `?site=kick` through the demo server to test automatic selection, pause/resume, player replacement, resizing, visibility, and click-through controls. These fixtures use local media and a site-routing stub. Verify the installed extension on the actual sites before claiming live-site validation. Cross-origin embedded frames are outside the current support scope.

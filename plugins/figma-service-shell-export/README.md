# AI Fashion Forum Service Shell Export

This local Figma plugin creates a set of frames that mirror the current service shell:

- Home
- Discover
- Detail
- Saved
- Admin

## How to use

1. Open Figma Desktop in Dev Mode.
2. Import the plugin from this folder using the `manifest.json` at the plugin root.
3. Run the plugin on any Figma page.
4. The plugin creates three pages:
   - `Components` for reusable UI parts
   - `Service Shell` for user-facing screens
   - `Admin Shell` for admin-only screens

## Files

- `manifest.json` is the Figma plugin manifest.
- `code.js` contains the plugin implementation.
- `.codex-plugin/plugin.json` is the Codex plugin metadata scaffold.

## Notes

- The plugin uses the Plugin API path because Figma REST APIs are not enough to edit design layers directly.
- The generated frames intentionally use user-facing copy only.

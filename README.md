# RAILWISE Desktop

Native RAILWISE desktop app, built with Tauri v2. Standalone shell split from [RAILWISE-CLI](https://github.com/railwise-cn/RAILWISE-CLI): shared packages (`@railwise/app`, `@railwise/ui`, `@railwise/util`) come from npm, and the CLI sidecar binary is pinned via `.cli-version` and downloaded from RAILWISE-CLI releases.

> **Status:** CI stays red until `@railwise/{app,ui,util}` are published to npm from RAILWISE-CLI (`bun run publish:shared -- --publish`).

## Development

```bash
bun install
bun run tauri dev
```

`predev` runs `scripts/prepare.ts`, which downloads the CLI sidecar matching `.cli-version` from RAILWISE-CLI GitHub releases. Override with `RAILWISE_CLI_VERSION=<version>`, or set `GITHUB_RUN_ID` to pull a sidecar from a specific CI run instead.

Web-only dev server (no native shell):

```bash
bun run dev
```

## Build

```bash
bun run tauri build
```

## Release

Push a `desktop/v*` tag (or trigger `workflow_dispatch` with a version) to run `.github/workflows/desktop-release.yml`, which builds Windows/macOS/Linux bundles. Requires `TAURI_SIGNING_PRIVATE_KEY` / `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` repo secrets.

## Bumping the CLI sidecar

1. Edit `.cli-version` to the new RAILWISE-CLI release version.
2. Bump `@railwise/*` deps in `package.json` if the shared packages also moved.
3. `bun install && bun run tauri dev` to verify.

## Prerequisites

Requires the Rust toolchain and platform-specific Tauri dependencies. See the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/).

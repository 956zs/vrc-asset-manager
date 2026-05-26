# VRC Asset Manager

Windows desktop app for indexing VRChat modding assets by compatible models and tags.

## Stack

- React + TypeScript + Tailwind CSS
- Demo UI ported from `web-demo/v0-vrc-asset-manager`
- Tauri v2
- Rust commands
- SQLite via `rusqlite`
- Zustand state store

## Features

- Asset CRUD with local file or folder path, Booth URL, thumbnail URL, note, model links, and tag links.
- Many-to-many model and tag relations.
- AND filtering for selected models and tags.
- Booth OG image fetch through Rust `reqwest` + HTML meta parsing.
- File path validation badge on cards.
- Open Booth URL and open the asset folder from the detail panel.
- Demo-matched dark UI tokens and shadcn-style components.

## Development

```bash
npm install
npm run tauri dev
```

The SQLite database is created automatically in the app data directory as
`vrc_asset_manager.sqlite3`.

## Verification

```bash
npm run build
cd src-tauri
cargo check
```

For a production executable without bundling installers:

```bash
npm run tauri build -- --no-bundle
```

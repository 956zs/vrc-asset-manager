# GitHub Releases Updater

Repo: `https://github.com/956zs/vrc-asset-manager`

This project is prepared to publish Windows builds through GitHub Releases. The
workflow creates a draft release first, so builds are not public until manual
smoke checks pass.

## Current Status

Done:

- `tauri add updater` has added updater dependencies and permissions.
- `src-tauri/tauri.conf.json` has the updater public key and GitHub Releases
  endpoint configured.
- `.github/workflows/release.yml` builds a draft GitHub Release.
- `.gitignore` blocks `.env`, signing keys, SQLite databases, build output, and
  release artifacts.
- `src-tauri/tauri.conf.updater.example.json` shows the updater config shape.
- GitHub repository secrets are configured for updater signing.

Not done yet:

- In-app update UI/checks should wait until releases are public. Do not embed a
  GitHub token in the app.

## Next Steps

1. Decide whether public metadata is okay:

   - `src-tauri/Cargo.toml`: `authors = ["n1cat"]`
   - `src-tauri/tauri.conf.json`: `com.n1cat.vrcassetmanager`

2. Make sure the Tauri updater private key is stored in GitHub repository
   secrets:

   - `TAURI_SIGNING_PRIVATE_KEY`
   - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

3. Commit and push to the private repo.

4. Run the release workflow with a beta tag, for example `v0.1.0-beta.1`.

5. Download the draft release build and smoke test:

   - App launches.
   - Asset add/edit/delete works.
   - Save export/import works.
   - VCC scan still works.
   - Missing asset warnings still show.

6. When ready for users, make the repo/release public and publish a stable tag
   such as `v0.1.0`.

## How Updates Work

The app checks:

```text
https://github.com/956zs/vrc-asset-manager/releases/latest/download/latest.json
```

`latest.json` points to the installer and its signature. The app verifies the
signature using the public key embedded in `tauri.conf.json`. GitHub Actions
signs release artifacts using the private key stored in GitHub Secrets.

The private key must never be committed. Keep an offline backup; losing it means
installed apps cannot trust future updater builds from a new key without a
migration plan.

## Release Rules

- Stable tag: `v0.1.0`
- Beta tag: `v0.1.0-beta.1`
- RC tag: `v0.1.0-rc.1`

Keep beta and RC builds as GitHub prereleases. Normal users should only receive
stable releases through GitHub's latest release endpoint.

## Local Draft Release

For faster beta builds, create the release from this machine instead of waiting
for a fresh GitHub-hosted Windows runner.

1. Update all release versions:

```powershell
npm run version:bump -- 0.1.0-beta.7
```

2. Enable the local tag guard once per clone:

```powershell
npm run hooks:install
```

This installs a repo-local `pre-push` hook. When you push a `v*` tag, it blocks
the push if the tag does not match the app versions.

3. Commit the version bump.

4. Optional fast guard before building:

```powershell
npm run release:check -- -Tag v0.1.0-beta.7
```

This check also runs automatically in `release:local` and in GitHub Actions
before the expensive Windows build starts.

5. Run:

```powershell
npm run release:local -- -Tag v0.1.0-beta.7
```

The script checks that versions match the tag, creates and pushes the tag if it
does not exist, builds the NSIS installer locally, writes `latest.json`, and
uploads the installer, `.sig`, and `latest.json` to a draft GitHub Release.

The default signing key path is:

```powershell
$env:USERPROFILE\.tauri\vrc-asset-manager.key
```

`release:local` reads this file and sets `TAURI_SIGNING_PRIVATE_KEY` only for
the current build process. You do not need to store the private key as a
persistent system environment variable on your own machine.

If the signing key has a password, set it before running the script:

```powershell
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "your key password"
```

If a draft release already exists and you want to replace its assets:

```powershell
npm run release:local -- -Tag v0.1.0-beta.7 -Clobber
```

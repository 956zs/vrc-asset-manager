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
- The settings UI can call `check()`, download with progress through
  `downloadAndInstall(...)`, mark an update as installed, and relaunch the app
  with Tauri's process plugin.
- `.github/workflows/release.yml` builds a draft GitHub Release.
- `.gitignore` blocks `.env`, signing keys, SQLite databases, build output, and
  release artifacts.
- `src-tauri/tauri.conf.updater.example.json` shows the updater config shape.
- GitHub repository secrets are configured for updater signing.
- `scripts/check-release-version.ps1 -Artifacts` validates the installer,
  `.sig`, and `latest.json` before local release assets are uploaded.

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

For the current Windows release, the GitHub Release must include these assets:

- `VRC Asset Manager_<version>_x64-setup.exe`
- `VRC Asset Manager_<version>_x64-setup.exe.sig`
- `latest.json`

GitHub displays these uploaded assets with dots instead of spaces, for example
`VRC.Asset.Manager_0.2.0-beta.4_x64-setup.exe`. `latest.json` must use the
actual release asset URL.

The static Tauri updater JSON must include:

- `version`: the released semver without the leading `v`
- `notes`: release notes shown in the app when an update is available
- `pub_date`: UTC publish timestamp
- `platforms.windows-x86_64.url`: the GitHub Release download URL for the
  installer
- `platforms.windows-x86_64.signature`: the exact text content of the matching
  `.sig` file

The private key must never be committed. Keep an offline backup; losing it means
installed apps cannot trust future updater builds from a new key without a
migration plan.

## Release Rules

- Stable tag: `v0.1.0`
- Beta tag: `v0.1.0-beta.1`
- RC tag: `v0.1.0-rc.1`

Keep beta and RC builds as GitHub prereleases. Normal users should only receive
stable releases through GitHub's latest release endpoint.

Important channel behavior:

- `https://github.com/956zs/vrc-asset-manager/releases/latest/download/latest.json`
  follows GitHub's latest non-draft, non-prerelease release. It is the stable
  channel.
- Draft releases are never visible to the in-app updater.
- Prerelease beta / RC tags are not served by the stable latest endpoint, so
  installed beta apps using the current config will only auto-update once a
  newer stable release is published.
- If beta users should receive beta-to-beta in-app updates, ship beta builds
  with a separate endpoint such as a GitHub Pages/raw `latest-beta.json` or a
  maintained beta-channel release asset. Do not rely on `/releases/latest` for
  beta updates.

## Local Draft Release

For faster beta builds, create the release from this machine instead of waiting
for a fresh GitHub-hosted Windows runner.

1. Update all release versions:

```powershell
npm run version:bump -- 0.2.0-beta.4
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
npm run release:check -- -Tag v0.2.0-beta.4
```

This check also runs automatically in `release:local` and in GitHub Actions
before the expensive Windows build starts.

5. Run:

```powershell
npm run release:local -- -Tag v0.2.0-beta.4
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
npm run release:local -- -Tag v0.2.0-beta.4 -Clobber
```

## Artifact Validation

After a local build has produced NSIS updater artifacts, run:

```powershell
npm run release:check -- -Tag v0.2.0-beta.4 -Artifacts
```

The checker fails when:

- the NSIS setup executable is missing or empty
- the matching `.sig` is missing or empty
- `latest.json` is missing `platforms.windows-x86_64`
- the `latest.json` version does not match the tag
- the `latest.json` signature differs from the `.sig` file content
- the `latest.json` URL does not point at the expected GitHub Release asset

`release:local` runs this check automatically before uploading assets.

## Old-Version Update Test

Use this before publishing a stable release:

1. Install the previous public version, for example `v0.2.0-beta.3`.
2. Confirm the app's settings screen shows the old version.
3. Publish or temporarily expose the new release metadata endpoint.
4. In the app, open Settings -> Updates and click check update.
5. Confirm the app shows the new version and release notes from `latest.json`.
6. Click download/install and confirm progress advances.
7. When the installed state appears, click `立即重啟`.
8. After restart, confirm the app version changed and existing local data still
   loads.
9. Confirm checking again reports the app is current.

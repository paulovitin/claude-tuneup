# Releasing

This repo ships as a Claude Code skill and is versioned with
[Semantic Versioning](https://semver.org). Releases are driven by git tags and a
[Keep a Changelog](https://keepachangelog.com)-style `CHANGELOG.md`.

## Versioning rules

`MAJOR.MINOR.PATCH`:

- **MAJOR** — incompatible change to how the skill is invoked or to the helper
  script contracts.
- **MINOR** — new capability, or (while on `0.x`) a behavior change such as the
  backup location.
- **PATCH** — backward-compatible bug fix.

While on `0.x` the API is not frozen: a minor bump may include behavior changes.

## How to cut a release

1. **Land the work.** Merge the PRs going into the release.
2. **Update the changelog.** Move entries from `## [Unreleased]` into a new
   `## [X.Y.Z] - YYYY-MM-DD` section, and add the `compare` / release link
   references at the bottom. Keep an empty `[Unreleased]` on top.
3. **Bump `package.json`** `version` to `X.Y.Z`.
4. **Commit** on `main` (via PR): `chore(release): vX.Y.Z`.
5. **Tag and push:**

   ```bash
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```

6. The **`release` workflow** (`.github/workflows/release.yml`) fires on the
   `vX.Y.Z` tag: it runs the tests, extracts the matching `CHANGELOG.md` section
   via `tools/changelog-section.mjs`, and publishes a GitHub Release
   with those notes.

## Notes

- Tag format is enforced by the workflow filter (`v[0-9]+.[0-9]+.[0-9]+`,
  plus a `-pre` suffix variant). A tag that doesn't match won't trigger a release.
- `--verify-tag` ensures the tag exists on the remote before the release is made.
- To preview the notes for a version locally:

  ```bash
  node tools/changelog-section.mjs X.Y.Z
  ```

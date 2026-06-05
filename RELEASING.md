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

Releases are **merge-driven** — there is no manual `git tag` step. You ship a
release by bumping the version on `main`; the workflow does the rest.

1. **Land the work.** Merge the feature/fix PRs going into the release.
2. **Open a release PR** that does two things:
   - **Changelog:** move entries from `## [Unreleased]` into a new
     `## [X.Y.Z] - YYYY-MM-DD` section, refresh the `compare` / release link
     references at the bottom, and leave an empty `[Unreleased]` on top.
   - **`package.json`:** bump `version` to `X.Y.Z`.

   Commit it as `chore(release): X.Y.Z`.
3. **Merge the release PR.** That's it.

On the push to `main`, the **`release` workflow** (`.github/workflows/release.yml`)
reads `package.json`'s version. If no `vX.Y.Z` tag exists yet, it runs the tests,
extracts the matching `CHANGELOG.md` section via `tools/changelog-section.mjs`,
creates and pushes the tag, and publishes the GitHub Release with those notes.
If the version already has a tag (an ordinary merge), it does nothing.

## Notes

- A version bumped without a matching `## [X.Y.Z]` changelog section fails the
  release loudly (the notes step exits non-zero) — keep them in lockstep.
- Pushing the tag from the workflow does **not** re-trigger it (it only listens on
  `push: branches: [main]`), so there's no release loop.
- To preview the notes for a version locally:

  ```bash
  node tools/changelog-section.mjs X.Y.Z
  ```

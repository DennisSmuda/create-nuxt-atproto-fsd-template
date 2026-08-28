# create-nuxt-atproto

A [Bingo](https://create.bingo) template — the same engine `vp create`
(vite-plus) runs on — that scaffolds:

- A fresh Nuxt 4 app with `oxlint` + `oxfmt` + Vitest + Playwright + CI wired up
- AT Protocol (Bluesky) sign-in, server-side, ticket-handoff pattern and all
  (`server/domain/user`, `server/api/atproto/`, `docs/atproto.md`) — extracted
  from [teilweise](https://github.com/DennisSmuda/teilweise)
- A Feature-Sliced Design skeleton (`docs/architecture.md`), with the `user`
  slice as a working example and everything else left empty for your domain

## Usage

No npm publish needed — run it straight from this repo:

```bash
npx bingo github:DennisSmuda/create-nuxt-atproto-fsd-template --directory my-new-app
```

You'll be prompted for:

- `owner` — GitHub owner/org (used for the repo, not required to actually push)
- `repository` — repo/package name
- `title` — display name (defaults to `repository`)

Note: `vp create <url>` won't work here — it uses degit to raw-copy the repo
instead of running `template.js` through Bingo.

## Developing this template

```bash
npm install
npx bingo template.js --directory /tmp/generated-app --owner you --repository test-app
```

Then `cd /tmp/generated-app && pnpm install && pnpm dev` to smoke-test the
output.

### How it's built

`template.js` uses [`intake()`](https://www.create.bingo/build/packages/bingo-fs)
to read `template/` as-is, and [`handlebarsFile()`](https://www.create.bingo/engines/handlebars/handlebars)
for the handful of files that carry `{{ }}` placeholders
(`package.json.hbs`, `README.md.hbs`, `nuxt.config.ts.hbs`, `app/app.vue.hbs`,
`server/utils/atproto.ts.hbs`). Everything else is copied byte-for-byte —
deliberately, since Vue SFCs use `{{ }}` for their own interpolation and
GitHub Actions expressions use `${{ }}`, both of which would collide with
Handlebars if the whole tree were run through it.

## Updating from teilweise

This is a snapshot, not a live link. When teilweise's auth code or lint/test
config changes in a way worth carrying forward, re-copy the relevant files
under `template/` by hand.

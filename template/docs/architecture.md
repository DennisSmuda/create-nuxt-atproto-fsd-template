# Architecture

Feature-Sliced Design. Layers depend downwards only:
`pages → widgets → features → entities → shared-ui`, and on the server
`api → domain → utils`. Slices on the same layer never import each other —
that need means the thing belongs one layer down.

```
app/                 Nuxt srcDir — the client
├─ pages/            the router. Route files mount a composition, nothing else
├─ widgets/          composed screens (empty — add as the app grows)
├─ features/         one user action per slice (user/sign-in-with-atproto,
│                    user/sign-out are the worked example)
├─ entities/         a domain noun: its read model and how one is displayed
├─ shared-ui/        presentational, domain-free
└─ middleware/

server/
├─ api/              transport only: auth, parse the body, call the domain, return
├─ domain/           the rules, one directory per slice, entered through index.ts
│                    (domain/user is the worked example: register, credentials,
│                    atproto account linking, the sign-in ticket handoff)
├─ plugins/          boot-time checks (config assertions)
├─ routes/           routes outside the /api convention (client-metadata.json)
└─ utils/            no domain rules — infra (prisma client, rate limiting, atproto client)

shared/              imported by both app/ and server/, isomorphic only
├─ api/              client-side fetch-error helpers
├─ entities/         validation and shaping rules both sides must agree on
└─ types/            ambient .d.ts augmentations (next-auth session shape)
```

## Why `entities/`, `features/` and `widgets/` are (mostly) empty

This template ships one full vertical slice — `user`, for auth — end to end
through every layer, as a working reference for the pattern. Everything else
is a skeleton: add your own domain nouns as `entities/<noun>`, the actions on
them as `features/<noun>/<verb>`, and the screens that compose them as
`widgets/`.

A slice only earns a `server/domain/` directory once it has rules worth unit
testing without spinning up Nitro — see `server/domain/user/*.spec.ts` and
`shared/entities/user/name.spec.ts` for the pattern: pure functions in,
`createError`s or plain values out.

## Rule of thumb

If two slices on the same layer need to talk to each other, the thing they
both need belongs one layer down. If a page needs more than mounting a
widget and wiring `definePageMeta`, the markup belongs in a widget instead.

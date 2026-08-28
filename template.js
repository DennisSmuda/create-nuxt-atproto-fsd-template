import { createTemplate } from 'bingo'
import { handlebars } from 'bingo-handlebars'
import { intake } from 'bingo-fs'
import path from 'node:path'
import { z } from 'zod'

const TEMPLATE_DIR = path.join(import.meta.dirname, 'template')

/**
 * Only these four files carry `{{ }}` placeholders (package name, app
 * title). Everything else is read in as-is via `intake()` — Vue SFCs use
 * `{{ }}` for their own interpolation and GitHub Actions' `${{ }}` would
 * otherwise collide with Handlebars, so the rest of the tree is never run
 * through the template engine.
 */
const HANDLEBARS_FILES = [
  'package.json',
  'README.md',
  'nuxt.config.ts',
  'app/app.vue',
  'server/utils/atproto.ts',
]

function setAtPath(tree, segments, value) {
  const [head, ...rest] = segments
  if (rest.length === 0) {
    return { ...tree, [head]: value }
  }
  return { ...tree, [head]: setAtPath(tree[head] ?? {}, rest, value) }
}

const template = createTemplate({
  about: {
    name: 'create-nuxt-atproto',
    description:
      'Nuxt 4 with lint/format/test/CI, AT Protocol (Bluesky) sign-in, and a Feature-Sliced Design skeleton.',
  },
  options: {
    owner: z.string().describe('GitHub owner/org the new repository belongs to'),
    repository: z.string().describe('Repository name — also becomes the package name'),
    title: z
      .string()
      .optional()
      .describe('Display name shown in the UI and OAuth client metadata'),
  },
  async produce({ options }) {
    const values = { ...options, title: options.title ?? options.repository }

    let files = await intake(TEMPLATE_DIR, { exclude: /\.hbs$/i })

    // npm never publishes files literally named `.gitignore`, so the template
    // stores it dotless and it's restored here.
    const { gitignore, ...rest } = files
    files = { ...rest, '.gitignore': gitignore }

    for (const relativePath of HANDLEBARS_FILES) {
      const rendered = await handlebars(
        path.join(TEMPLATE_DIR, `${relativePath}.hbs`),
        values,
      )
      files = setAtPath(files, relativePath.split('/'), rendered)
    }

    return { files }
  },
})

export default template
export const { createConfig } = template

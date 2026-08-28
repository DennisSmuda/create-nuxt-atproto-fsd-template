/** Public API of the `user` entity — import only from here, not the sibling files directly. */
export type { PublicUser } from './types'
export { publicUserSelect } from './types'

export { NAME_MAX_LENGTH, validateName } from './name'
export { displayName, accountLabel } from './label'

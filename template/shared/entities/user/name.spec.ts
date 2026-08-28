import { describe, expect, it } from 'vitest'
import { NAME_MAX_LENGTH, validateName } from './name'

describe('validateName', () => {
  it('accepts an ordinary name', () => {
    expect(validateName('Alice')).toBeNull()
  })

  it('refuses a name that is only whitespace', () => {
    expect(validateName('   ')).toBe('validation.nameRequired')
  })

  it('refuses an empty name', () => {
    expect(validateName('')).toBe('validation.nameRequired')
  })

  it('accepts a name exactly at the bound', () => {
    expect(validateName('a'.repeat(NAME_MAX_LENGTH))).toBeNull()
  })

  it('refuses one character more', () => {
    expect(validateName('a'.repeat(NAME_MAX_LENGTH + 1))).toBe('validation.nameTooLong')
  })

  it('measures the trimmed name', () => {
    expect(validateName(`  ${'a'.repeat(NAME_MAX_LENGTH)}  `)).toBeNull()
  })
})

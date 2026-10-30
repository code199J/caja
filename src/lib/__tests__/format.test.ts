import { describe, it, expect } from 'vitest'
import { parseAmount, sanitizeAmountInput, digits, groupVeAmount } from '../format'

describe('parseAmount', () => {
  it('convierte formato VE con coma decimal', () => {
    expect(parseAmount('1.250,50')).toBe(1250.5)
    expect(parseAmount('1250,50')).toBe(1250.5)
    expect(parseAmount('1000')).toBe(1000)
  })

  it('convierte formato US con punto decimal', () => {
    expect(parseAmount('1,250.50')).toBe(1250.5)
    expect(parseAmount('1250.50')).toBe(1250.5)
  })

  it('devuelve 0 para entrada vacía o inválida', () => {
    expect(parseAmount('')).toBe(0)
    expect(parseAmount('abc')).toBe(0)
  })

  it('maneja puntos de miles sin decimales', () => {
    expect(parseAmount('1.000')).toBe(1000)
    expect(parseAmount('10.000')).toBe(10000)
  })
})

describe('sanitizeAmountInput', () => {
  it('solo deja dígitos y una coma', () => {
    expect(sanitizeAmountInput('1.250,50')).toBe('1250,50')
    expect(sanitizeAmountInput('abc123,45xyz')).toBe('123,45')
    expect(sanitizeAmountInput('1,2,3')).toBe('1,23')
  })

  it('trunca a 2 decimales', () => {
    expect(sanitizeAmountInput('123,456')).toBe('123,45')
  })

  it('trunca a 16 caracteres', () => {
    const result = sanitizeAmountInput('1234567890123456,78')
    expect(result.length).toBeLessThanOrEqual(16)
  })
})

describe('digits', () => {
  it('formatea con puntos de miles y coma decimal', () => {
    expect(digits(1250.5)).toBe('1.250,5')
    expect(digits(1000)).toBe('1.000')
    expect(digits(0)).toBe('0')
  })

  it('controla decimales', () => {
    expect(digits(1250.5, 0)).toBe('1.251')
    expect(digits(1250.556, 3)).toBe('1.250,556')
  })
})

describe('groupVeAmount', () => {
  it('agrupa con puntos de miles', () => {
    expect(groupVeAmount('1250,5')).toBe('1.250,5')
    expect(groupVeAmount('1000')).toBe('1.000')
  })
})

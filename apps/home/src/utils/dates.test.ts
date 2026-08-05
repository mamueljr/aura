import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  daysUntil,
  isCurrentMonth,
  nextOccurrence,
  parseLocalDate,
  relativeDayLabel,
  toDateOnly,
} from './dates'

/**
 * Aritmética de fechas: el código más silencioso de Aura Home. Si se equivoca
 * no falla nada visiblemente — solo aparece un recordatorio el día que no toca,
 * o no aparece. Toda la app (servicios, documentos, mantenimiento, riego,
 * cumpleaños) cuelga de estas siete funciones.
 */

const HOY = new Date(2026, 6, 21, 15, 30) // 21 de julio de 2026, por la tarde

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(HOY)
})
afterEach(() => vi.useRealTimers())

describe('parseLocalDate', () => {
  it('una fecha sin hora se lee como local, no como UTC', () => {
    // `new Date('2026-07-21')` es medianoche UTC: en México eso todavía es
    // el día 20. Ese desfase de un día es justo lo que esta función evita.
    const date = parseLocalDate('2026-07-21')

    expect(date.getFullYear()).toBe(2026)
    expect(date.getMonth()).toBe(6)
    expect(date.getDate()).toBe(21)
  })

  it('una fecha con hora se respeta tal cual', () => {
    expect(parseLocalDate('2026-07-21T10:00:00.000Z').toISOString()).toBe(
      '2026-07-21T10:00:00.000Z',
    )
  })
})

describe('toDateOnly', () => {
  it('serializa en local, con ceros a la izquierda', () => {
    expect(toDateOnly(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(toDateOnly(new Date(2026, 11, 31))).toBe('2026-12-31')
  })

  it('ida y vuelta con parseLocalDate no mueve el día', () => {
    expect(toDateOnly(parseLocalDate('2026-03-01'))).toBe('2026-03-01')
  })
})

describe('daysUntil', () => {
  it('cuenta días completos, ignorando la hora', () => {
    expect(daysUntil('2026-07-21')).toBe(0)
    expect(daysUntil('2026-07-22')).toBe(1)
    expect(daysUntil('2026-07-26')).toBe(5)
  })

  it('lo ya pasado sale en negativo', () => {
    expect(daysUntil('2026-07-20')).toBe(-1)
    expect(daysUntil('2026-07-01')).toBe(-20)
  })

  it('compara días, no las 24 horas exactas', () => {
    // Son las 15:30. "Mañana a las 00:01" es 1 día, no 0.
    expect(daysUntil('2026-07-22T00:01:00')).toBe(1)
  })
})

describe('relativeDayLabel', () => {
  it('nombra los días cercanos', () => {
    expect(relativeDayLabel('2026-07-21')).toBe('Hoy')
    expect(relativeDayLabel('2026-07-22')).toBe('Mañana')
    expect(relativeDayLabel('2026-07-20')).toBe('Ayer')
  })

  it('los lejanos van con número, y los pasados en pasado', () => {
    expect(relativeDayLabel('2026-07-26')).toBe('En 5 días')
    expect(relativeDayLabel('2026-07-18')).toBe('Hace 3 días')
  })
})

describe('isCurrentMonth', () => {
  it('distingue el mes en curso del mismo mes de otro año', () => {
    expect(isCurrentMonth('2026-07-01')).toBe(true)
    expect(isCurrentMonth('2026-08-01')).toBe(false)
    expect(isCurrentMonth('2025-07-21')).toBe(false)
  })
})

describe('nextOccurrence', () => {
  it('el pago único no se repite', () => {
    expect(nextOccurrence('2026-07-21', 'unico')).toBeNull()
  })

  it('avanza los plazos por días', () => {
    expect(nextOccurrence('2026-07-21', 'semanal')).toBe('2026-07-28')
    expect(nextOccurrence('2026-07-21', 'quincenal')).toBe('2026-08-04')
  })

  it('avanza los plazos por meses', () => {
    expect(nextOccurrence('2026-07-21', 'mensual')).toBe('2026-08-21')
    expect(nextOccurrence('2026-07-21', 'bimestral')).toBe('2026-09-21')
    expect(nextOccurrence('2026-07-21', 'trimestral')).toBe('2026-10-21')
    expect(nextOccurrence('2026-07-21', 'semestral')).toBe('2027-01-21')
    expect(nextOccurrence('2026-07-21', 'anual')).toBe('2027-07-21')
  })

  it('cruza el fin de año sin perderse', () => {
    expect(nextOccurrence('2026-12-15', 'mensual')).toBe('2027-01-15')
    expect(nextOccurrence('2026-12-31', 'semanal')).toBe('2027-01-07')
  })

  describe('fin de mes — nunca debe saltarse un periodo', () => {
    it('un pago del 31 cae en el último día del mes corto, no en el siguiente', () => {
      // Con la suma directa de JS, el 31 de enero + 1 mes es "31 de febrero",
      // que desborda al 3 de marzo: el usuario se queda SIN aviso en febrero.
      expect(nextOccurrence('2026-01-31', 'mensual')).toBe('2026-02-28')
      expect(nextOccurrence('2026-03-31', 'mensual')).toBe('2026-04-30')
    })

    it('lo mismo con el 29 y el 30', () => {
      expect(nextOccurrence('2026-01-30', 'mensual')).toBe('2026-02-28')
      expect(nextOccurrence('2026-01-29', 'mensual')).toBe('2026-02-28')
    })

    it('en año bisiesto febrero sí llega al 29', () => {
      expect(nextOccurrence('2028-01-31', 'mensual')).toBe('2028-02-29')
    })

    it('los plazos largos también se recortan', () => {
      expect(nextOccurrence('2026-12-31', 'bimestral')).toBe('2027-02-28')
      expect(nextOccurrence('2024-02-29', 'anual')).toBe('2025-02-28')
    })

    it('un día que sí existe no se toca', () => {
      expect(nextOccurrence('2026-01-28', 'mensual')).toBe('2026-02-28')
      expect(nextOccurrence('2026-04-30', 'mensual')).toBe('2026-05-30')
    })
  })
})

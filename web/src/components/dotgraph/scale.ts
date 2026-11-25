/** How many gaps an axis aims for between its numbered ticks. */
export const TICK_GAPS = 4
/** A dip below zero smaller than this share of a step counts as slight. */
const SLIGHT_SHARE = 0.25

export interface Scale {
  min: number
  max: number
  ticks: number[]
}

/** The smallest of 1, 2, 2.5 or 5 times a power of ten that is at least `raw`. */
function niceStep(raw: number, whole: boolean): number {
  const power = 10 ** Math.floor(Math.log10(raw))
  const steps = whole && power < 10 ? [1, 2, 5, 10] : [1, 2, 2.5, 5, 10]
  const step = (steps.find((s) => s * power >= raw) ?? 10) * power
  return whole ? Math.max(1, step) : step
}

/** Removes binary fraction noise such as 0.30000000000000004. */
const clean = (v: number) => Number(v.toPrecision(12))

/**
 * An axis with round numbers that covers the values. `whole` keeps ticks on whole numbers.
 * Values that are never negative never get a negative axis.
 */
export function niceScale(values: readonly number[], whole: boolean): Scale {
  let low = values.length > 0 ? Math.min(...values) : 0
  let high = values.length > 0 ? Math.max(...values) : 1
  if (low === high) {
    const pad = Math.max(1, Math.abs(low) * 0.1)
    low = low >= 0 ? Math.max(0, low - pad) : low - pad
    high += pad
  }
  const step = niceStep((high - low) / TICK_GAPS, whole)
  // Values only slightly below zero end the axis there, without a mostly empty step under it.
  const slight = low < 0 && -low < step * SLIGHT_SHARE
  const first = slight ? 0 : clean(Math.floor(low / step) * step)
  const max = clean(Math.ceil(high / step) * step)
  const count = Math.round((max - first) / step)
  const ticks = Array.from({ length: count + 1 }, (_, i) => clean(first + i * step))
  return { min: slight ? low : first, max, ticks }
}

/** Percent of the way along the scale. */
export function along(value: number, scale: Scale): number {
  return ((value - scale.min) / (scale.max - scale.min)) * 100
}

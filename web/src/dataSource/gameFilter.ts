import type { GameFilter } from '../domain/provider'

/**
 * The filter as trailing arguments of a provider call: nothing at all when every game is wanted.
 */
export function filterArgs(playoffs: boolean): [filter?: GameFilter] {
  return playoffs ? [] : [{ playoffs: false }]
}

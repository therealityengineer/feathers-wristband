import type { HookContext } from '@feathersjs/feathers'
import type { WristbandSession } from '../types'

const METHODS_REQUIRING_CSRF = new Set(['create', 'update', 'patch', 'remove'])

export const csrfProtectHook = async (context: HookContext) => {
  if (!context.params.provider) {
    return context
  }

  if (!METHODS_REQUIRING_CSRF.has(context.method)) {
    return context
  }

  const session = (context.params as any).session as WristbandSession | undefined
  if (!session?.csrfToken) {
    const error = new Error('Forbidden (CSRF)') as Error & { code?: number }
    error.code = 403
    throw error
  }

  const headers = context.params.headers || {}
  const csrfHeader = (headers['x-csrf-token'] || headers['X-CSRF-TOKEN']) as string | undefined

  if (!csrfHeader || csrfHeader !== session.csrfToken) {
    const error = new Error('Forbidden (CSRF)') as Error & { code?: number }
    error.code = 403
    throw error
  }

  return context
}

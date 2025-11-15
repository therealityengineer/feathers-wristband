import type { HookContext } from '@feathersjs/feathers'

export async function redirectAfterHook(context: HookContext) {
  if (context.params.provider === 'rest' && context.result && 'redirectUrl' in context.result) {
    context.http = {
      ...(context.http || {}),
      status: 302,
      location: (context.result as { redirectUrl: string }).redirectUrl
    }
    context.result = { ok: true }
  }
  return context
}

export async function noStoreAfterHook(context: HookContext) {
  if (context.params.provider === 'rest') {
    context.http = {
      ...(context.http || {}),
      headers: {
        ...(context.http?.headers || {}),
        'Cache-Control': 'no-store',
        Pragma: 'no-cache'
      }
    }
  }
  return context
}

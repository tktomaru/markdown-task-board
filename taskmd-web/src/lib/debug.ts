// Debug utility controlled by VITE_DEBUG environment variable
const isDebugEnabled = import.meta.env.VITE_DEBUG === 'true'

export const debug = {
  log: (...args: any[]) => {
    if (isDebugEnabled) {
      console.log('[DEBUG]', ...args)
    }
  },

  error: (...args: any[]) => {
    if (isDebugEnabled) {
      console.error('[DEBUG ERROR]', ...args)
    }
  },

  warn: (...args: any[]) => {
    if (isDebugEnabled) {
      console.warn('[DEBUG WARN]', ...args)
    }
  },

  group: (label: string, fn: () => void) => {
    if (isDebugEnabled) {
      console.group(`[DEBUG] ${label}`)
      fn()
      console.groupEnd()
    }
  },

  table: (data: any) => {
    if (isDebugEnabled) {
      console.table(data)
    }
  },
}

export const isDebug = () => isDebugEnabled

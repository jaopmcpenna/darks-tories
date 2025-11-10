import { ref } from 'vue'

export interface DebugLog {
  id: string
  timestamp: number
  level: 'log' | 'warn' | 'error' | 'info'
  message: string
  data?: any
}

const logs = ref<DebugLog[]>([])
const maxLogs = 50
const showDebugPanel = ref(false)

export function useDebugLogs() {
  const addLog = (level: DebugLog['level'], message: string, data?: any) => {
    const log: DebugLog = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      level,
      message,
      data,
    }
    
    logs.value.unshift(log)
    
    // Keep only last maxLogs
    if (logs.value.length > maxLogs) {
      logs.value = logs.value.slice(0, maxLogs)
    }
  }

  const clearLogs = () => {
    logs.value = []
  }

  const toggleDebugPanel = () => {
    showDebugPanel.value = !showDebugPanel.value
  }

  // Intercept console methods to capture ALL console logs
  const originalConsoleLog = console.log
  const originalConsoleWarn = console.warn
  const originalConsoleError = console.error
  const originalConsoleInfo = console.info

  const setupConsoleInterception = () => {
    console.log = (...args: any[]) => {
      originalConsoleLog(...args)
      const message = args.map(arg => 
        typeof arg === 'string' ? arg : JSON.stringify(arg)
      ).join(' ')
        addLog('log', message, args.length > 1 ? args.slice(1) : undefined)
    }

    console.warn = (...args: any[]) => {
      originalConsoleWarn(...args)
      const message = args.map(arg => 
        typeof arg === 'string' ? arg : JSON.stringify(arg)
      ).join(' ')
        addLog('warn', message, args.length > 1 ? args.slice(1) : undefined)
    }

    console.error = (...args: any[]) => {
      originalConsoleError(...args)
      const message = args.map(arg => 
        typeof arg === 'string' ? arg : JSON.stringify(arg)
      ).join(' ')
        addLog('error', message, args.length > 1 ? args.slice(1) : undefined)
      }

    console.info = (...args: any[]) => {
      originalConsoleInfo(...args)
      const message = args.map(arg => 
        typeof arg === 'string' ? arg : JSON.stringify(arg)
      ).join(' ')
      addLog('info', message, args.length > 1 ? args.slice(1) : undefined)
    }
  }

  const restoreConsole = () => {
    console.log = originalConsoleLog
    console.warn = originalConsoleWarn
    console.error = originalConsoleError
    console.info = originalConsoleInfo
  }

  return {
    logs,
    showDebugPanel,
    addLog,
    clearLogs,
    toggleDebugPanel,
    setupConsoleInterception,
    restoreConsole,
  }
}


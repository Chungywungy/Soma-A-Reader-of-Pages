import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from 'react'

interface StoredValue<T> {
  value: T
  error: string | null
}

interface StoredValueResult<T> extends StoredValue<T> {
  setValue: Dispatch<SetStateAction<T>>
}

function storageError(action: 'read' | 'save', key: string, error: unknown): string {
  const reason = error instanceof Error ? ` ${error.message}` : ''
  return `Could not ${action} saved setting "${key}".${reason}`
}

export function useStoredValue<T>(
  key: string,
  initialValue: T,
  validate: (value: unknown) => value is T,
): StoredValueResult<T> {
  const [state, setState] = useState<StoredValue<T>>(() => {
    try {
      const saved = localStorage.getItem(key)
      if (saved === null) return { value: initialValue, error: null }
      const parsed: unknown = JSON.parse(saved)
      if (!validate(parsed)) {
        return {
          value: initialValue,
          error: `Saved setting "${key}" was invalid and has been ignored.`,
        }
      }
      return { value: parsed, error: null }
    } catch (error) {
      return { value: initialValue, error: storageError('read', key, error) }
    }
  })
  const stateRef = useRef(state)

  const setValue = useCallback<Dispatch<SetStateAction<T>>>(
    (action) => {
      const value =
        typeof action === 'function'
          ? (action as (previous: T) => T)(stateRef.current.value)
          : action
      let nextState: StoredValue<T> = { value, error: null }
      try {
        localStorage.setItem(key, JSON.stringify(value))
      } catch (error) {
        nextState = { value, error: storageError('save', key, error) }
      }
      stateRef.current = nextState
      setState(nextState)
    },
    [key],
  )

  return { ...state, setValue }
}

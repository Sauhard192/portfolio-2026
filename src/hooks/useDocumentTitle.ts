import { useLayoutEffect } from 'react'

export function useDocumentTitle(title: string) {
  useLayoutEffect(() => {
    document.title = title
  }, [title])
}

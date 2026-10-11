import { useEffect } from 'react'

const APP_NAME = 'Shelf'

/** Sets `document.title` to "<title> · Shelf" (or just "Shelf") while the calling page is mounted. */
export function useDocumentTitle(title?: string): void {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME
  }, [title])
}

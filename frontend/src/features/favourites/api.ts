import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { BookDto } from '@library/shared'
import { apiDelete, apiGet, apiPut } from '../../api/client'
import { useCurrentUser } from '../auth/api'

export const favouriteKeys = {
  all: ['favourites'] as const,
  ids: ['favourites', 'ids'] as const,
  list: ['favourites', 'list'] as const,
}

/** One query for the whole grid; only runs for logged-in users. */
export function useFavouriteIds() {
  const { data: user } = useCurrentUser()
  return useQuery({
    queryKey: favouriteKeys.ids,
    queryFn: () => apiGet<string[]>('/api/me/favourites/ids'),
    enabled: !!user,
  })
}

export function useFavourites() {
  return useQuery({ queryKey: favouriteKeys.list, queryFn: () => apiGet<BookDto[]>('/api/me/favourites') })
}

/** Optimistically flips the id in the cached set, rolling back on error. */
export function useToggleFavourite(bookId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (add: boolean) =>
      add ? apiPut<void>(`/api/books/${bookId}/favourite`) : apiDelete(`/api/books/${bookId}/favourite`),
    onMutate: async (add) => {
      await queryClient.cancelQueries({ queryKey: favouriteKeys.ids })
      const previous = queryClient.getQueryData<string[]>(favouriteKeys.ids)
      queryClient.setQueryData<string[]>(favouriteKeys.ids, (ids = []) =>
        add ? [...ids.filter((id) => id !== bookId), bookId] : ids.filter((id) => id !== bookId),
      )
      return { previous }
    },
    onError: (_error, _add, context) => queryClient.setQueryData(favouriteKeys.ids, context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey: favouriteKeys.all }),
  })
}

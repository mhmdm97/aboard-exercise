import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { LoginInput, RegisterInput, UserDto } from '@library/shared'
import { ApiError, apiGet, apiPost } from '../../api/client'

export const authKeys = { me: ['auth', 'me'] as const }

/** `null` means "not logged in" (a 401 is an expected answer, not an error). */
async function fetchMe(): Promise<UserDto | null> {
  try {
    return await apiGet<UserDto>('/api/auth/me')
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null
    throw error
  }
}

export function useCurrentUser() {
  return useQuery({ queryKey: authKeys.me, queryFn: fetchMe, staleTime: 5 * 60 * 1000, retry: false })
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: LoginInput) => apiPost<UserDto>('/api/auth/login', input),
    onSuccess: (user) => queryClient.setQueryData(authKeys.me, user),
  })
}

export function useRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: RegisterInput) => apiPost<UserDto>('/api/auth/register', input),
    onSuccess: (user) => queryClient.setQueryData(authKeys.me, user),
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => apiPost<void>('/api/auth/logout'),
    onSuccess: () => {
      queryClient.setQueryData(authKeys.me, null)
      queryClient.removeQueries({ queryKey: ['favourites'] })
    },
  })
}

/** Only follow relative in-app paths; anything else (absolute or protocol-relative URLs) falls back to `/`. */
export function safeRedirect(target: string | null): string {
  return target && target.startsWith('/') && !target.startsWith('//') && !target.startsWith('/\\') ? target : '/'
}

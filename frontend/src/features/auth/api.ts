import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { LoginInput, MeResponse, RegisterInput, UserDto } from '@library/shared'
import { apiGet, apiPost } from '../../api/client'

export const authKeys = { me: ['auth', 'me'] as const }

/** `null` means "not logged in" (the endpoint answers 200 with `user: null`). */
async function fetchMe(): Promise<UserDto | null> {
  return (await apiGet<MeResponse>('/api/auth/me')).user
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

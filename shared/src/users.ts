import { z } from 'zod'

export const userRoleSchema = z.enum(['admin', 'member'])
export type UserRole = z.infer<typeof userRoleSchema>

export const userDtoSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  name: z.string(),
  role: userRoleSchema,
})
export type UserDto = z.infer<typeof userDtoSchema>

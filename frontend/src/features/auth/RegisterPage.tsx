import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { registerInputSchema } from '@library/shared'
import type { RegisterInput } from '@library/shared'
import { ApiError } from '../../api/client'
import { TextField } from '../../components/TextField/TextField'
import { safeRedirect, useRegister } from './api'
import styles from './AuthForm.module.css'

export function RegisterPage() {
  const [params] = useSearchParams()
  const redirect = safeRedirect(params.get('redirect'))
  const navigate = useNavigate()
  const registerUser = useRegister()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerInputSchema) })

  const onSubmit = (values: RegisterInput) =>
    registerUser.mutate(values, {
      onSuccess: () => void navigate(redirect, { replace: true }),
      onError: (error) => {
        if (error instanceof ApiError && error.status === 409) {
          setError('email', { message: 'An account with this email already exists.' })
        }
      },
    })

  const serverError =
    registerUser.error && !(registerUser.error instanceof ApiError && registerUser.error.status === 409)
      ? registerUser.error.message
      : null

  return (
    <section className={styles.page}>
      <h1>Register</h1>
      <form className={styles.form} onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate>
        {serverError && (
          <div className={styles.banner} role="alert">
            {serverError}
          </div>
        )}
        <TextField
          label="Name"
          autoComplete="name"
          error={errors.name?.message && 'Enter your name (up to 100 characters).'}
          {...register('name')}
        />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="8 to 128 characters."
          error={errors.password?.message && 'Password must be 8 to 128 characters.'}
          {...register('password')}
        />
        <button type="submit" className={`button ${styles.submit}`} disabled={registerUser.isPending}>
          {registerUser.isPending ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className={styles.alt}>
        Already registered? <Link to={`/login${params.toString() ? `?${params.toString()}` : ''}`}>Log in</Link>
      </p>
    </section>
  )
}

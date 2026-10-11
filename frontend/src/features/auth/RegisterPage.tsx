import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { registerInputSchema } from '@library/shared'
import type { RegisterInput } from '@library/shared'
import { ApiError } from '../../api/client'
import { PasswordField } from '../../components/PasswordField/PasswordField'
import { TextField } from '../../components/TextField/TextField'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { canViewTransition } from '../../hooks/viewTransition'
import { safeRedirect, useRegister } from './api'
import { AlertIcon } from './AlertIcon'
import styles from './AuthForm.module.css'

export function RegisterPage() {
  useDocumentTitle('Create account')
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
      onSuccess: () => void navigate(redirect, { replace: true, viewTransition: canViewTransition() }),
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
      <form className={styles.card} aria-labelledby="register-heading" onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate>
        <div className={styles.heading}>
          <h1 id="register-heading">Start your shelf</h1>
          <p>Free. Save the books you love in one place.</p>
        </div>
        {serverError && (
          <div className={styles.alert} role="alert">
            <AlertIcon />
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
        <PasswordField
          label="Password"
          autoComplete="new-password"
          hint="8 to 128 characters."
          error={errors.password?.message && 'Password must be 8 to 128 characters.'}
          {...register('password')}
        />
        <button type="submit" className="btn btn-primary btn-block" disabled={registerUser.isPending}>
          {registerUser.isPending ? 'Creating account…' : 'Create account'}
        </button>
        <p className={styles.alt}>
          Already have an account?{' '}
          <Link to={`/login${params.toString() ? `?${params.toString()}` : ''}`} viewTransition={canViewTransition()}>
            Log in
          </Link>
        </p>
      </form>
    </section>
  )
}

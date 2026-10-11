import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { loginInputSchema } from '@library/shared'
import type { LoginInput } from '@library/shared'
import { TextField } from '../../components/TextField/TextField'
import { safeRedirect, useLogin } from './api'
import styles from './AuthForm.module.css'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'

export function LoginPage() {
  useDocumentTitle('Sign in')
  const [params] = useSearchParams()
  const redirect = safeRedirect(params.get('redirect'))
  const navigate = useNavigate()
  const login = useLogin()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginInputSchema) })

  const onSubmit = (values: LoginInput) =>
    login.mutate(values, { onSuccess: () => void navigate(redirect, { replace: true }) })

  return (
    <section className={styles.page}>
      <h1>Log in</h1>
      <form className={styles.form} onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate>
        {login.error && (
          <div className={styles.banner} role="alert">
            {login.error.message}
          </div>
        )}
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message && 'Enter a valid email address.'}
          {...register('email')}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message && 'Enter your password.'}
          {...register('password')}
        />
        <button type="submit" className={`button ${styles.submit}`} disabled={login.isPending}>
          {login.isPending ? 'Logging in…' : 'Log in'}
        </button>
        <p className={styles.hint}>Demo: admin@library.local / Admin123! · member@library.local / Member123!</p>
      </form>
      <p className={styles.alt}>
        No account? <Link to={`/register${params.toString() ? `?${params.toString()}` : ''}`}>Register</Link>
      </p>
    </section>
  )
}

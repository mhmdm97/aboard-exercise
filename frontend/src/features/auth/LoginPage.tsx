import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { loginInputSchema } from '@library/shared'
import type { LoginInput } from '@library/shared'
import { PasswordField } from '../../components/PasswordField/PasswordField'
import { TextField } from '../../components/TextField/TextField'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { canViewTransition } from '../../hooks/viewTransition'
import { safeRedirect, useLogin } from './api'
import { AlertIcon } from './AlertIcon'
import styles from './AuthForm.module.css'

const DEMO_ACCOUNTS = [
  { role: 'Admin', email: 'admin@library.local', password: 'Admin123!' },
  { role: 'Member', email: 'member@library.local', password: 'Member123!' },
] as const

export function LoginPage() {
  useDocumentTitle('Sign in')
  const [params] = useSearchParams()
  const redirect = safeRedirect(params.get('redirect'))
  const navigate = useNavigate()
  const login = useLogin()
  const {
    register,
    handleSubmit,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginInputSchema) })

  const onSubmit = (values: LoginInput) =>
    login.mutate(values, { onSuccess: () => void navigate(redirect, { replace: true, viewTransition: canViewTransition() }) })

  const fillDemo = (account: (typeof DEMO_ACCOUNTS)[number]) => {
    setValue('email', account.email)
    setValue('password', account.password)
    clearErrors()
  }

  return (
    <section className={styles.page}>
      <form className={styles.card} aria-labelledby="login-heading" onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate>
        <div className={styles.heading}>
          <h1 id="login-heading">Welcome back</h1>
          <p>Log in to keep favourites and manage the library.</p>
        </div>
        {login.error && (
          <div className={styles.alert} role="alert">
            <AlertIcon />
            {login.error.message}
          </div>
        )}
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email?.message && 'Enter a valid email address.'}
          {...register('email')}
        />
        <PasswordField
          label="Password"
          autoComplete="current-password"
          error={errors.password?.message && 'Enter your password.'}
          {...register('password')}
        />
        <button type="submit" className="btn btn-primary btn-block" disabled={login.isPending}>
          {login.isPending ? 'Logging in…' : 'Log in'}
        </button>
        <div className={styles.demo}>
          <span className="eyebrow">Demo accounts</span>
          {DEMO_ACCOUNTS.map((account) => (
            <div key={account.role} className={styles.demoRow}>
              <span className={styles.demoText}>
                <strong>{account.role}</strong>
                <span className={styles.mono}>
                  {account.email} · {account.password}
                </span>
              </span>
              <button
                type="button"
                className={styles.use}
                aria-label={`Fill in ${account.role.toLowerCase()} demo account`}
                onClick={() => fillDemo(account)}
              >
                Use
              </button>
            </div>
          ))}
        </div>
        <p className={styles.alt}>
          New here?{' '}
          <Link to={`/register${params.toString() ? `?${params.toString()}` : ''}`} viewTransition={canViewTransition()}>
            Create an account
          </Link>
        </p>
      </form>
    </section>
  )
}

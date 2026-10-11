import { Link, NavLink, Outlet } from 'react-router'
import { useCurrentUser, useLogout } from '../../features/auth/api'
import styles from './Layout.module.css'

const navClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? `${styles.link} ${styles.active}` : styles.link

function LogoMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true" className={styles.mark}>
      <rect x="3" y="6" width="5" height="18" rx="1" style={{ fill: 'var(--ink)' }} />
      <rect x="10" y="3" width="5" height="21" rx="1" style={{ fill: 'var(--accent)' }} />
      <rect x="17.5" y="7" width="5" height="17" rx="1" transform="rotate(12 20 24)" style={{ fill: 'var(--ink-2)' }} />
      <path d="M2 25.5h24" style={{ stroke: 'var(--ink)' }} strokeWidth="1.5" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function Layout() {
  const { data: user } = useCurrentUser()
  const logout = useLogout()

  return (
    <div className={styles.shell}>
      <a className={styles.skip} href="#main">
        Skip to content
      </a>
      <header className={styles.header}>
        <div className={`container ${styles.bar}`}>
          <Link to="/" className={styles.brand} aria-label="Shelf, go to library">
            <LogoMark />
            <span className={styles.wordmark}>Shelf</span>
          </Link>
          <nav aria-label="Primary" className={styles.nav}>
            <NavLink to="/" end className={navClass}>
              Library
            </NavLink>
            {user && (
              <NavLink to="/favourites" className={navClass}>
                Favourites
              </NavLink>
            )}
            {user?.role === 'admin' && (
              <NavLink to="/books/new" className={navClass}>
                <PlusIcon />
                Add book
              </NavLink>
            )}
          </nav>
          <div className={styles.actions}>
            {user ? (
              <>
                <span className={styles.userName}>{user.name}</span>
                <span className="badge">{user.role}</span>
                <button
                  type="button"
                  className={`btn btn-ghost ${styles.logout}`}
                  disabled={logout.isPending}
                  onClick={() => logout.mutate()}
                >
                  <LogoutIcon />
                  <span className={styles.logoutText}>Log out</span>
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost">
                  Log in
                </Link>
                <Link to="/register" className="btn btn-primary">
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main id="main" tabIndex={-1} className={`container ${styles.main}`}>
        <Outlet />
      </main>
      <footer className={styles.footer}>
        <div className="container">Shelf: your book library</div>
      </footer>
    </div>
  )
}

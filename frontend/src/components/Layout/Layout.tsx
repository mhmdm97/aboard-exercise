import { useState } from 'react'
import { NavLink, Outlet } from 'react-router'
import styles from './Layout.module.css'

const navClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? `${styles.link} ${styles.active}` : styles.link

export function Layout() {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <div className={styles.shell}>
      <a className={styles.skip} href="#main">
        Skip to content
      </a>
      <header className={styles.header}>
        <div className={`container ${styles.bar}`}>
          <NavLink to="/" className={styles.brand} onClick={close}>
            Shelf
          </NavLink>
          <button
            type="button"
            className={styles.menuButton}
            aria-expanded={open}
            aria-controls="primary-nav"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? 'Close menu' : 'Menu'}
          </button>
          <nav
            id="primary-nav"
            aria-label="Primary"
            className={open ? `${styles.nav} ${styles.navOpen}` : styles.nav}
          >
            <NavLink to="/" end className={navClass} onClick={close}>
              Library
            </NavLink>
            <span className={styles.spacer} />
            <NavLink to="/login" className={navClass} onClick={close}>
              Log in
            </NavLink>
            <NavLink to="/register" className={navClass} onClick={close}>
              Register
            </NavLink>
          </nav>
        </div>
      </header>
      <main id="main" tabIndex={-1} className={`container ${styles.main}`}>
        <Outlet />
      </main>
      <footer className={styles.footer}>
        <div className="container">Shelf — your book library</div>
      </footer>
    </div>
  )
}

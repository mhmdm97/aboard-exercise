import { useState } from 'react'
import type { ComponentProps } from 'react'
import { TextField } from '../TextField/TextField'
import styles from './PasswordField.module.css'

type Props = Omit<ComponentProps<typeof TextField>, 'type' | 'trailing'>

/** A password `TextField` with a Show / Hide toggle. Spread react-hook-form's `register(...)` onto it as usual. */
export function PasswordField(props: Props) {
  const [visible, setVisible] = useState(false)
  return (
    <TextField
      {...props}
      type={visible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          className={styles.toggle}
          aria-label={visible ? 'Hide password' : 'Show password'}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      }
    />
  )
}

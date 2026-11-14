import type { ButtonHTMLAttributes } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost'; size?: 'normal' | 'large' }

/** White pill for actions; ghost pill for secondary ones. */
export function Button({ variant = 'primary', size = 'normal', className = '', ...rest }: Props) {
  const cls = ['button', variant === 'ghost' && 'is-ghost', size === 'large' && 'is-large', className].filter(Boolean).join(' ')
  return <button type="button" className={cls} {...rest} />
}

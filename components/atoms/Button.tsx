import type { ReactElement, ReactNode, ButtonHTMLAttributes } from 'react'
import MuiButton from '@mui/material/Button'
import type { LinkProps } from 'next/link'
import {IconSpinner} from '@atoms/icons/IconSpinner'

export const variantMap = {
  primary: 'contained',
  secondary: 'outlined',
  ghost: 'text',
} as const

export const sizeMap = {
  sm: 'small',
  md: 'medium',
  lg: 'large',
} as const

export const spinnerSizeMap = {
  sm: 16,
  md: 20,
  lg: 24,
} as const

type ButtonVariant = keyof typeof variantMap
type ButtonSize = keyof typeof sizeMap

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color' | 'variant'> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  loading?: boolean
  startIcon?: ReactElement
  className?: string
  component?: React.ElementType
  href?: LinkProps['href']
  children?: ReactNode
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  className = '',
  startIcon,
  disabled,
  component,
  href,
  ...props
}: ButtonProps): ReactElement {
  const muiSize = sizeMap[size]
  const spinnerSize = spinnerSizeMap[size]
  const loadingIcon = loading ? <IconSpinner size={spinnerSize} /> : undefined
  const loadingClass = loading
    ? '[&.Mui-disabled]:!opacity-100 [&.Mui-disabled]:!text-ink/60 [&.Mui-disabled]:cursor-wait [&_.MuiButton-startIcon]:mr-2 [&_.MuiButton-startIcon]:ml-0'
    : ''
  const componentClass = `${className} ${loadingClass}`.trim()

  const resolvedHref: string | undefined = (():
    string | undefined => {
      if (href === null || href === undefined) return undefined
      if (typeof href === 'string') return href
      // next/link href may be an object; String() converts to a path string
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      return String(href)
    })()

  return (
    <MuiButton
      {...props}
      {...(component ? { component } : {})}
      {...(resolvedHref ? { href: resolvedHref } : {})}
      variant={variantMap[variant]}
      size={muiSize}
      fullWidth={fullWidth}
      disabled={disabled || loading}
      startIcon={loadingIcon || startIcon}
      className={componentClass}
    >
      {children}
    </MuiButton>
  )
}

import type { ReactElement, ButtonHTMLAttributes } from 'react'
import MuiButton from '@mui/material/Button'
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
  ...props
}: ButtonProps): ReactElement {
  const muiSize = sizeMap[size]
  const spinnerSize = spinnerSizeMap[size]
  const loadingIcon = loading ? <IconSpinner size={spinnerSize} /> : undefined
  const loadingClass = loading
    ? '[&.Mui-disabled]:!opacity-100 [&.Mui-disabled]:!text-ink/60 [&.Mui-disabled]:cursor-wait [&_.MuiButton-startIcon]:mr-2 [&_.MuiButton-startIcon]:ml-0'
    : ''
  const componentClass = `${className} ${loadingClass}`.trim()

  return (
    <MuiButton
      {...props}
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

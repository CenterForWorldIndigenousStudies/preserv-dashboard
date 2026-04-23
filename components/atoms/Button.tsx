import type { ReactElement, ButtonHTMLAttributes } from "react";
import MuiButton from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";

export const variantMap = {
  primary: "contained",
  secondary: "outlined",
  ghost: "text",
} as const;

export const sizeMap = {
  sm: "small",
  md: "medium",
  lg: "large",
} as const;

type ButtonVariant = keyof typeof variantMap
type ButtonSize = keyof typeof sizeMap;

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "color" | "variant"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  startIcon?: ReactElement;
  className?: string;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  loading = false,
  className = "",
  startIcon,
  disabled,
  ...props
}: ButtonProps): ReactElement {
  const muiSize = sizeMap[size];

  return (
    <MuiButton
      {...props}
      variant={variantMap[variant]}
      size={muiSize}
      fullWidth={fullWidth}
      disabled={disabled || loading}
      startIcon={loading ? undefined : startIcon}
      className={className}
    >
      {loading ? (
        <>
          <CircularProgress size="1.25em" sx={{ mr: 1, color: "inherit" }} />
          {"Loading..."}
        </>
      ) : (
        children
      )}
    </MuiButton>
  );
}
import Link from "next/link";
import type { ComponentProps } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "tertiary" | "destructive" | "ink" | "yellow";
type Size = "sm" | "md" | "lg" | "icon";

// Every text button is a pill. Icon-only buttons (size "icon") are circles.
const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-[-0.01em] transition-[background-color,color,transform] active:scale-[0.98] " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand " +
  "disabled:cursor-not-allowed disabled:opacity-60 select-none whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary: "bg-brand text-on-brand hover:bg-brand-hover",
  secondary: "border border-ink/15 bg-surface text-ink hover:border-ink/30 hover:bg-canvas",
  tertiary: "text-ink hover:bg-ink/5",
  destructive: "bg-danger text-white hover:bg-danger-ink",
  /** Black pill: for use on colour blocks, where purple would clash. */
  ink: "bg-ink text-white hover:bg-ink/85",
  /** Brand yellow with dark text: for dark blocks and the main call to action. */
  yellow: "bg-yellow text-on-yellow hover:brightness-[0.94]",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-7 text-base",
  icon: "size-10",
};

export type ButtonStyleProps = { variant?: Variant; size?: Size; fullWidth?: boolean };

export function buttonClasses({ variant = "primary", size = "md", fullWidth }: ButtonStyleProps = {}) {
  return cn(base, variants[variant], sizes[size], fullWidth && "w-full");
}

type ButtonProps = ComponentProps<"button"> & ButtonStyleProps & { loading?: boolean };

export function Button({
  variant,
  size,
  fullWidth,
  loading = false,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonClasses({ variant, size, fullWidth }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & ButtonStyleProps;

export function ButtonLink({ variant, size, fullWidth, className, ...props }: ButtonLinkProps) {
  return <Link className={cn(buttonClasses({ variant, size, fullWidth }), className)} {...props} />;
}

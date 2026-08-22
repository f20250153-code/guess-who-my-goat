"use client";

import { forwardRef } from "react";
import Link from "next/link";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

interface BaseProps {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  className?: string;
  children: React.ReactNode;
}

type ButtonAsButton = BaseProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
  };

type ButtonAsLink = BaseProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
    href: string;
  };

type ButtonProps = ButtonAsButton | ButtonAsLink;

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary-hover shadow-[0_0_0_1px_rgba(124,92,255,0.4)]",
  secondary: "bg-bg-elevated-2 text-text border border-border-strong hover:border-secondary/60",
  danger: "bg-danger/15 text-danger border border-danger/40 hover:bg-danger/25",
  ghost: "bg-transparent text-text-muted hover:text-text hover:bg-bg-elevated",
  outline: "bg-transparent text-text border border-border-strong hover:border-primary/60",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-3 text-sm gap-1.5",
  md: "h-11 px-5 text-sm gap-2",
  lg: "h-13 px-7 text-base gap-2.5",
};

export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  function Button({ variant = "primary", size = "md", fullWidth, className, children, ...rest }, ref) {
    const classes = clsx(
      "inline-flex items-center justify-center rounded-[10px] font-semibold tracking-tight transition-colors duration-150",
      "focus-visible:outline-2 focus-visible:outline-secondary focus-visible:outline-offset-2",
      "disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98]",
      variantClasses[variant],
      sizeClasses[size],
      fullWidth && "w-full",
      className,
    );

    if ("href" in rest && rest.href) {
      const { href, ...anchorRest } = rest as ButtonAsLink;
      return (
        <Link
          href={href}
          ref={ref as React.Ref<HTMLAnchorElement>}
          className={classes}
          {...anchorRest}
        >
          {children}
        </Link>
      );
    }

    const buttonRest = rest as React.ButtonHTMLAttributes<HTMLButtonElement>;
    return (
      <button ref={ref as React.Ref<HTMLButtonElement>} className={classes} {...buttonRest}>
        {children}
      </button>
    );
  },
);

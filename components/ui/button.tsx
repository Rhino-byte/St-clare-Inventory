"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { LoadingSpinner } from "@/components/ui/loading-state";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-emerald-700 text-white hover:bg-emerald-800",
        secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
        outline: "border border-slate-300 bg-white hover:bg-slate-50",
        destructive: "bg-red-600 text-white hover:bg-red-700",
        ghost: "hover:bg-slate-100",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Shows a spinner and locks the button while true. */
  loading?: boolean;
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    value != null &&
    typeof value === "object" &&
    "then" in value &&
    typeof (value as PromiseLike<unknown>).then === "function"
  );
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading,
      disabled,
      children,
      onClick,
      ...props
    },
    ref
  ) => {
    const [autoLoading, setAutoLoading] = React.useState(false);
    const lockedRef = React.useRef(false);
    const isLoading = loading === true || autoLoading;
    const isLocked = Boolean(disabled) || isLoading;

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (isLocked || lockedRef.current) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      const result: unknown = onClick?.(event);

      if (loading === undefined && isPromiseLike(result)) {
        lockedRef.current = true;
        setAutoLoading(true);
        void Promise.resolve(result).finally(() => {
          lockedRef.current = false;
          setAutoLoading(false);
        });
      }
    };

    if (asChild) {
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Slot>
      );
    }

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isLocked}
        aria-busy={isLoading || undefined}
        onClick={handleClick}
        {...props}
      >
        {isLoading ? <LoadingSpinner size="sm" className="text-current" /> : null}
        <span className="inline-flex items-center gap-0">
          {children}
          {isLoading ? <span className="loading-ellipsis" aria-hidden="true" /> : null}
        </span>
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };

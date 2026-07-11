import { cn } from "@/lib/utils";

const sizeClasses = {
  sm: "h-5 w-5",
  md: "h-8 w-8",
  lg: "h-12 w-12",
} as const;

type LoadingSize = keyof typeof sizeClasses;
type LoadingLayout = "inline" | "centered";

interface LoadingSpinnerProps {
  size?: LoadingSize;
  className?: string;
}

export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  return (
    <svg
      className={cn("animate-spin text-emerald-600", sizeClasses[size], className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        className="opacity-20"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="16 48"
      />
    </svg>
  );
}

interface LoadingStateProps {
  label: string;
  size?: LoadingSize;
  layout?: LoadingLayout;
  className?: string;
}

export function LoadingState({
  label,
  size = "md",
  layout = "centered",
  className,
}: LoadingStateProps) {
  if (layout === "inline") {
    return (
      <div
        className={cn("inline-flex items-center gap-2", className)}
        role="status"
        aria-live="polite"
        aria-label={label}
      >
        <LoadingSpinner size={size} />
        <span className="text-sm text-slate-500">
          <span>{label}</span>
          <span className="loading-ellipsis" aria-hidden="true" />
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex min-h-[50vh] flex-col items-center justify-center gap-3",
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <LoadingSpinner size={size} />
      <p className="text-sm text-slate-500">
        <span>{label}</span>
        <span className="loading-ellipsis" aria-hidden="true" />
      </p>
    </div>
  );
}

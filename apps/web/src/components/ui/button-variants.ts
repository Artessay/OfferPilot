import { cva, type VariantProps } from "class-variance-authority";

/**
 * Button style variants. Kept in a separate module from the component so the
 * component file only exports a component (clean React Fast Refresh).
 */
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
        outline: "border border-border bg-surface text-foreground hover:bg-primary-light",
        ghost: "text-foreground hover:bg-primary-light",
        subtle: "bg-primary-light text-primary hover:bg-primary-light/70",
        danger: "bg-critical text-white hover:opacity-90",
      },
      size: {
        sm: "h-8 px-3",
        md: "h-10 px-4",
        lg: "h-11 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;

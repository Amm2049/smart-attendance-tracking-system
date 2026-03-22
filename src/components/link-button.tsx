"use client";

import Link, { type LinkProps } from "next/link";
import { type ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Variant = NonNullable<Parameters<typeof buttonVariants>[0]>["variant"];
type Size = NonNullable<Parameters<typeof buttonVariants>[0]>["size"];

export function LinkButton({
  href,
  children,
  className,
  variant,
  size,
  ...props
}: LinkProps & {
  children: ReactNode;
  className?: string;
  variant?: Variant;
  size?: Size;
}) {
  return (
    <Link
      href={href}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {children}
    </Link>
  );
}


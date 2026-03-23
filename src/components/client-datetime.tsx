"use client";

import { useMemo } from "react";

type ClientDateTimeProps = {
  value: string;
  className?: string;
  fallback?: string;
};

export function ClientDateTime({ value, className, fallback = "—" }: ClientDateTimeProps) {
  const label = useMemo(() => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return fallback;
    return date.toLocaleString();
  }, [value, fallback]);

  return <span className={className}>{label}</span>;
}

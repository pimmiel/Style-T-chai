import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface DisplayHeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: "h1" | "h2" | "h3";
}

export function DisplayHeading({ as: Tag = "h2", className, children, ...props }: DisplayHeadingProps) {
  return (
    <Tag
      className={cn("font-serif font-normal leading-tight [&_em]:not-italic [&_em]:italic [&_em]:text-primary", className)}
      {...props}
    >
      {children}
    </Tag>
  );
}

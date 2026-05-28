import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "min-h-[130px] w-full min-w-0 overflow-x-hidden rounded-[10px] border border-border bg-input px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground transition-[border-color,background-color] duration-200 [overflow-wrap:anywhere] focus-visible:border-border focus-visible:outline-none focus-visible:ring-0 sm:min-h-[160px]",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };

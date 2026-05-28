"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const SidebarContext = React.createContext(true);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  return <SidebarContext.Provider value>{children}</SidebarContext.Provider>;
}

export function Sidebar({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <aside
      className={cn(
        "hidden w-[248px] shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex md:h-dvh md:flex-col",
        className
      )}
      {...props}
    />
  );
}

export function SidebarInset({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return <main className={cn("flex h-dvh min-w-0 flex-1 flex-col overflow-hidden bg-background text-foreground", className)} {...props} />;
}

export function SidebarHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex h-[72px] items-center border-b border-sidebar-border px-4", className)} {...props} />;
}

export function SidebarContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-1 flex-col gap-5 px-3 py-4", className)} {...props} />;
}

export function SidebarFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-auto border-t border-sidebar-border p-5", className)} {...props} />;
}

export function SidebarMenu({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <nav className={cn("flex flex-col gap-1", className)} {...props} />;
}

export function SidebarMenuItem({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex", className)} {...props} />;
}

const sidebarMenuButtonVariants = cva(
  "flex h-9 w-full appearance-none items-center gap-3 rounded-md border-l-2 bg-transparent px-3 text-left text-[13px] font-medium transition-[background-color,border-color,color,transform] duration-200 ease-out hover:bg-sidebar-accent hover:text-subtle-foreground motion-safe:hover:translate-x-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
  {
    variants: {
      active: {
        true: "border-primary bg-sidebar-accent text-sidebar-accent-foreground",
        false: "border-transparent text-sidebar-foreground"
      }
    },
    defaultVariants: {
      active: false
    }
  }
);

export interface SidebarMenuButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof sidebarMenuButtonVariants> {}

export function SidebarMenuButton({ className, active, ...props }: SidebarMenuButtonProps) {
  return <button className={cn(sidebarMenuButtonVariants({ active }), className)} {...props} />;
}

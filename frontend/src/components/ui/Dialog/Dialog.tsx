// Bring in the tools for the ui view so this file can work with the rest of the application.
import * as React from "react"
import { cn } from "@/lib/utils"
import { XIcon } from "lucide-react"
import * as DialogPrimitive from "@radix-ui/react-dialog"

import { Button } from "@/components/ui/Button"

// Provide the shared dialog wrapper so pop-up content follows a consistent open and close behavior.
function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  // Show the prepared content and actions so the user can review the information and continue.
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

// Provide the dialog-opening control so the user can open its related content.
function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  // Show the prepared content and actions so the user can review the information and continue.
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

// Place dialog content above the page so it can appear outside the surrounding layout.
function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  // Show the prepared content and actions so the user can review the information and continue.
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

// Provide the dialog-closing control so the user can return to the page.
function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  // Show the prepared content and actions so the user can review the information and continue.
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

// Shade the page behind the dialog so attention stays on the open content.
function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-[80] bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
        className
      )}
      {...props}
    />
  )
}

// Provide the dialog panel and close control so its contents can be viewed and dismissed.
function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  // Keep scoped salon themes on portaled content and restore focus via Radix.
  const [anchor, setAnchor] = React.useState<HTMLSpanElement | null>(null)
  const container = anchor?.closest<HTMLElement>(".customer-site, .clique-workspace, .clique-login") ?? undefined
  return (
    <>
    <span hidden ref={setAnchor} />
    {anchor && <DialogPortal container={container} data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "fixed top-[50%] left-[50%] z-[80] grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] max-h-[calc(100dvh-2rem)] overflow-y-auto gap-4 rounded-lg border border-border bg-background p-6 shadow-lg duration-200 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 sm:max-w-lg",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="absolute top-4 right-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>}
    </>
  )
}

// Group the dialog heading so its title and explanation stay together.
function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  )
}

// Group the dialog actions so the available next steps are easy to find.
function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="outline">Close</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

// Provide the dialog title so its purpose can be identified by readers and assistive tools.
function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  )
}

// Provide the dialog explanation so its purpose and instructions can be read clearly.
function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

// Expose the shared parts of this file so other screens can use the same building blocks.
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}

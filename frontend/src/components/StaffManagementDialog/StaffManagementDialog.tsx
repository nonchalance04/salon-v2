import { useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import "./StaffManagementDialog.css";

export function StaffManagementDialog({ title, description, name, icon, busy, onClose, onRestoreFocus, children }: {
  title: string; description: string; name: string; icon: ReactNode; busy: boolean;
  onClose: () => void; onRestoreFocus: () => void; children: ReactNode;
}) {
  const content = useRef<HTMLDivElement>(null);
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
    <DialogContent ref={content} className="staff-management-dialog" showCloseButton={false}
      onOpenAutoFocus={event => {
        event.preventDefault();
        const target = content.current?.querySelector<HTMLElement>("form input:not(:disabled), form textarea:not(:disabled), form select:not(:disabled)")
          ?? content.current?.querySelector<HTMLElement>(".staff-management-body");
        target?.focus({ preventScroll: true });
      }}
      onCloseAutoFocus={event => { event.preventDefault(); onRestoreFocus(); }}
      onEscapeKeyDown={event => { if (busy) event.preventDefault(); }}
      onInteractOutside={event => event.preventDefault()}>
      <DialogHeader className="staff-management-header">
        <span className="staff-management-icon" aria-hidden="true">{icon}</span>
        <div className="staff-management-heading"><p className="staff-management-eyebrow">YOUR TEAM · {name}</p><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></div>
        <Button type="button" variant="ghost" size="icon" className="staff-management-close" aria-label={`Close ${title.toLowerCase()}`} disabled={busy} onClick={onClose}><X size={19} aria-hidden="true" /></Button>
      </DialogHeader>
      {children}
    </DialogContent>
  </Dialog>;
}

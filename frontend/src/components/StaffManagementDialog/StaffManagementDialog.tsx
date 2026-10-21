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
    <DialogContent ref={content} className="staff-management-dialog tw:[&_fieldset]:min-w-0 tw:[&_label]:text-[#4b4b45] tw:[&_label]:m-0 tw:[&_label]:gap-2
          tw:[&_label]:text-[12px] tw:[&_label]:font-semibold tw:[&_textarea]:min-h-20.5 tw:[&_textarea]:max-h-[220px]
          tw:[&_textarea]:resize-y tw:[&_.error]:[margin:0_0_20px] tw:[&_.error]:text-[12px]
          tw:[&_.error]:[scroll-margin-block:20px] tw:[&_.error_p]:m-0 tw:[&_.error_ul]:pl-4.5 tw:[&_.error_li]:mt-2.5
          tw:[&_.error_li]:[overflow-wrap:anywhere] tw:[&_.error_button]:[margin:8px_0_0_6px]
          tw:[&_.error_button]:text-[11px]" showCloseButton={false}
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
        <span className="staff-management-icon tw:grid tw:place-items-center tw:shrink-0 tw:w-12.5 tw:h-12.5 tw:rounded-[13px]
          tw:[background:#f8f2db] tw:text-[#95771c] tw:down-540:w-10 tw:down-540:h-10" aria-hidden="true">{icon}</span>
        <div className="staff-management-heading tw:flex-1 tw:min-w-0"><p className="staff-management-eyebrow tw:[margin:0_0_7px] tw:text-[#90782b] tw:text-[10px] tw:font-bold tw:tracking-[.09em]
          tw:[overflow-wrap:anywhere]">YOUR TEAM · {name}</p><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></div>
        <Button type="button" variant="ghost" size="icon" className="staff-management-close tw:self-start tw:shrink-0 tw:text-[#77766f]" aria-label={`Close ${title.toLowerCase()}`} disabled={busy} onClick={onClose}><X size={19} aria-hidden="true" /></Button>
      </DialogHeader>
      {children}
    </DialogContent>
  </Dialog>;
}

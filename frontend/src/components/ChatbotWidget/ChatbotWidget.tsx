import { Button } from "@/components/ui/Button";
import { Link } from "react-router";
import { useLayoutEffect, useRef, useState } from "react";
import { Chatbot } from "../Chatbot";

export function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [started, setStarted] = useState(false);
  const panel = useRef<HTMLDialogElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    if (open) {
      panel.current?.show();
      const field = panel.current?.querySelector<HTMLTextAreaElement>("textarea");
      if (field && !field.disabled) field.focus({ preventScroll: true });
      else panel.current?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
    } else {
      panel.current?.close();
    }
  }, [open]);

  function close() {
    setOpen(false);
    launcher.current?.focus({ preventScroll: true });
  }

  return <>
    <dialog ref={panel} id="salon-chat-widget" className="chat-widget tw:[&_:focus-visible]:[outline:3px_solid_#856d25] tw:[&_:focus-visible]:outline-offset-[3px]
          tw:fixed tw:[inset:auto_max(24px,env(safe-area-inset-right))_calc(92px_+_env(safe-area-inset-bottom))_auto]
          tw:z-[60] tw:w-[min(420px,calc(100vw_-_32px))]
          tw:h-[min(660px,calc(100dvh_-_116px_-_env(safe-area-inset-bottom)_-_env(safe-area-inset-top)))] tw:max-w-none
          tw:max-h-none tw:m-0 tw:p-0 tw:[border:1px_solid_#deded5] tw:rounded-[20px] tw:[background:#fff]
          tw:text-[#292a28] tw:overflow-hidden tw:[&[open]]:flex tw:[&[open]]:flex-col
          tw:down-639:right-[max(16px,env(safe-area-inset-right))]
          tw:down-639:bottom-[calc(84px_+_env(safe-area-inset-bottom))]
          tw:down-639:h-[min(660px,calc(100dvh_-_100px_-_env(safe-area-inset-bottom)_-_env(safe-area-inset-top)))]" aria-label="Chat with the salon guide" onCancel={event => { event.preventDefault(); close(); }} onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); close(); } }}>
      <div className="chat-widget-toolbar tw:flex tw:items-center tw:justify-between tw:shrink-0 tw:py-2 tw:px-3.5
          tw:[background:#eeeee7] tw:[border-bottom:1px_solid_#deded5] tw:[&_a]:text-[11px] tw:[&_a]:text-[#665320]
          tw:[&_a]:underline-offset-[3px] tw:[&_button]:grid tw:[&_button]:place-items-center tw:[&_button]:w-9
          tw:[&_button]:h-9 tw:[&_button]:p-0 tw:[&_button]:[border:0] tw:[&_button]:rounded-[50%]
          tw:[&_button]:[background:transparent] tw:[&_button]:text-[#292a28] tw:[&_button]:text-[25px]
          tw:[&_button]:cursor-pointer tw:[&_button:hover]:[background:#deded5]"><Link to="/help">Open full salon guide </Link><Button variant="outline" type="button" aria-label="Close salon guide" onClick={close}>×</Button></div>
      {started && <Chatbot compact active={open} />}
    </dialog>
    <Button variant="outline" ref={launcher} type="button" className="chat-launcher tw:customer:fixed tw:customer:right-[max(24px,env(safe-area-inset-right))]
          tw:customer:bottom-[calc(24px_+_env(safe-area-inset-bottom))] tw:customer:z-[60] tw:customer:flex
          tw:customer:items-center tw:customer:gap-2.5 tw:customer:min-w-14 tw:customer:min-h-14 tw:customer:py-3.5
          tw:customer:px-5 tw:customer:[border:1px_solid_#b89931] tw:customer:rounded-[32px]
          tw:customer:[background:#d3ae30] tw:customer:text-[#282a23] tw:customer:text-[13px] tw:customer:font-semibold
          tw:customer:cursor-pointer tw:customer:hover:[background:#c19c23] tw:focus-visible:[outline:3px_solid_#856d25]
          tw:focus-visible:outline-offset-[3px] tw:down-639:customer:right-[max(16px,env(safe-area-inset-right))]
          tw:down-639:customer:bottom-[calc(16px_+_env(safe-area-inset-bottom))] tw:down-639:customer:w-14
          tw:down-639:customer:p-3.5 tw:down-639:customer:justify-center tw:down-639:[&_>_span]:hidden" aria-label={open ? "Close salon guide" : "Chat for service recommendations"} aria-expanded={open} aria-controls="salon-chat-widget" aria-haspopup="dialog" onClick={() => { if (open) close(); else { setStarted(true); setOpen(true); } }}>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-3 2V11.5a10 10 0 0 1 20 0Z" /><path d="M7 10h8M7 14h5" /></svg>
      <span>Ask your salon guide</span>
    </Button>
  </>;
}

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ReceiptText, Search, Wallet } from "lucide-react";
import "./admin-payments.css";
import type { FormEvent } from "react";
import { SettlementWorkspace } from "../SettlementWorkspace";
import { ConfirmedServices } from "../ConfirmedServices";

type View = "services" | "payments";
export function CashierDashboard({ admin = false, mode, bookingCode, onNavigate, onNavigationStateChange }: {
  admin?: boolean;
  mode: View;
  bookingCode?: string;
  onNavigate: (view: View, code?: string) => void;
  onNavigationStateChange: (state: { busy: boolean; dirty: boolean }) => void;
}) {
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("code")).trim();
    if (code) onNavigate(mode, code);
  }
  const select = (code: string) => onNavigate(mode, code);
  const adminPayments = admin && mode === "payments";
  return (
    <section className={adminPayments ? "admin-payments tw:max-w-[1320px] tw:mx-auto tw:min-w-0 " : undefined} aria-labelledby="cashier-title">
      {adminPayments ? <header className="payment-page-heading tw:[.admin-payments_&]:flex tw:[.admin-payments_&]:items-center
          tw:[.admin-payments_&]:justify-between tw:[.admin-payments_&]:gap-6 tw:[.admin-payments_&]:mb-7
          tw:[.admin-payments_&_h2]:mb-2.5 tw:[.admin-payments_&_h2]:text-[30px]
          tw:down-600:[.admin-payments_&_h2]:text-[25px]"><div><p className="eyebrow public:text-[12px] public:tracking-[0.17em] public:font-bold public:text-[#987b1f]
          public:down-639:text-[11px] tw:text-[11px] tw:tracking-[.18em] tw:font-bold tw:mb-5 tw:[.cashier-main>&]:mb-2.5">PAYMENT DESK</p><h2 id="cashier-title">{bookingCode ? "Process service payment" : "Process payments"}</h2><p className="muted">{bookingCode ? "Review the visit, verify payment, and issue a receipt." : "Collect service payments and keep every receipt within reach."}</p></div><span className="payment-heading-icon tw:grid tw:place-items-center tw:shrink-0 tw:w-13.5 tw:h-13.5 tw:[background:#f5edce]
          tw:text-[#796018] tw:rounded-[14px] tw:down-600:hidden" aria-hidden="true"><Wallet size={26} /></span></header> : <>
      <p className="eyebrow public:text-[12px] public:tracking-[0.17em] public:font-bold public:text-[#987b1f]
          public:down-639:text-[11px] tw:text-[11px] tw:tracking-[.18em] tw:font-bold tw:mb-5 tw:[.cashier-main>&]:mb-2.5">{admin ? "PAYMENT DESK" : "CASHIER DESK"}</p>
      <h2 id="cashier-title">{mode === "services" ? "Manage arrivals & services" : "Service payments & receipts"}</h2>
      <p className="muted">
        {mode === "services"
          ? "Check in customers, record or correct service outcomes, and correct eligible no-shows."
          : "Select a visit ready for payment, verify the money received, and issue or review receipts."}
      </p>
      </>}
      {bookingCode ? (
        <SettlementWorkspace
          key={`${mode}-${bookingCode}`}
          admin={admin}
          mode={mode}
          initialCode={bookingCode}
          onNavigationStateChange={onNavigationStateChange}
          onBack={() => onNavigate(mode)}
          onOpenPayments={code => onNavigate("payments", code)}
          onOpenServices={code => onNavigate("services", code)}
        />
      ) : (
        <>
          {adminPayments && <form className="payment-lookup tw:[.admin-payments_&]:flex tw:[.admin-payments_&]:items-center tw:[.admin-payments_&]:gap-4.5
          tw:[.admin-payments_&]:p-6 tw:[.admin-payments_&]:[background:white] tw:[.admin-payments_&]:rounded-[14px]
          tw:[.admin-payments_&]:mb-7 tw:[&_>_div]:flex-1 tw:[&_h3]:text-[16px] tw:[&_h3]:[margin:0_0_4px]
          tw:[&_p]:text-[13px] tw:[&_p]:m-0 tw:[.admin-payments_&_label]:flex-1
          tw:[.admin-payments_&_label]:max-w-[300px] tw:[.admin-payments_&_label]:m-0
          tw:[.admin-payments_&_button]:h-10.5 tw:down-1150:[.admin-payments_&]:flex-wrap
          tw:down-1150:[.admin-payments_&_>_div]:[flex-basis:calc(100%_-_80px)]
          tw:down-1150:[.admin-payments_&_label]:max-w-none tw:down-600:[.admin-payments_&]:p-4.5
          tw:down-600:[.admin-payments_&]:gap-3.5 tw:down-600:[.admin-payments_&_>_div]:[flex-basis:calc(100%_-_60px)]
          tw:down-600:[.admin-payments_&_label]:[flex-basis:100%] tw:down-600:[.admin-payments_&_button]:w-full" onSubmit={search}><span className="payment-lookup-icon tw:grid tw:place-items-center tw:shrink-0 tw:w-13.5 tw:h-13.5 tw:[background:#f5edce]
          tw:text-[#796018] tw:rounded-[14px] tw:down-600:w-10.5 tw:down-600:h-10.5 tw:down-600:rounded-[10px]" aria-hidden="true"><ReceiptText size={22} /></span><div><h3>Find a payment or receipt</h3><p className="muted">Look up any visit using its booking code.</p></div><label><span className="sr-only tw:absolute tw:w-[1px] tw:h-[1px] tw:overflow-hidden">Booking code</span><span className="payment-code-input tw:relative tw:block tw:[&_svg]:absolute tw:[&_svg]:left-3 tw:[&_svg]:top-[50%]
          tw:[&_svg]:text-[#757575] tw:[&_svg]:pointer-events-none tw:[.admin-payments_&_input]:pl-9.5
          tw:[.admin-payments_&_input]:h-10.5"><Search size={17} aria-hidden="true" /><Input name="code" required maxLength={100} placeholder="Enter booking code" /></span></label><Button variant="outline">Find booking </Button></form>}
          {mode === "services" && <ConfirmedServices admin={admin} arrivalOnly onSelect={select} />}
          <ConfirmedServices paymentDesk={adminPayments} key={mode} admin={admin && mode !== "payments"} manageOutcomes={mode === "services"} onSelect={select} />
          {!adminPayments && <details>
            <summary>{mode === "services" ? "Find an appointment or correct a no-show by booking code" : "Find a payment or receipt by booking code"}</summary>
            <form className="account-form tw:[border:1px_solid_#dce0d8] tw:[background:white] tw:p-7 tw:rounded-[10px] tw:mb-[25px]
          tw:down-760:p-5 cashier-search tw:flex tw:items-end tw:gap-4 tw:mt-6 tw:[&_label]:flex-1 tw:[&_label]:m-0
          tw:down-600:items-stretch tw:down-600:flex-col tw:[.confirmed-services_&]:[margin:16px_0_22px]" onSubmit={search}>
              <label>
                Booking code
                <Input name="code" required maxLength={100} placeholder="Enter booking code" />
              </label>
              <Button variant="default" className="primary tw:[background:#203c34] tw:text-[white] tw:[border-color:#203c34] tw:hover:[background:#31584c]
          tw:[.login-card_&]:w-full tw:[.login-card_&]:mt-1.5">{mode === "services" ? "Find appointment" : "Find payment"}</Button>
            </form>
          </details>}
        </>
      )}
    </section>
  );
}

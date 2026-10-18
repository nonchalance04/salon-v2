import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ArrowRight, ReceiptText, Search, Wallet } from "lucide-react";
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
    <section className={adminPayments ? "admin-payments" : undefined} aria-labelledby="cashier-title">
      {adminPayments ? <header className="payment-page-heading"><div><p className="eyebrow">PAYMENT DESK</p><h2 id="cashier-title">{bookingCode ? "Process service payment" : "Process payments"}</h2><p className="muted">{bookingCode ? "Review the visit, verify payment, and issue a receipt." : "Collect service payments and keep every receipt within reach."}</p></div><span className="payment-heading-icon" aria-hidden="true"><Wallet size={26} /></span></header> : <>
      <p className="eyebrow">{admin ? "PAYMENT DESK" : "CASHIER DESK"}</p>
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
          {adminPayments && <form className="payment-lookup" onSubmit={search}><span className="payment-lookup-icon" aria-hidden="true"><ReceiptText size={22} /></span><div><h3>Find a payment or receipt</h3><p className="muted">Look up any visit using its booking code.</p></div><label><span className="sr-only">Booking code</span><span className="payment-code-input"><Search size={17} aria-hidden="true" /><Input name="code" required maxLength={100} placeholder="Enter booking code" /></span></label><Button variant="outline">Find booking <ArrowRight size={16} aria-hidden="true" /></Button></form>}
          {mode === "services" && <ConfirmedServices admin={admin} arrivalOnly onSelect={select} />}
          <ConfirmedServices paymentDesk={adminPayments} key={mode} admin={admin && mode !== "payments"} manageOutcomes={mode === "services"} onSelect={select} />
          {!adminPayments && <details>
            <summary>{mode === "services" ? "Find an appointment or correct a no-show by booking code" : "Find a payment or receipt by booking code"}</summary>
            <form className="account-form cashier-search" onSubmit={search}>
              <label>
                Booking code
                <Input name="code" required maxLength={100} placeholder="Enter booking code" />
              </label>
              <Button variant="default" className="primary">{mode === "services" ? "Find appointment" : "Find payment"}</Button>
            </form>
          </details>}
        </>
      )}
    </section>
  );
}

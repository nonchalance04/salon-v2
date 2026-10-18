import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
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
  return (
    <section aria-labelledby="cashier-title">
      <p className="eyebrow">{admin ? "PAYMENT DESK" : "CASHIER DESK"}</p>
      <h2 id="cashier-title">{mode === "services" ? "Manage arrivals & services" : "Service payments & receipts"}</h2>
      <p className="muted">
        {mode === "services"
          ? "Check in customers, record or correct service outcomes, and correct eligible no-shows."
          : "Select a visit ready for payment, verify the money received, and issue or review receipts."}
      </p>
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
          {mode === "services" && <ConfirmedServices admin={admin} arrivalOnly onSelect={select} />}
          <ConfirmedServices key={mode} admin={admin && mode !== "payments"} manageOutcomes={mode === "services"} onSelect={select} />
          <details>
            <summary>{mode === "services" ? "Find an appointment or correct a no-show by booking code" : "Find a payment or receipt by booking code"}</summary>
            <form className="account-form cashier-search" onSubmit={search}>
              <label>
                Booking code
                <Input name="code" required maxLength={100} placeholder="Enter booking code" />
              </label>
              <Button variant="default" className="primary">{mode === "services" ? "Find appointment" : "Find payment"}</Button>
            </form>
          </details>
        </>
      )}
    </section>
  );
}

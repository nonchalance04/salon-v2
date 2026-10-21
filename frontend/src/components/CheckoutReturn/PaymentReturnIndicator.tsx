import "./PaymentReturnIndicator.css";

export function PaymentReturnIndicator() {
  return (
    <div className="tw:fixed tw:inset-0 tw:z-[100] tw:flex tw:items-center tw:justify-center tw:bg-[#f3f4f0] tw:p-6" role="status" aria-label="Checking your payment">
      <div className="tw:flex tw:w-full tw:max-w-80 tw:flex-col tw:items-center tw:justify-center tw:gap-5 tw:rounded-[24px] tw:border tw:border-solid tw:border-[#dce5dc] tw:bg-white tw:px-6 tw:py-8 tw:text-center tw:shadow-sm">
      <svg className="payment-return-check tw:h-32 tw:w-32 tw:text-[#16a34a]" viewBox="0 0 96 96" fill="none" aria-hidden="true">
        <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="3" />
        <path className="payment-return-check-line" d="M28 48L42 62L69 34" pathLength="1" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div>
        <p className="tw:m-0 tw:text-lg tw:font-bold tw:text-[#166534]">Checking your payment…</p>
        <p className="tw:mb-0 tw:mt-2 tw:text-sm tw:leading-relaxed tw:text-[#64736b]">Please wait while we update your reservation.</p>
      </div>
      </div>
    </div>
  );
}

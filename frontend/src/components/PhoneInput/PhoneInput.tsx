// Bring in the tools for the phone input view so this file can work with the rest of the application.
import { Input } from "@/components/ui/Input";
import { useState } from "react";
import { philippinePhoneDigits } from "../../utils/phone-number";

// Provide a phone-number field so customer contact details use the expected local format.
export function PhoneInput({ name, value, onChange, required = true }: { required?: boolean; name?: string; value?: string; onChange?: (value: string) => void }) {
  // Remember the current choices and screen status so the page can respond as the user works.
  const [digits, setDigits] = useState("");
  // Show the prepared content and actions so the user can review the information and continue.
  return <span className="phone-field tw:customer:block">
    <span className="phone-input-group tw:customer:flex tw:customer:items-stretch tw:customer:mt-2
          tw:customer:[border:1px_solid_#d5d8cf] tw:customer:rounded-[10px] tw:customer:[background:white]
          tw:customer:overflow-hidden tw:customer:focus-within:[outline:3px_solid_#987b16]
          tw:customer:focus-within:outline-offset-[3px]"><span className="phone-country tw:customer:flex tw:customer:items-center tw:customer:py-0 tw:customer:px-3.5
          tw:customer:[background:#f6f5ef] tw:customer:[border-right:1px_solid_#e0e0d7] tw:customer:text-[14px]
          tw:customer:font-semibold tw:customer:text-[#796020] tw:customer:shrink-0" aria-hidden="true">+63</span><Input
      name={name} type="tel" inputMode="numeric" autoComplete="tel-national" required={required}
      aria-label="Phone number (Philippines, +63)" pattern="[0-9]{10}" minLength={10} maxLength={32}
      placeholder="917 123 4567" value={value ?? digits}
      onChange={event => { const next = philippinePhoneDigits(event.target.value); setDigits(next); onChange?.(next); }}
    /></span>
    <small className="phone-help tw:customer:block tw:customer:text-[11px] tw:customer:font-normal tw:customer:text-[#73756f]
          tw:customer:mt-[7px] tw:customer:leading-[1.6]">Philippines · 10 digits, without the leading 0.</small>
  </span>;
}

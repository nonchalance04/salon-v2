# Admin workspace

The Admin dashboard links to live appointment and payment workflows.

- Today's appointments use the salon's configured calendar date and include all stored statuses.
- Pending appointment fees count `PENDING_PAYMENT` bookings with a live hold across all dates. Expired holds are excluded even before the cleanup worker updates their stored status.
- Unsettled services count `CONFIRMED` bookings whose scheduled start has passed, across all dates. The normal settlement service still validates outcomes and eligibility.
- Payment reconciliation counts successful captures with reconciliation status `REQUIRED`, across all dates. The card opens the existing reconciliation queue.
- Collections use capture time, and finalized commissions use finalization time. Net collections reflect recorded payment adjustments. Carried credits do not create new collections.
- Scheduling shows closures and staff absences overlapping the next seven days, with up to 20 entries of each kind. Review links show bookings on the affected salon dates; these are review lists, not assertions that every booking conflicts.

Appointment filtering runs on the server before cursor pagination. Filters cover inclusive salon dates, status, assigned stylist, customer name or booking code, active payment holds, and unsettled services. Clearing filters restores the full booking list. Appointment details link to service settlement/receipts without requiring another code entry.

Appointment-fee payments are registered automatically after the backend verifies a successful PayMongo payment. The same transaction records the capture, issues the receipt, and confirms the booking if its hold and reservations remain valid. Repeated callbacks do not duplicate these records. Late or additional captures are recorded and flagged for reconciliation without restoring expired bookings. Admin has no manual Appointment fees screen or recording button; payment history, receipts, and reconciliation remain visible in Reports. Old Admin payment-screen links redirect to Appointments, retaining the booking code as a search filter. Cashier service-payment collection is unchanged.

Configuration conflicts continue to be rejected by the existing reservation protection rules. The conflict list now links to the affected booking.

Rescheduling retains the existing customer private-link workflow and original policy checks. This UI update does not add an Admin override or expose private guest credentials.

## Confirmed services

The Admin dashboard and service-outcome workspace automatically list confirmed,
unfinalized bookings across all dates. Choose **Review services** to open the
selected appointment without entering its booking code. The shared list refreshes
every 30 seconds while visible and on tab focus, supports customer-name or booking
code search, and uses bounded pagination. Cashiers see the same confirmed bookings
with **Process payment** actions. Existing role restrictions still govern saving
outcomes, corrections and payment finalization.


### Manage recurring staff schedules

Open **Salon Management → Staff availability → Weekly schedules** to review shifts grouped by weekday. Each shift shows the staff member, local start/end times, effective dates, and active status. Days without configured shifts are shown explicitly.

Use **Add staff schedule** or a shift’s **Edit** button to open the schedule modal. When adding a schedule, choose a staff member and weekday, enter same-day shift hours, and optionally set inclusive effective dates. Blank date bounds are unlimited. The edit modal shows the staff member and weekday as context and allows changes to shift hours and active status. It omits the staff, weekday, and effective-date inputs, preserving those saved values and existing second-level time precision. Inactive staff remain labeled as such. Changes that would invalidate existing reservations are rejected inside the modal, with links to review the affected bookings.

The **Time off** tab records temporary staff absences with start/end times and an optional reason. It blocks availability for that interval without changing the recurring weekly schedule. Existing reservation protections continue to apply. The two tabs share one Staff availability entry; existing schedule and time-off links open the appropriate tab, and browser Back/Forward restores the selected tab.

### Manage staff skills and commission rates

Open **Salon Management → Staff / Stylists → Manage skills** on the staff member’s card. Select the services they can perform and set each service’s commission rate. Save skills applies the selected assignments together. Existing bookings retain their saved commission rates, and removing a skill required by an upcoming reservation is blocked with links to the affected bookings.

Staff / Stylists is the single editing workflow for service assignments. The separate Service assignments (Qualifications) screen has been removed; bookmarks to that screen redirect to Staff / Stylists. Existing assignment records and commission rates are preserved.

### Edit a staff member’s customer profile

Open **Salon Management → Staff / Stylists → Edit public profile** on the staff member’s card. Edit their professional title, bio, HTTPS profile-photo URL, and comma-separated languages. Add up to eight portfolio items (title, HTTPS image URL, caption) and ten client testimonials (display name, rating, text). Use testimonials with the client’s permission. Save public profile publishes the details to newly loaded booking pages. Cancel discards edits; removal of an item takes effect when saved. Clear the photo URL to restore the illustrated avatar.

Names and active status are edited through **Edit details**. The assignments selected in **Manage skills** determine bookable services. Completed-appointment and distinct-client counts are calculated from completed visits with performed services and cannot be typed into the editor. Existing staff start with empty profile content, not sample reviews or statistics.

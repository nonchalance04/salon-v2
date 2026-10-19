# Admin workspace

The Admin dashboard links to live appointment and payment workflows.

- The simplified dashboard contains today's appointment totals, financial summaries, and a three-row preview of today's appointments ordered by scheduled time. It uses the salon's configured calendar date and includes all stored statuses in the total; confirmed, completed, cancelled and no-show counts are shown separately.
- The preview shows customer, booking code, services/stylists, booking status and arrival information. Confirmed rows open service review; other rows open the matching appointment list. **View all** opens appointments filtered to today.
- The unsettled badge counts `CONFIRMED` bookings whose scheduled start has passed across all dates. It opens the existing unsettled filter without restricting dates. Settlement still validates outcomes and eligibility.
- Financial cards show total collections, appointment-fee/service-payment capture breakdowns, net collections after recorded adjustments, and finalized commissions separately. Collections use capture time and commissions use finalization time. Carried credits do not create new collections.
- Refresh reloads all dashboard data; it also refreshes every 30 seconds while visible and on window focus. Failed refreshes retain the last successful snapshot with an explicit error.
- Payment reconciliation, pending-fee cards, quick-action panels and schedule-change panels are not displayed on the dashboard. The existing sidebar is unchanged.

The simplified Appointments tab opens on today’s salon-local date when opened without filters. Its main controls are customer/booking-code search, a single date, status and Clear. Search applies after a short typing pause; date and status changes apply immediately. Clearing filters restores all dates and statuses. Existing date-range, stylist and attention filters from dashboard/configuration links remain supported and visibly identified. Filtering runs on the server before cursor pagination; Previous and Next browse 50-record pages without inventing a total count. Refresh reloads the current page.

The compact table shows time (and date for multi-date lists), customer/booking code, services/stylists, booking status, arrival status and View details. The details dialog preserves customer check-in, eligible no-show marking/correction, and service settlement/receipt links. The waiting queue is no longer duplicated above the appointment list.

Appointment-fee payments are registered automatically after the backend verifies a successful PayMongo payment. The same transaction records the capture, issues the receipt, and confirms the booking if its hold and reservations remain valid. Repeated callbacks do not duplicate these records. Late or additional captures are recorded and flagged for reconciliation without restoring expired bookings. Admin has no manual Appointment fees screen or recording button; payment history, receipts, and reconciliation remain visible in Reports. Old Admin payment-screen links redirect to Appointments, retaining the booking code as a search filter. Cashier service-payment collection is unchanged.

Configuration conflicts continue to be rejected by the existing reservation protection rules. The conflict list now links to the affected booking.

Rescheduling retains the existing customer private-link workflow and original policy checks. This UI update does not add an Admin override or expose private guest credentials.

## Service outcomes & payment

The Admin combined workspace uses a two-column layout: a searchable, paginated
**Awaiting settlement** list on the left and the selected booking, service outcomes,
and payment summary on the right. The list includes confirmed, unfinalized bookings
across all dates and shows their recorded arrival status. Refresh reloads the list
and selected booking; outcome saves and finalization refresh the list as well.
Unsaved outcomes, cash tendered and no-show corrections are protected when switching
bookings or refreshing. Cashier and separate Payments workflows keep their existing layouts.

Select a booking to record Performed or Not performed for each service, then save.
Collection is available only after all outcomes are saved. The summary shows the
verified appointment fee separately: it is not deducted from the full service
charge. Cash collection requires sufficient cash and shows exact change; existing
payment verification, finalization confirmation, revision checks and idempotency
remain in force. Finalized visits are read-only with payment history/receipts
available. All-not-performed visits use the existing Admin-only no-service closure.

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

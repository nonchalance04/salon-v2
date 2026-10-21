// Bring in the tools for salon settings so this file can work with the rest of the application.
import { closurePeriod } from "./closure-period.js";
import { Prisma } from "../../../generated/prisma/client.js";
import { ApiError } from "../../shared/http.js";
import { lockSalon, lockStaff, freshTime } from "../scheduling/coordination.js";
import { coversReservation, overlaps } from "../scheduling/coverage.js";
// Convert the time to the format needed here so salon schedule values are handled consistently.
const time = (value) => new Date(`1970-01-01T${value.length === 5 ? `${value}:00` : value}Z`);
// Convert the date to the format needed here so the selected salon day can be handled consistently.
const date = (value) => value ? new Date(`${value}T00:00:00Z`) : null;
// Prepare the value for the response so saved settings can be read by the browser.
const json = (value) => JSON.parse(JSON.stringify(value));
// Require the requested record to exist so later work does not continue with missing details.
const required = (value) => {
    if (value === null)
        throw new ApiError(404, "NOT_FOUND", "Configuration record not found.");
    return value;
};
// Manage salon settings through shared checks so changes respect existing appointments.
export function createConfigurationService(prisma, timeZone) {
    // Apply a settings change with coordinated database access so bookings cannot use partly updated settings.
    async function write(actorId, mode, staffIds, operation) {
        try {
            // Keep the related database changes together so a failure leaves the earlier records intact.
            return await prisma.$transaction(async (tx) => {
                await tx.$executeRaw `SET LOCAL lock_timeout = '5s'`;
                await lockSalon(tx, mode);
                // Coordinate access to the affected staff so another booking cannot change their reserved time during this step.
                await lockStaff(tx, staffIds);
                await tx.$queryRaw `SELECT id FROM "User" WHERE id = ${actorId}::uuid FOR SHARE`;
                const actor = await tx.user.findUnique({ where: { id: actorId } });
                if (!actor?.isActive)
                    throw new ApiError(401, "UNAUTHORIZED", "Please sign in again.");
                if (actor.role !== "ADMIN")
                    throw new ApiError(403, "FORBIDDEN", "Administrator access is required.");
                return operation(tx);
            }, {
                isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
                timeout: 15_000,
            });
        }
        catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2002")
                    throw new ApiError(409, "CONFIGURATION_EXISTS", "This qualification or policy effective time already exists.");
                if (error.code === "P2003")
                    throw new ApiError(400, "INVALID_REFERENCE", "Select an existing staff member or service.");
                if (error.code === "P2025")
                    throw new ApiError(404, "NOT_FOUND", "Configuration record not found.");
                if (["P2028", "P2034"].includes(error.code) ||
                    String(error.meta?.code) === "55P03") {
                    throw new ApiError(409, "CONFIGURATION_BUSY", "Another change is in progress. Please try again.");
                }
            }
            throw error;
        }
    }
    // Validate only the dimension being changed. Current prices, durations, and
    // commission rates must never replace an existing reservation's snapshots.
    async function protect(tx, where, invalid) {
        const now = await freshTime(tx);
        const reservations = await tx.appointmentService.findMany({
            where: {
                AND: [
                    where,
                    {
                        membershipStatus: "ACTIVE",
                        reservedUntilAt: { gt: now },
                        appointment: {
                            OR: [
                                { status: "CONFIRMED" },
                                { status: "PENDING_PAYMENT", holdExpiresAt: { gte: now } },
                            ],
                        },
                    },
                ],
            },
            include: { appointment: true },
            orderBy: [{ scheduledStartAt: "asc" }, { id: "asc" }],
        });
        const conflicts = reservations.filter(invalid).map((row) => ({
            appointmentId: row.appointmentId,
            bookingCode: row.appointment.bookingCode,
            status: row.appointment.status,
            appointmentServiceId: row.id,
            startAt: row.scheduledStartAt.toISOString(),
            reservedUntilAt: row.reservedUntilAt.toISOString(),
        }));
        if (conflicts.length)
            throw new ApiError(409, "RESERVATION_CONFLICT", "This change would invalidate existing reservations. Resolve the listed appointments first.", { appointments: conflicts });
    }
    return {
        // Collect the saved details together so the caller can work with a consistent picture.
        async snapshot() {
            const [profile, services, staff, qualifications, hours, closures, schedules, unavailability, policies,] = await prisma.$transaction([
                prisma.salonProfile.findFirst(),
                prisma.service.findMany({ orderBy: { name: "asc" } }),
                prisma.staff.findMany({
                    orderBy: [{ firstName: "asc" }, { id: "asc" }],
                }),
                prisma.staffService.findMany({ orderBy: { id: "asc" } }),
                prisma.salonOperatingHour.findMany({ orderBy: { openTime: "asc" } }),
                prisma.salonClosure.findMany({ orderBy: { startsAt: "asc" } }),
                prisma.staffSchedule.findMany({ orderBy: { startTime: "asc" } }),
                prisma.staffUnavailability.findMany({ orderBy: { startsAt: "asc" } }),
                prisma.bookingPolicyVersion.findMany({
                    orderBy: { effectiveFrom: "desc" },
                }),
            ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
            return {
                timeZone,
                profile,
                services,
                staff,
                qualifications,
                hours,
                closures,
                schedules,
                unavailability,
                policies,
            };
        },
        // Select the public booking rules so customers can see the conditions that apply.
        publicPolicy() {
            return prisma.bookingPolicyVersion.findFirst({
                where: { effectiveFrom: { lte: new Date() } },
                orderBy: { effectiveFrom: "desc" },
                select: {
                    version: true,
                    appointmentFeeType: true,
                    appointmentFeeAmount: true,
                    bookingHoldMinutes: true,
                    maxReschedules: true,
                    rescheduleCutoffHours: true,
                    cancellationCutoffHours: true,
                    noShowGraceHours: true,
                    advanceBookingDays: true,
                    minimumBookingLeadMinutes: true,
                },
            });
        },
        // Return public salon details so customer pages can show the current business information.
        async publicSalon() {
            const [profile, hours, closures] = await Promise.all([
                prisma.salonProfile.findFirst({
                    select: { name: true, phone: true, email: true, address: true },
                }),
                prisma.salonOperatingHour.findMany({
                    where: { isActive: true },
                    select: { dayOfWeek: true, openTime: true, closeTime: true },
                    orderBy: { openTime: "asc" },
                }),
                prisma.salonClosure.findMany({
                    where: { endsAt: { gt: new Date() } },
                    select: { startsAt: true, endsAt: true },
                    orderBy: { startsAt: "asc" },
                }),
            ]);
            return { profile, timeZone, hours, closures };
        },
        // Return the active service menu so customers can choose currently offered services.
        publicServices() {
            return prisma.service.findMany({
                where: { isActive: true },
                select: {
                    id: true,
                    name: true,
                    category: true,
                    description: true,
                    price: true,
                    durationMinutes: true,
                },
                orderBy: [{ name: "asc" }, { id: "asc" }],
            });
        },
        // Save salon contact and profile details so public pages show the latest information.
        saveProfile(actorId, input) {
            // Keep the related database changes together so a failure leaves the earlier records intact.
            return write(actorId, "exclusive", [], async (tx) => {
                const profiles = await tx.salonProfile.findMany();
                if (profiles.length > 1)
                    throw new ApiError(409, "PROFILE_INVARIANT", "The database contains more than one salon profile.");
                const before = profiles[0] ?? null;
                const row = before
                    ? await tx.salonProfile.update({
                        where: { id: before.id },
                        data: input,
                    })
                    : await tx.salonProfile.create({ data: input });
                return row;
            });
        },
        // Validate and save the service details so the menu reflects the approved offering.
        saveService(actorId, input, id) {
            // Keep the related database changes together so a failure leaves the earlier records intact.
            return write(actorId, "exclusive", [], async (tx) => {
                const before = id
                    ? required(await tx.service.findUnique({ where: { id } }))
                    : null;
                const row = id
                    ? await tx.service.update({ where: { id }, data: input })
                    : await tx.service.create({ data: input });
                if (before?.isActive && !row.isActive)
                    await protect(tx, { serviceId: row.id }, () => true);
                return row;
            });
        },
        // Validate and save staff details so the salon can maintain its team records.
        saveStaff(actorId, input, id) {
            // Keep the related database changes together so a failure leaves the earlier records intact.
            return write(actorId, "shared", id ? [id] : [], async (tx) => {
                const before = id
                    ? required(await tx.staff.findUnique({ where: { id } }))
                    : null;
                const row = id
                    ? await tx.staff.update({ where: { id }, data: input })
                    : await tx.staff.create({ data: input });
                if (before?.isActive && !row.isActive)
                    await protect(tx, { staffId: row.id }, () => true);
                return row;
            });
        },
        // Handle staff removal with the existing history protections so past appointments remain readable.
        removeStaff(actorId, id) {
            // Keep the related database changes together so a failure leaves the earlier records intact.
            return write(actorId, "shared", [id], async (tx) => {
                const before = required(await tx.staff.findUnique({ where: { id } }));
                if (!before.isActive)
                    return;
                await protect(tx, { staffId: id }, () => true);
                await tx.staff.update({
                    where: { id },
                    data: { isActive: false },
                });
            });
        },
        // Save the public staff profile so customers can review the professional when booking.
        saveStaffPublicProfile(actorId, id, input) {
            // Keep the related database changes together so a failure leaves the earlier records intact.
            return write(actorId, "shared", [id], async (tx) => {
                required(await tx.staff.findUnique({ where: { id } }));
                const row = await tx.staff.update({
                    where: { id },
                    data: { publicProfile: json(input) },
                });
                return row;
            });
        },
        // Save the staff service qualification so bookings use the correct skills and commission rate.
        saveQualification(actorId, input, id) {
            // Keep the related database changes together so a failure leaves the earlier records intact.
            return write(actorId, "shared", [input.staffId], async (tx) => {
                const before = id
                    ? required(await tx.staffService.findUnique({ where: { id } }))
                    : null;
                if (before &&
                    (before.staffId !== input.staffId ||
                        before.serviceId !== input.serviceId)) {
                    throw new ApiError(400, "INVALID_REFERENCE", "Deactivate the old qualification and create a new one to change its staff or service.");
                }
                const row = id
                    ? await tx.staffService.update({ where: { id }, data: input })
                    : await tx.staffService.create({ data: input });
                if (before?.isActive && !row.isActive)
                    await protect(tx, { staffId: row.staffId, serviceId: row.serviceId }, () => true);
                return row;
            });
        },
        // Update the staff skill selection together so service assignments use a consistent set of qualifications.
        saveStaffSkills(actorId, staffId, input) {
            // Keep the related database changes together so a failure leaves the earlier records intact.
            return write(actorId, "shared", [staffId], async (tx) => {
                required(await tx.staff.findUnique({ where: { id: staffId } }));
                const existing = await tx.staffService.findMany({ where: { staffId } });
                const selected = new Map(input.services.map((row) => [row.serviceId, row]));
                const services = await tx.service.findMany({
                    where: { id: { in: [...selected.keys()] } },
                });
                if (services.length !== selected.size)
                    throw new ApiError(400, "INVALID_REFERENCE", "Select existing services.");
                // Existing qualifications for inactive menu items can be retained, but
                // inactive services cannot be newly enabled through the skills editor.
                if (services.some((row) => !row.isActive &&
                    !existing.some((q) => q.serviceId === row.id && q.isActive))) {
                    throw new ApiError(400, "SERVICE_UNAVAILABLE", "Inactive services cannot be newly assigned.");
                }
                const removed = existing.filter((row) => row.isActive && !selected.has(row.serviceId));
                if (removed.length)
                    await protect(tx, { staffId, serviceId: { in: removed.map((row) => row.serviceId) } }, () => true);
                for (const before of removed) {
                    await tx.staffService.update({
                        where: { id: before.id },
                        data: { isActive: false },
                    });
                }
                for (const item of input.services) {
                    const before = existing.find((row) => row.serviceId === item.serviceId) ?? null;
                    if (before?.isActive &&
                        before.commissionRate.equals(item.commissionRate))
                        continue;
                    const data = { staffId, ...item, isActive: true };
                    before
                        ? await tx.staffService.update({ where: { id: before.id }, data })
                        : await tx.staffService.create({ data });
                }
                return tx.staffService.findMany({
                    where: { staffId },
                    orderBy: { id: "asc" },
                });
            });
        },
        // Save an opening-hours period after checking reservations so scheduled visits keep their required coverage.
        saveHours(actorId, input, id) {
            // Keep the related database changes together so a failure leaves the earlier records intact.
            return write(actorId, "exclusive", [], async (tx) => {
                const before = id
                    ? required(await tx.salonOperatingHour.findUnique({ where: { id } }))
                    : null;
                const data = {
                    ...input,
                    openTime: time(input.openTime),
                    closeTime: time(input.closeTime),
                };
                const row = id
                    ? await tx.salonOperatingHour.update({ where: { id }, data })
                    : await tx.salonOperatingHour.create({ data });
                const hours = await tx.salonOperatingHour.findMany({
                    where: { isActive: true },
                });
                const windows = hours.map((h) => ({
                    ...h,
                    startTime: h.openTime,
                    endTime: h.closeTime,
                }));
                if (before)
                    await protect(tx, {}, (r) => !coversReservation(r.scheduledStartAt, r.reservedUntilAt, windows, timeZone));
                return row;
            });
        },
        // Save the whole day of opening hours together so its open and closed periods remain consistent.
        saveDayHours(actorId, dayOfWeek, input) {
            // Keep the related database changes together so a failure leaves the earlier records intact.
            return write(actorId, "exclusive", [], async (tx) => {
                const existing = await tx.salonOperatingHour.findMany({
                    where: { dayOfWeek },
                    orderBy: { openTime: "asc" },
                });
                if (input.periods.some((period) => period.id && !existing.some((row) => row.id === period.id))) {
                    throw new ApiError(400, "INVALID_REFERENCE", "Select opening hours belonging to this day.");
                }
                const requested = input.periods.map((period) => ({
                    ...period,
                    openTime: time(period.openTime),
                    closeTime: time(period.closeTime),
                }));
                if (existing.some((row) => row.isActive)) {
                    const otherHours = await tx.salonOperatingHour.findMany({
                        where: { isActive: true, dayOfWeek: { not: dayOfWeek } },
                    });
                    const windows = [
                        ...otherHours,
                        ...requested.map((period) => ({ ...period, dayOfWeek })),
                    ].map((row) => ({
                        ...row,
                        startTime: row.openTime,
                        endTime: row.closeTime,
                    }));
                    await protect(tx, {}, (row) => !coversReservation(row.scheduledStartAt, row.reservedUntilAt, windows, timeZone));
                }
                const retained = new Set();
                for (const period of requested) {
                    const before = period.id
                        ? existing.find((row) => row.id === period.id)
                        : existing.find((row) => !row.isActive &&
                            !retained.has(row.id) &&
                            row.openTime.getTime() === period.openTime.getTime() &&
                            row.closeTime.getTime() === period.closeTime.getTime());
                    const values = {
                        dayOfWeek,
                        openTime: period.openTime,
                        closeTime: period.closeTime,
                        isActive: true,
                    };
                    if (before?.isActive &&
                        before.openTime.getTime() === values.openTime.getTime() &&
                        before.closeTime.getTime() === values.closeTime.getTime()) {
                        retained.add(before.id);
                        continue;
                    }
                    const row = before
                        ? await tx.salonOperatingHour.update({
                            where: { id: before.id },
                            data: values,
                        })
                        : await tx.salonOperatingHour.create({ data: values });
                    retained.add(row.id);
                }
                for (const before of existing.filter((row) => row.isActive && !retained.has(row.id))) {
                    await tx.salonOperatingHour.update({
                        where: { id: before.id },
                        data: { isActive: false },
                    });
                }
                return tx.salonOperatingHour.findMany({
                    where: { dayOfWeek },
                    orderBy: { openTime: "asc" },
                });
            });
        },
        // Save the staff work period after checking reservations so existing visits still fit the schedule.
        saveSchedule(actorId, input, id) {
            // Keep the related database changes together so a failure leaves the earlier records intact.
            return write(actorId, "shared", [input.staffId], async (tx) => {
                const before = id
                    ? required(await tx.staffSchedule.findUnique({ where: { id } }))
                    : null;
                if (before && before.staffId !== input.staffId)
                    throw new ApiError(400, "INVALID_REFERENCE", "Create a separate schedule for a different staff member.");
                const data = {
                    ...input,
                    startTime: time(input.startTime),
                    endTime: time(input.endTime),
                    effectiveFrom: date(input.effectiveFrom),
                    effectiveTo: date(input.effectiveTo),
                };
                const row = id
                    ? await tx.staffSchedule.update({ where: { id }, data })
                    : await tx.staffSchedule.create({ data });
                const schedules = await tx.staffSchedule.findMany({
                    where: { staffId: input.staffId, isActive: true },
                });
                if (before)
                    await protect(tx, { staffId: input.staffId }, (r) => !coversReservation(r.scheduledStartAt, r.reservedUntilAt, schedules, timeZone));
                return row;
            });
        },
        // Save the salon closure after checking conflicts so customers are not booked during closed time.
        saveClosure(actorId, input, id) {
            // Keep the related database changes together so a failure leaves the earlier records intact.
            return write(actorId, "exclusive", [], async (tx) => {
                if (id)
                    required(await tx.salonClosure.findUnique({ where: { id } }));
                const period = closurePeriod(input, timeZone);
                const row = id
                    ? await tx.salonClosure.update({ where: { id }, data: period })
                    : await tx.salonClosure.create({
                        data: { ...period, createdByUserId: actorId },
                    });
                await protect(tx, {
                    scheduledStartAt: { lt: row.endsAt },
                    reservedUntilAt: { gt: row.startsAt },
                }, (r) => overlaps(r.scheduledStartAt, r.reservedUntilAt, row.startsAt, row.endsAt));
                return row;
            });
        },
        // Save staff time off after checking conflicts so existing visits keep an available professional.
        saveUnavailability(actorId, input, id) {
            // Keep the related database changes together so a failure leaves the earlier records intact.
            return write(actorId, "shared", [input.staffId], async (tx) => {
                const before = id
                    ? required(await tx.staffUnavailability.findUnique({ where: { id } }))
                    : null;
                if (before && before.staffId !== input.staffId)
                    throw new ApiError(400, "INVALID_REFERENCE", "Create a separate unavailable period for a different staff member.");
                const row = id
                    ? await tx.staffUnavailability.update({ where: { id }, data: input })
                    : await tx.staffUnavailability.create({
                        data: { ...input, createdByUserId: actorId },
                    });
                await protect(tx, {
                    staffId: row.staffId,
                    scheduledStartAt: { lt: row.endsAt },
                    reservedUntilAt: { gt: row.startsAt },
                }, () => true);
                return row;
            });
        },
        // Deactivate the closure so its time can reopen while the saved record remains available.
        removeClosure(actorId, id) {
            // Keep the related database changes together so a failure leaves the earlier records intact.
            return write(actorId, "exclusive", [], async (tx) => {
                required(await tx.salonClosure.findUnique({ where: { id } }));
                await tx.salonClosure.delete({ where: { id } });
            });
        },
        // Deactivate the time-off record so the staff member can become available again.
        async removeUnavailability(actorId, id) {
            // Staff assignment is immutable, so this preliminary lookup determines the
            // ordered lock set safely; the row is reloaded after locking.
            const preliminary = required(await prisma.staffUnavailability.findUnique({ where: { id } }));
            // Keep the related database changes together so a failure leaves the earlier records intact.
            return write(actorId, "shared", [preliminary.staffId], async (tx) => {
                required(await tx.staffUnavailability.findUnique({ where: { id } }));
                await tx.staffUnavailability.delete({ where: { id } });
            });
        },
        // Save a new version of the booking rules so earlier appointments retain the rules they used.
        createPolicy(actorId, input) {
            // Keep the related database changes together so a failure leaves the earlier records intact.
            return write(actorId, "exclusive", [], async (tx) => {
                const now = await freshTime(tx);
                if (input.effectiveFrom && input.effectiveFrom < now)
                    throw new ApiError(400, "POLICY_IN_PAST", "New policies must take effect now or in the future.");
                const latest = await tx.bookingPolicyVersion.aggregate({
                    _max: { version: true },
                });
                const row = await tx.bookingPolicyVersion.create({
                    data: {
                        ...input,
                        version: (latest._max.version ?? 0) + 1,
                        effectiveFrom: input.effectiveFrom ?? now,
                        createdByUserId: actorId,
                    },
                });
                return row;
            });
        },
    };
}
//# sourceMappingURL=configuration.service.js.map
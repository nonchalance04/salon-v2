import { Temporal } from "@js-temporal/polyfill";
import { Prisma } from "../../../generated/prisma/client.js";
import { ApiError } from "../../shared/http.js";
import { lockSalon, lockStaff, freshTime } from "../scheduling/coordination.js";
import { calculateAvailability, calculateCalendarAvailability, localDay, policyBounds } from "./availability.engine.js";
import { loadAvailabilityData } from "./availability.data.js";
export function createAvailabilityService(prisma, timeZone) {
    async function query(input, build, rangeEnd) {
        try {
            return await prisma.$transaction(async (tx) => {
                await tx.$executeRaw `SET LOCAL lock_timeout = '5s'`;
                await lockSalon(tx, "shared");
                // Small-salon MVP: lock the existing staff set in universal order, then
                // reload all inputs. This also serializes staff-specific config writes.
                const staffIds = (await tx.staff.findMany({ select: { id: true } })).map(s => s.id);
                await lockStaff(tx, staffIds);
                const now = await freshTime(tx);
                const policy = await tx.bookingPolicyVersion.findFirst({ where: { effectiveFrom: { lte: now } }, orderBy: { effectiveFrom: "desc" } });
                if (!policy)
                    throw new ApiError(503, "POLICY_UNAVAILABLE", "Booking availability is not configured yet.");
                const data = await loadAvailabilityData(tx, input, timeZone, now, policy, { rangeEnd });
                return build(data);
            }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 20_000 });
        }
        catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError &&
                (["P2028", "P2034"].includes(error.code) || String(error.meta?.code) === "55P03")) {
                throw new ApiError(409, "AVAILABILITY_BUSY", "The salon schedule is being updated. Please try again.");
            }
            throw error;
        }
    }
    return {
        async catalog() {
            const staff = await prisma.staff.findMany({ where: { isActive: true }, select: {
                    id: true, firstName: true, lastName: true, publicProfile: true,
                    staffServices: { where: { isActive: true, service: { isActive: true } }, select: { serviceId: true } },
                }, orderBy: { id: "asc" } });
            const counts = await prisma.$queryRaw `
        SELECT s."staffId", COUNT(DISTINCT a.id)::int AS "appointmentsCompleted",
          COUNT(DISTINCT a."customerId")::int AS "clientsServed"
        FROM "AppointmentService" s JOIN "Appointment" a ON a.id = s."appointmentId"
        JOIN "Staff" staff ON staff.id = s."staffId"
        WHERE staff."isActive" = true AND a.status = 'COMPLETED'
          AND s."membershipStatus" = 'ACTIVE' AND s.outcome = 'PERFORMED'
        GROUP BY s."staffId"`;
            const statistics = new Map(counts.map(row => [row.staffId, { appointmentsCompleted: row.appointmentsCompleted, clientsServed: row.clientsServed }]));
            return { timeZone, staff: staff.map(({ staffServices, ...row }) => ({ ...row,
                    statistics: statistics.get(row.id) ?? { appointmentsCompleted: 0, clientsServed: 0 },
                    serviceIds: staffServices.map(q => q.serviceId) })) };
        },
        async search(input) {
            const day = localDay(input.date, timeZone);
            if (input.startAt && (new Date(input.startAt) < day.start || new Date(input.startAt) >= day.end)) {
                throw new ApiError(400, "INVALID_DATE", "The starting time must fall on the selected salon-local date.");
            }
            return query(input, data => ({ date: input.date, timeZone, advisory: true, generatedAt: data.now.toISOString(), policyVersion: data.policy.version,
                ...policyBounds(data), slots: calculateAvailability(input, data) }));
        },
        async calendar(input) {
            const first = Temporal.PlainDate.from(`${input.month}-01`);
            const end = localDay(first.add({ months: 1 }).toString(), timeZone).start;
            return query({ date: first.toString(), services: input.services }, data => ({
                month: input.month, timeZone, advisory: true, generatedAt: data.now.toISOString(),
                dates: calculateCalendarAvailability(input, data),
            }), end);
        },
    };
}
//# sourceMappingURL=availability.service.js.map
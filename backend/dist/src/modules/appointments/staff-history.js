export function historicalStaff(row) {
    return {
        firstName: row.staffFirstNameSnapshot || row.staff?.firstName || "Deleted staff",
        lastName: row.staffFirstNameSnapshot ? (row.staffLastNameSnapshot ?? "") : (row.staff?.lastName ?? ""),
    };
}
//# sourceMappingURL=staff-history.js.map
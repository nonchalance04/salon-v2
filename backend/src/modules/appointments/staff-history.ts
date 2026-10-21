// Describe the information used by appointment bookings so different parts of the application agree on its contents.
type StaffHistory = {
  staffFirstNameSnapshot?: string;
  staffLastNameSnapshot?: string;
  staff?: { firstName: string; lastName: string } | null;
};

// Use saved staff details when needed so older appointments remain understandable after staff records change.
export function historicalStaff(row: StaffHistory) {
  return {
    firstName: row.staffFirstNameSnapshot || row.staff?.firstName || "Deleted staff",
    lastName: row.staffFirstNameSnapshot ? (row.staffLastNameSnapshot ?? "") : (row.staff?.lastName ?? ""),
  };
}

// Describe the information used by appointment filters details so different parts of the application agree on its contents.
export type AppointmentFilters = {
  from?: string;
  to?: string;
  status?: string;
  staffId?: string;
  search?: string;
  attention?: string;
};

// Describe the information used by service selection so different parts of the application agree on its contents.
export type ServiceCategory = { id: string; category: string };
export type ServiceSelection = { key: number; serviceId: string; staffId: string };

// Update the selected services so the booking keeps the intended set of offerings.
export function selectService(
  rows: ServiceSelection[], service: ServiceCategory, catalog: ServiceCategory[], key: number,
): ServiceSelection[] {
  // Repeated clicks never add another instance or discard the chosen professional.
  if (rows.some(row => row.serviceId === service.id)) return rows;
  // Find an earlier choice from the same category so the new service can replace it without adding a duplicate category.
  const category = service.category.trim().toLowerCase();
  const index = rows.findIndex(row => catalog.find(item => item.id === row.serviceId)?.category.trim().toLowerCase() === category);
  const selection = { key, serviceId: service.id, staffId: "" };
  // Add a new category only within the selection limit so the visit stays within the supported number of services.
  if (index < 0) return rows.length < 20 ? [...rows, selection] : rows;
  return rows.map((row, i) => i === index ? selection : row);
}

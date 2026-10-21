// Approved menu groups are also the booking categories. Legacy aliases keep
// older catalogs readable while the category migration is being deployed.
export const menuCategories = [
  "Hair Services", "Hair Color & Styling", "Hair Treatments",
  "Nail Services", "Spa & Relaxation",
] as const;

// Choose the service category so the offering appears under the appropriate menu group.
export function serviceMenuCategory(service: { category: string; description: string | null }): string {
  const label = service.description?.trim();
  const aliases: Record<string, string> = { hair: "Hair Services", nails: "Nail Services" };
  return menuCategories.find(category => category.toLowerCase() === label?.toLowerCase())
    ?? aliases[service.category.trim().toLowerCase()]
    ?? (service.category.trim() || "Other Services");
}

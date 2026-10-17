type Service = { id: string; name: string };

// Only combine variants explicitly listed on the salon menu. Every choice
// retains its catalog ID, price, duration, and staff requirements.
const families = [
  { name: "Ladies Haircut", options: [
    ["Ladies Haircut", "Standard haircut"],
    ["Ladies Haircut w/ Blowdry", "With blowdry"],
    ["Ladies Haircut w/ Shampoo & Conditioner + Blowdry", "With shampoo & conditioner + blowdry"],
  ] },
  { name: "Men's Haircut", options: [
    ["Men's Haircut", "Standard haircut"],
    ["Men's Haircut w/ Blowdry & Shampoo", "With blowdry & shampoo"],
  ] },
  { name: "Kids Haircut", options: [
    ["Kids Haircut", "Standard haircut"],
    ["Kids Haircut w/ Blowdry", "With blowdry"],
  ] },
  { name: "Hair Color", options: [
    ["Hair Color (Short)", "Short hair"],
    ["Hair Color (Medium)", "Medium hair"],
    ["Hair Color (Long)", "Long hair"],
  ] },
  { name: "Rebonding", options: [
    ["Rebonding", "Standard rebonding"],
    ["Rebond with Color", "With color"],
    ["Rebonding with Color & Keratin", "With color & keratin"],
    ["Rebonding with Color & Brazilian", "With color & Brazilian"],
  ] },
  { name: "Foot Spa", options: [
    ["Foot Spa", "Standard foot spa"],
    ["Foot Spa with Pedicure", "With pedicure"],
  ] },
];

export type ServiceFamily<T extends Service> = { key: string; name: string; options: { label: string; service: T }[] };

function findVariant(serviceName: string) {
  const normalized = serviceName.trim().toLowerCase();
  for (const family of families) {
    const order = family.options.findIndex(([name]) => name.toLowerCase() === normalized);
    if (order >= 0) {
      return { familyName: family.name, label: family.options[order][1], order };
    }
  }
  return undefined;
}

export function groupServiceVariants<T extends Service>(services: T[]): ServiceFamily<T>[] {
  const groups = new Map<string, ServiceFamily<T>>();

  for (const service of services) {
    const variant = findVariant(service.name);
    const key = variant ? `family:${variant.familyName}` : `service:${service.id}`;
    let group = groups.get(key);
    if (!group) {
      group = { key, name: variant?.familyName ?? service.name, options: [] };
      groups.set(key, group);
    }
    group.options.push({ label: variant?.label ?? service.name, service });
  }

  // Keep the menu's standard option first, regardless of API sorting.
  for (const group of groups.values()) {
    group.options.sort((a, b) => {
      const firstOrder = findVariant(a.service.name)?.order ?? 0;
      const secondOrder = findVariant(b.service.name)?.order ?? 0;
      return firstOrder - secondOrder;
    });
  }
  return [...groups.values()];
}

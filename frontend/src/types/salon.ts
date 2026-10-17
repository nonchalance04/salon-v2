export type CatalogService = {
  id: string;
  category: string;
  name: string;
  description: string | null;
  price: string;
  durationMinutes: number;
};
export type Salon = {
  profile: {
    name: string;
    address: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  timeZone: string;
};

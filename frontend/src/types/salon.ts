// Describe the information used by salon details so different parts of the application agree on its contents.
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

// Bring in the tools for the public site view so this file can work with the rest of the application.
import type { ReactNode } from "react";
import type { Salon, CatalogService } from "../../types/salon";

// Describe the information used by the public site view so different parts of the application agree on its contents.
export type PublicContext = { salon: Salon | null; services: CatalogService[]; loading: boolean; error: string; catalogStatus: ReactNode };

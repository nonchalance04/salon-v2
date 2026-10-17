import type { ReactNode } from "react";
import type { Salon, CatalogService } from "../../types/salon";

export type PublicContext = { salon: Salon | null; services: CatalogService[]; loading: boolean; error: string; catalogStatus: ReactNode };

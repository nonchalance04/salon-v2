// Bring in the tools for shared screen appearance so this file can work with the rest of the application.
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Combine appearance choices so shared controls receive a consistent final set of styles.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

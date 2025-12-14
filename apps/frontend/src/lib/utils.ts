import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Gets the backend URL dynamically based on the current window location.
 * This allows the app to work when accessed from different devices/networks.
 * 
 * Priority:
 * 1. VITE_APP_BACKEND_URL environment variable (for production)
 * 2. Current window's hostname with port 3000 (for development/sharing)
 * 3. Fallback to localhost:3000
 */
export function getBackendUrl(): string {
  // If explicitly set in env, use that (for production)
  if (import.meta.env.VITE_APP_BACKEND_URL) {
    return import.meta.env.VITE_APP_BACKEND_URL;
  }

  // In browser environment, use current window location
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    return `${protocol}//${hostname}:3000`;
  }

  // Fallback for SSR or other environments
  return 'http://localhost:3000';
}
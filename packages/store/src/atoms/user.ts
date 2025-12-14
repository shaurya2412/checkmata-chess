import { atom, selector } from 'recoil';

/**
 * Gets the backend URL dynamically based on the current window location.
 * This allows the app to work when accessed from different devices/networks.
 */
function getBackendUrl(): string {
  // In browser environment, use current window location
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    return `${protocol}//${hostname}:3000`;
  }

  // Fallback for SSR or other environments
  return 'http://localhost:3000';
}

const BACKEND_URL = getBackendUrl();
export interface User {
  token: string;
  id: string;
  name: string;
}

export const userAtom = atom<User>({
  key: 'user',
  default: selector({
    key: 'user/default',
    get: async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/auth/refresh`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          return data;
        }
      } catch (e) {
        console.error(e);
      }

      return null;
    },
  }),
});

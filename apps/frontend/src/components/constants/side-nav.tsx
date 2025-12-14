import { PuzzleIcon, LogInIcon, Bot ,LineChart ,Briefcase, LogOutIcon, SettingsIcon, BrainIcon } from 'lucide-react';
import { getBackendUrl } from '../../lib/utils';

const BACKEND_URL = getBackendUrl();
export const UpperNavItems = [
  {
    title: 'Play',
    icon: PuzzleIcon,
    href: '/game/random',
    color: 'text-green-500',
  },
    {
    title: 'PlayBot',
    icon: Bot ,
    href: '/bot-difficulty',
    color: 'text-sky-500',
  },
  {
    title: 'Analysis',
    icon: LineChart,
    href: '/analysis',
    color: 'text-blue-500',
  },
  {
    title: 'Openings',
    icon: Briefcase,
    href: '/openings',
    color: 'text-purple-400',
  },
];

export const LowerNavItems = [
  {
    title: 'Login',
    icon: LogInIcon,
    href: '/login',
    color: 'text-green-500',
  },
  {
    title: 'Logout',
    icon: LogOutIcon,
    href: `${BACKEND_URL}/auth/logout`,
    color: 'text-green-500',
  },
  {
    title: 'Settings',
    icon: SettingsIcon,
    href: '/settings',
    color: 'text-green-500',
  },
];

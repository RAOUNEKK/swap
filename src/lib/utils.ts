import type { SkillCategory } from '@/types';
import {
  Camera, Video, Palette, PenTool, Brush, Film, Box, Coffee, PenLine,
  Code, Smartphone, Terminal, Braces, BarChart3, Brain, Server, Shield,
  Link, Gamepad2, Globe, Music, Mic2, Sliders, Disc,
  Megaphone, Mic, Search, Calculator, Table, ClipboardList, TrendingUp,
  Rocket, Handshake, Flower2, ChefHat, Sparkles, Dumbbell, Apple,
  Sprout, Wine, Sofa, Shirt, BookOpen, type LucideIcon,
} from 'lucide-react';

export const ICON_MAP: Record<string, LucideIcon> = {
  Camera, Video, Palette, PenTool, Brush, Film, Box, Coffee, PenLine,
  Code, Smartphone, Terminal, Braces, BarChart3, Brain, Server, Shield,
  Link, Gamepad2, Globe, Music, Mic2, Sliders, Disc,
  Megaphone, Mic, Search, Calculator, Table, ClipboardList, TrendingUp,
  Rocket, Handshake, Flower2, ChefHat, Sparkles, Dumbbell, Apple,
  Sprout, Wine, Sofa, Shirt, BookOpen,
};

export function getIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? BookOpen;
}

export function categoryColor(category: SkillCategory): string {
  const map: Record<SkillCategory, string> = {
    Creative: 'sun',
    Technology: 'cyan',
    Languages: 'violet',
    Music: 'ink',
    Business: 'coral',
    Lifestyle: 'ink',
  };
  return map[category];
}

export function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function formatTime(hour: number, lang: 'en' | 'ar' = 'en'): string {
  if (hour === 0 || hour === 24) return lang === 'ar' ? '12 ص' : '12 AM';
  if (hour === 12) return lang === 'ar' ? '12 م' : '12 PM';
  if (hour < 12) return lang === 'ar' ? `${hour} ص` : `${hour} AM`;
  return lang === 'ar' ? `${hour - 12} م` : `${hour - 12} PM`;
}

export function formatDate(iso: string | null, lang: 'en' | 'ar' = 'en'): string {
  if (!iso) return '';
  const locale = lang === 'ar' ? 'ar-EG' : 'en-US';
  return new Date(iso).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(iso: string | null, lang: 'en' | 'ar' = 'en'): string {
  if (!iso) return '';
  const locale = lang === 'ar' ? 'ar-EG' : 'en-US';
  return new Date(iso).toLocaleString(locale, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function timeAgo(iso: string, lang: 'en' | 'ar' = 'en'): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (lang === 'ar') {
    if (mins < 1) return 'الآن';
    if (mins < 60) return `منذ ${mins} د`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `منذ ${hours} س`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `منذ ${days} ي`;
    return formatDate(iso, lang);
  }
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso, lang);
}

export function hoursFromMinutes(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100;
}

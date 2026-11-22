import React from 'react';
import {
  Landmark,
  Atom,
  Brain,
  Palette,
  Scale,
  TrendingUp,
  Newspaper,
  Bot,
  Rocket,
  BookOpen,
  Megaphone,
  Compass,
  LineChart,
  Heart,
  Zap,
  EyeOff,
  Laugh,
  Minimize2,
  Infinity,
  MessagesSquare,
  Globe,
  GitFork,
  Flame,
  Mountain,
  HelpCircle,
  User,
  Sparkles,
  Waves,
  Circle,
  Users,
  Shield,
  Fingerprint,
  Briefcase,
  Layers,
  HeartHandshake,
  Crosshair,
  Sun,
  Moon,
  LucideIcon
} from 'lucide-react';

export interface CategoryIconConfig {
  icon: LucideIcon;
  colorClass: string;
}

export const FIELD_ICONS: Record<string, CategoryIconConfig> = {
  'Politics': { icon: Landmark, colorClass: 'text-rose-400' },
  'Science/Tech': { icon: Atom, colorClass: 'text-emerald-400' },
  'Philosophy/Psychology': { icon: Brain, colorClass: 'text-purple-400' },
  'Art/Culture': { icon: Palette, colorClass: 'text-pink-400' },
  'Law/Justice': { icon: Scale, colorClass: 'text-amber-400' },
  'Economics/Finance': { icon: TrendingUp, colorClass: 'text-green-400' },
  'Media/Journalism': { icon: Newspaper, colorClass: 'text-blue-400' },
  'AI/Future Tech': { icon: Bot, colorClass: 'text-cyan-400' },
  'Space/Astronomy': { icon: Rocket, colorClass: 'text-violet-400' },
  'Literature/Writing': { icon: BookOpen, colorClass: 'text-yellow-400' },
  'Activism/Protest Culture': { icon: Megaphone, colorClass: 'text-orange-400' }
};

export const BELIEF_ICONS: Record<string, CategoryIconConfig> = {
  'Libertarian': { icon: Compass, colorClass: 'text-amber-400' },
  'Analyst': { icon: LineChart, colorClass: 'text-blue-400' },
  'Humanist': { icon: Heart, colorClass: 'text-rose-400' },
  'Radical': { icon: Zap, colorClass: 'text-yellow-400' },
  'Low-Profile': { icon: EyeOff, colorClass: 'text-slate-400' },
  'Satirical': { icon: Laugh, colorClass: 'text-orange-400' },
  'Minimalist': { icon: Minimize2, colorClass: 'text-teal-400' },
  'Nihilist': { icon: Infinity, colorClass: 'text-violet-400' },
  'Debater': { icon: MessagesSquare, colorClass: 'text-sky-400' },
  'Expat Voice': { icon: Globe, colorClass: 'text-emerald-400' },
  'Centrist': { icon: GitFork, colorClass: 'text-indigo-400' },
  'Anarchist': { icon: Flame, colorClass: 'text-red-500' },
  'Stoic': { icon: Mountain, colorClass: 'text-slate-300' },
  'Skeptic': { icon: HelpCircle, colorClass: 'text-fuchsia-400' }
};

export const GENDER_ICONS: Record<string, CategoryIconConfig> = {
  'Woman': { icon: User, colorClass: 'text-pink-400' },
  'Man': { icon: User, colorClass: 'text-blue-400' },
  'Non-binary': { icon: Sparkles, colorClass: 'text-yellow-400' },
  'Trans woman': { icon: Heart, colorClass: 'text-pink-400' },
  'Trans man': { icon: Heart, colorClass: 'text-blue-400' },
  'Genderfluid': { icon: Waves, colorClass: 'text-teal-400' },
  'Agender': { icon: Circle, colorClass: 'text-slate-400' },
  'Genderqueer': { icon: Sparkles, colorClass: 'text-purple-400' },
  'Bigender': { icon: Users, colorClass: 'text-indigo-400' },
  'Demigender': { icon: Shield, colorClass: 'text-cyan-400' },
  'Transfeminine': { icon: Sparkles, colorClass: 'text-rose-400' },
  'Transmasculine': { icon: Sparkles, colorClass: 'text-sky-400' },
  'Questioning': { icon: HelpCircle, colorClass: 'text-amber-400' },
  'Another identity': { icon: Fingerprint, colorClass: 'text-emerald-400' },
  'Prefer not to say': { icon: EyeOff, colorClass: 'text-slate-500' }
};

export const SEXUAL_ORIENTATION_ICONS: Record<string, CategoryIconConfig> = {
  'Heterosexual / Straight': { icon: Heart, colorClass: 'text-slate-300' },
  'Gay': { icon: Flame, colorClass: 'text-sky-400' },
  'Lesbian': { icon: Heart, colorClass: 'text-rose-400' },
  'Bisexual': { icon: Sparkles, colorClass: 'text-purple-400' },
  'Pansexual': { icon: Sun, colorClass: 'text-amber-400' },
  'Omnisexual': { icon: Infinity, colorClass: 'text-fuchsia-400' },
  'Polysexual': { icon: Layers, colorClass: 'text-emerald-400' },
  'Queer': { icon: Sparkles, colorClass: 'text-violet-400' },
  'Asexual': { icon: Circle, colorClass: 'text-slate-400' },
  'Demisexual': { icon: Shield, colorClass: 'text-indigo-400' },
  'Graysexual': { icon: Moon, colorClass: 'text-slate-300' },
  'Androsexual': { icon: User, colorClass: 'text-blue-400' },
  'Gynesexual': { icon: User, colorClass: 'text-pink-400' },
  'Skoliosexual': { icon: Zap, colorClass: 'text-yellow-400' },
  'Cupiosexual': { icon: Crosshair, colorClass: 'text-rose-400' },
  'Fraysexual': { icon: Zap, colorClass: 'text-cyan-400' },
  'Lithosexual / Akoisexual': { icon: HeartHandshake, colorClass: 'text-orange-400' },
  'Pomosexual': { icon: HelpCircle, colorClass: 'text-teal-400' },
  'Questioning': { icon: HelpCircle, colorClass: 'text-amber-400' },
  'Another identity': { icon: Fingerprint, colorClass: 'text-emerald-400' }
};

export function getFieldIconConfig(fieldName?: string | null): CategoryIconConfig {
  if (!fieldName) return { icon: Briefcase, colorClass: 'text-cyan-400' };
  const found = Object.keys(FIELD_ICONS).find(k => k.toLowerCase() === fieldName.toLowerCase() || fieldName.toLowerCase().includes(k.toLowerCase()));
  return found ? FIELD_ICONS[found] : { icon: Briefcase, colorClass: 'text-cyan-400' };
}

export function getBeliefIconConfig(beliefName?: string | null): CategoryIconConfig {
  if (!beliefName) return { icon: Sparkles, colorClass: 'text-indigo-400' };
  const found = Object.keys(BELIEF_ICONS).find(k => k.toLowerCase() === beliefName.toLowerCase() || beliefName.toLowerCase().includes(k.toLowerCase()));
  return found ? BELIEF_ICONS[found] : { icon: Sparkles, colorClass: 'text-indigo-400' };
}

export function getGenderIconConfig(genderName?: string | null): CategoryIconConfig {
  if (!genderName) return { icon: Fingerprint, colorClass: 'text-slate-400' };
  const found = Object.keys(GENDER_ICONS).find(k => k.toLowerCase() === genderName.toLowerCase() || genderName.toLowerCase().includes(k.toLowerCase()));
  return found ? GENDER_ICONS[found] : { icon: Fingerprint, colorClass: 'text-slate-400' };
}

export function getOrientationIconConfig(orientationName?: string | null): CategoryIconConfig {
  if (!orientationName) return { icon: Heart, colorClass: 'text-rose-400' };
  const found = Object.keys(SEXUAL_ORIENTATION_ICONS).find(k => k.toLowerCase() === orientationName.toLowerCase() || orientationName.toLowerCase().includes(k.toLowerCase()));
  return found ? SEXUAL_ORIENTATION_ICONS[found] : { icon: Heart, colorClass: 'text-rose-400' };
}

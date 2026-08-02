import { MdCampaign } from 'react-icons/md';
import { Trees, Cpu, Scale, BookOpen, HeartPulse, TrendingUp, Shield, FlaskConical, Waves, Lock, Library, Code } from 'lucide-react';

export const getCampaignIcon = (campaign: { title: string; category: string }) => {
  const title = campaign.title.toLowerCase();
  if (title.includes('tree')) return Trees;
  if (title.includes('ocean')) return Waves;
  if (title.includes('open source')) return Code;
  if (title.includes('privacy')) return Lock;
  if (title.includes('librar')) return Library;

  switch (campaign.category) {
    case 'Environment':
      return Trees;
    case 'Technology':
      return Cpu;
    case 'Human Rights':
      return Scale;
    case 'Education':
      return BookOpen;
    case 'Health':
      return HeartPulse;
    case 'Economy':
      return TrendingUp;
    case 'Privacy':
      return Shield;
    case 'Science':
      return FlaskConical;
    default:
      return MdCampaign;
  }
};

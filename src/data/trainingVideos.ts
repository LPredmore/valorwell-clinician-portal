import { LucideIcon, Calendar, LayoutDashboard, UserCheck, FileText, Clipboard, Video, User } from 'lucide-react';

export interface TrainingVideo {
  id: string;
  title: string;
  description: string;
  category: 'Dashboard & Navigation' | 'Client Management' | 'Session Management';
  googleDriveId: string;
  embedUrl: string;
  icon: LucideIcon;
}

export const trainingVideos: TrainingVideo[] = [
  // Dashboard & Navigation
  {
    id: 'dashboard',
    title: 'Dashboard',
    description: 'Learn how to navigate and use the main dashboard',
    category: 'Dashboard & Navigation',
    googleDriveId: '1tVhKeaRwbMZTMzfoepcxqD60m9GcX4Mm',
    embedUrl: 'https://drive.google.com/file/d/1tVhKeaRwbMZTMzfoepcxqD60m9GcX4Mm/preview',
    icon: LayoutDashboard,
  },
  {
    id: 'profile',
    title: 'Your Profile',
    description: 'Setting up and managing your profile information',
    category: 'Dashboard & Navigation',
    googleDriveId: '139uX9UyTaZPmx43PL1ms0GwsA0UcFGCd',
    embedUrl: 'https://drive.google.com/file/d/139uX9UyTaZPmx43PL1ms0GwsA0UcFGCd/preview',
    icon: User,
  },
  
  // Client Management
  {
    id: 'my-clients',
    title: 'My Clients',
    description: 'Managing your client list and client information',
    category: 'Client Management',
    googleDriveId: '1lbIUa-BdwPwnoqWRImtjJIfCQcnEi4Kb',
    embedUrl: 'https://drive.google.com/file/d/1lbIUa-BdwPwnoqWRImtjJIfCQcnEi4Kb/preview',
    icon: UserCheck,
  },
  {
    id: 'session-notes',
    title: 'Session Notes',
    description: 'Creating and managing session notes for your clients',
    category: 'Client Management',
    googleDriveId: '1TtXxIFh_4jpujhL-MIGMtH4oQGEIiCv1',
    embedUrl: 'https://drive.google.com/file/d/1TtXxIFh_4jpujhL-MIGMtH4oQGEIiCv1/preview',
    icon: FileText,
  },
  {
    id: 'treatment-plans',
    title: 'Treatment Plans',
    description: 'Developing and managing treatment plans',
    category: 'Client Management',
    googleDriveId: '1pb7mv1yrgo9byp_lrdbspc5n3fDDSN20',
    embedUrl: 'https://drive.google.com/file/d/1pb7mv1yrgo9byp_lrdbspc5n3fDDSN20/preview',
    icon: Clipboard,
  },
  
  // Session Management
  {
    id: 'starting-session',
    title: 'Starting a Session',
    description: 'How to initiate and conduct therapy sessions',
    category: 'Session Management',
    googleDriveId: '1H02hP4Z3rLOt75i4tBwaliKJi4qeqVDu',
    embedUrl: 'https://drive.google.com/file/d/1H02hP4Z3rLOt75i4tBwaliKJi4qeqVDu/preview',
    icon: Video,
  },
  {
    id: 'calendar',
    title: 'Calendar',
    description: 'Managing appointments and scheduling',
    category: 'Session Management',
    googleDriveId: '1Ur0DeSKBRhjE_XNckn82OrRfnbd6KYJK',
    embedUrl: 'https://drive.google.com/file/d/1Ur0DeSKBRhjE_XNckn82OrRfnbd6KYJK/preview',
    icon: Calendar,
  },
];

export const getVideosByCategory = (category: TrainingVideo['category']) => {
  return trainingVideos.filter(video => video.category === category);
};

export const getAllCategories = (): TrainingVideo['category'][] => {
  return ['Dashboard & Navigation', 'Client Management', 'Session Management'];
};
import { Award, ShieldCheck, Building2 } from 'lucide-react';
import HubPage, { HubCard } from '../components/HubPage';

const cards: HubCard[] = [
  {
    icon: Award,
    iconColor: 'text-rose-600',
    iconBg: 'bg-rose-50',
    title: 'Card Grading',
    description: 'Manage grading submissions to PSA, BGS, SGC, and other services. Track submission status, turnaround times, and grading results.',
    tags: ['Submissions', 'Status Tracking', 'Results'],
    route: '/grading',
    actionButton: { label: 'New Submission', route: '/grading' },
  },
  {
    icon: ShieldCheck,
    iconColor: 'text-teal-600',
    iconBg: 'bg-teal-50',
    title: 'Authentication',
    description: 'Submit items for authentication verification. Track authentication requests and manage certified item records.',
    tags: ['Verification', 'Certificates', 'Status'],
    route: '/authentication',
  },
  {
    icon: Building2,
    iconColor: 'text-slate-600',
    iconBg: 'bg-slate-100',
    title: 'Submitters',
    description: 'Manage grading and authentication service accounts. Track submitter numbers, membership tiers, and submission history.',
    tags: ['Accounts', 'Service Tiers', 'History'],
    route: '/submitters',
    actionButton: { label: 'Add Submitter', route: '/submitters' },
  },
];

export default function ServicesHub() {
  return (
    <HubPage
      title="Services"
      subtitle="Manage card grading, authentication, and service provider accounts"
      breadcrumb="Services"
      cards={cards}
    />
  );
}

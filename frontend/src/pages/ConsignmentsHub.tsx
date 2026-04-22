import { Users, Send } from 'lucide-react';
import HubPage, { HubCard } from '../components/HubPage';

const cards: HubCard[] = [
  {
    icon: Users,
    iconColor: 'text-violet-600',
    iconBg: 'bg-violet-50',
    title: 'Consigners',
    description: 'Manage consigner profiles, contact information, and commission rates. Track active consignment relationships and payment history.',
    tags: ['Profiles', 'Commissions', 'Payments'],
    route: '/consigners',
    actionButton: { label: 'Add Consigner', route: '/consigners' },
  },
  {
    icon: Send,
    iconColor: 'text-cyan-600',
    iconBg: 'bg-cyan-50',
    title: 'Consignments',
    description: 'Track consigned inventory from intake to sale. Monitor consignment status, pricing, and settlement across all consigners.',
    tags: ['Intake', 'Status', 'Settlements'],
    route: '/consignments',
    actionButton: { label: 'New Consignment', route: '/consignments' },
  },
];

export default function ConsignmentsHub() {
  return (
    <HubPage
      title="Consignments"
      subtitle="Manage consigners and track consigned inventory"
      breadcrumb="Consignments"
      cards={cards}
    />
  );
}

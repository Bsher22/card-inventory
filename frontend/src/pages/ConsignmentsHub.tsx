import { Users, Send, Store, FileSignature, BadgeDollarSign } from 'lucide-react';
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
  {
    icon: Store,
    iconColor: 'text-emerald-600',
    iconBg: 'bg-emerald-50',
    title: 'eBay Consignment Clients',
    description: 'Clients whose items IDGAS sells on eBay on their behalf. Track profiles, default commission, and lifetime payouts.',
    tags: ['Clients', 'Contact', 'Commission'],
    route: '/ebay-consigners',
    actionButton: { label: 'Add Client', route: '/ebay-consigners' },
  },
  {
    icon: FileSignature,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-50',
    title: 'eBay Consignment Agreements',
    description: 'Build signed agreements listing items, minimum prices, and commission. Generate the signed PDF for each client.',
    tags: ['Agreements', 'Min Prices', 'PDF'],
    route: '/ebay-consignments',
    actionButton: { label: 'New Agreement', route: '/ebay-consignments' },
  },
  {
    icon: BadgeDollarSign,
    iconColor: 'text-green-600',
    iconBg: 'bg-green-50',
    title: 'Monthly Payouts',
    description: 'Generate monthly statements showing items sold and net payout owed to each client. Download PDF statements.',
    tags: ['Statements', 'Payouts', 'PDF'],
    route: '/ebay-payouts',
    actionButton: { label: 'Generate Statement', route: '/ebay-payouts' },
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

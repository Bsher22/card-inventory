import { ShoppingCart, DollarSign, Store } from 'lucide-react';
import HubPage, { HubCard } from '../components/HubPage';

const cards: HubCard[] = [
  {
    icon: ShoppingCart,
    iconColor: 'text-purple-600',
    iconBg: 'bg-purple-50',
    title: 'Purchases',
    description: 'Record and track card purchases across all channels. Monitor spending, cost basis, and acquisition history for your collection.',
    tags: ['Buy History', 'Cost Basis', 'Channels'],
    route: '/purchases',
    actionButton: { label: 'Add Purchase', route: '/purchases' },
  },
  {
    icon: DollarSign,
    iconColor: 'text-green-600',
    iconBg: 'bg-green-50',
    title: 'Sales',
    description: 'Track card sales and revenue across all platforms. Monitor profit margins, sales velocity, and platform performance.',
    tags: ['Revenue', 'Profit', 'Platforms'],
    route: '/sales',
    actionButton: { label: 'Record Sale', route: '/sales' },
  },
  {
    icon: Store,
    iconColor: 'text-orange-600',
    iconBg: 'bg-orange-50',
    title: 'eBay Import',
    description: 'Import sales data directly from your eBay account. Automatically match listings to inventory and reconcile transactions.',
    tags: ['eBay Sync', 'Auto-Match', 'Reconciliation'],
    route: '/sales/ebay-import',
  },
];

export default function CommerceHub() {
  return (
    <HubPage
      title="Commerce"
      subtitle="Track purchases, sales, and eBay imports across all channels"
      breadcrumb="Commerce"
      cards={cards}
    />
  );
}

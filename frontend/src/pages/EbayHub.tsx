// src/pages/EbayHub.tsx
// Landing page for the eBay Consignment business line.

import { Link } from 'react-router-dom';
import { Users, Boxes, FileSignature, BadgeDollarSign } from 'lucide-react';
import HubPage, { HubCard } from '../components/HubPage';

const cards: HubCard[] = [
  {
    icon: Users,
    iconColor: 'text-emerald-600',
    iconBg: 'bg-emerald-50',
    title: 'eBay Consigner Clients',
    description:
      'People whose items IDGAS sells on eBay. Manage contact info, default commission, and lifetime payout history per client.',
    tags: ['Clients', 'Contact', 'Commission'],
    route: '/ebay-consigners',
    actionButton: { label: 'Add Client', route: '/ebay-consigners' },
  },
  {
    icon: Boxes,
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-50',
    title: 'eBay Consignment Inventory',
    description:
      'Every item we are currently consigning, across all clients and agreements. Filter by status, search by title, and jump to the parent agreement.',
    tags: ['All Items', 'Status', 'Search'],
    route: '/ebay-inventory',
    actionButton: { label: 'View Inventory', route: '/ebay-inventory' },
  },
  {
    icon: FileSignature,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-50',
    title: 'eBay Consignment Agreements',
    description:
      'Build and sign agreements that list items, minimum prices, and our commission. Generate the signed PDF and track status from draft to completed.',
    tags: ['Agreements', 'Signing', 'PDF'],
    route: '/ebay-consignments',
    actionButton: { label: 'New Agreement', route: '/ebay-consignments' },
  },
];

export default function EbayHub() {
  return (
    <div>
      <HubPage
        title="eBay Consign"
        subtitle="Manage clients, inventory, and agreements for items we sell on eBay"
        breadcrumb="eBay Consign"
        cards={cards}
      />
      {/* Secondary action - payouts live here too but not as a primary card */}
      <div className="px-8 -mt-2">
        <Link
          to="/ebay-payouts"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
        >
          <BadgeDollarSign size={14} />
          Generate or review monthly payouts →
        </Link>
      </div>
    </div>
  );
}

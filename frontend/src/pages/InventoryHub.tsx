import { Package, FileSpreadsheet, Upload, BarChart3, Trophy } from 'lucide-react';
import HubPage, { HubCard } from '../components/HubPage';

const cards: HubCard[] = [
  {
    icon: Package,
    iconColor: 'text-indigo-600',
    iconBg: 'bg-indigo-50',
    title: 'Product Lines',
    description: 'Manage card product lines by brand, year, and sport. Track checklist completion and card counts across all product releases.',
    tags: ['Brands', 'Years', 'Completion'],
    route: '/product-lines',
  },
  {
    icon: FileSpreadsheet,
    iconColor: 'text-emerald-600',
    iconBg: 'bg-emerald-50',
    title: 'Checklists',
    description: 'Browse and manage card checklists for each product line. View card numbers, players, and variants in the master checklist.',
    tags: ['Card Lists', 'Variants', 'Players'],
    route: '/checklists',
  },
  {
    icon: Upload,
    iconColor: 'text-orange-600',
    iconBg: 'bg-orange-50',
    title: 'Upload Checklist',
    description: 'Import new checklists from CSV or spreadsheet files. Map columns and bulk-load card data into the system.',
    tags: ['CSV Import', 'Bulk Load'],
    route: '/upload',
    actionButton: { label: 'Upload New', route: '/upload' },
  },
  {
    icon: BarChart3,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-50',
    title: 'Inventory',
    description: 'View and manage your complete card inventory. Track quantities, conditions, and locations across your entire collection.',
    tags: ['Stock', 'Conditions', 'Locations'],
    route: '/inventory',
  },
  {
    icon: Trophy,
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-50',
    title: 'Memorabilia',
    description: 'Track standalone memorabilia items like signed baseballs, jerseys, and other collectibles outside of card products.',
    tags: ['Autographs', 'Game-Used', 'Collectibles'],
    route: '/memorabilia',
    actionButton: { label: 'Add Item', route: '/memorabilia' },
  },
];

export default function InventoryHub() {
  return (
    <HubPage
      title="Inventory"
      subtitle="Manage product lines, checklists, card inventory, and memorabilia"
      breadcrumb="Inventory"
      cards={cards}
    />
  );
}

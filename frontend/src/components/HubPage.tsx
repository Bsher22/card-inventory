import { Link } from 'react-router-dom';
import { Home, ChevronRight, LucideIcon } from 'lucide-react';

export interface HubCard {
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  title: string;
  description: string;
  tags: string[];
  route: string;
  actionButton?: {
    label: string;
    route: string;
  };
}

interface HubPageProps {
  title: string;
  subtitle: string;
  breadcrumb: string;
  cards: HubCard[];
}

export default function HubPage({ title, subtitle, breadcrumb, cards }: HubPageProps) {
  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-2">
        <Link to="/" className="hover:text-gray-700 flex items-center gap-1">
          <Home size={14} />
        </Link>
        <ChevronRight size={14} />
        <span className="text-gray-700 font-medium">{breadcrumb}</span>
      </nav>

      {/* Header */}
      <h1 className="text-3xl font-bold text-gray-900 mb-1">{title}</h1>
      <p className="text-gray-500 mb-6">{subtitle}</p>
      <div className="border-b-2 border-amber-400 mb-8 w-full" />

      {/* Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => (
          <Link
            key={card.route}
            to={card.route}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow group"
          >
            {/* Icon + Title */}
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.iconBg || 'bg-blue-50'}`}>
                <card.icon size={20} className={card.iconColor || 'text-blue-600'} />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                {card.title}
              </h2>
            </div>

            {/* Description */}
            <p className="text-sm text-gray-500 mb-4 leading-relaxed">{card.description}</p>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-3">
              {card.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 text-xs font-medium bg-gray-50 text-gray-600 rounded-full border border-gray-200"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Action Button */}
            {card.actionButton && (
              <Link
                to={card.actionButton.route}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 mt-1"
              >
                <span className="w-5 h-5 rounded-full border border-blue-300 flex items-center justify-center text-xs">+</span>
                {card.actionButton.label}
              </Link>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { ChevronDown, ChevronRight, Pen, Award, Package } from 'lucide-react';
import type { PlayerInventoryGroup } from '../types';

interface Props {
  group: PlayerInventoryGroup;
}

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined || value === 0) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
};

type Section = 'unsigned' | 'signed' | 'slabbed';

export default function PlayerInventoryCard({ group }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [openSections, setOpenSections] = useState<Set<Section>>(new Set());

  const toggleSection = (section: Section) => {
    const next = new Set(openSections);
    if (next.has(section)) {
      next.delete(section);
    } else {
      next.add(section);
    }
    setOpenSections(next);
  };

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
      {/* Player Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-gray-400">
            {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </span>
          <div className="text-left">
            <div className="font-semibold text-gray-900">{group.player_name}</div>
            <div className="text-xs text-gray-500">
              {group.total_quantity} card{group.total_quantity !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Status badges */}
          <div className="flex gap-1.5">
            {group.unsigned_qty > 0 && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                {group.unsigned_qty} raw
              </span>
            )}
            {group.signed_qty > 0 && (
              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                {group.signed_qty} signed
              </span>
            )}
            {group.slabbed_qty > 0 && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                {group.slabbed_qty} slabbed
              </span>
            )}
          </div>
          <div className="text-sm font-medium text-gray-900 min-w-[80px] text-right">
            {formatCurrency(group.total_cost)}
          </div>
        </div>
      </button>

      {/* Expanded Detail */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3 space-y-2">
          {/* Cost Breakdown Summary */}
          <div className="flex gap-4 text-xs text-gray-500 pb-2 border-b border-gray-50">
            <span>Cards: {formatCurrency(group.card_cost)}</span>
            <span>Signing: {formatCurrency(group.signing_cost)}</span>
            <span>Grading: {formatCurrency(group.grading_cost)}</span>
          </div>

          {/* Unsigned Section */}
          <SectionToggle
            label="Raw Unsigned"
            icon={<Package size={14} />}
            count={group.unsigned_qty}
            items={group.unsigned}
            isOpen={openSections.has('unsigned')}
            onToggle={() => toggleSection('unsigned')}
            colorClass="bg-gray-50 text-gray-700"
          />

          {/* Signed Section */}
          <SectionToggle
            label="Signed"
            icon={<Pen size={14} />}
            count={group.signed_qty}
            items={group.signed}
            isOpen={openSections.has('signed')}
            onToggle={() => toggleSection('signed')}
            colorClass="bg-green-50 text-green-700"
            showConsigner
          />

          {/* Slabbed Section */}
          <SectionToggle
            label="Slabbed"
            icon={<Award size={14} />}
            count={group.slabbed_qty}
            items={group.slabbed}
            isOpen={openSections.has('slabbed')}
            onToggle={() => toggleSection('slabbed')}
            colorClass="bg-blue-50 text-blue-700"
            showGrade
          />
        </div>
      )}
    </div>
  );
}

interface SectionToggleProps {
  label: string;
  icon: React.ReactNode;
  count: number;
  items: PlayerInventoryGroup['unsigned'];
  isOpen: boolean;
  onToggle: () => void;
  colorClass: string;
  showConsigner?: boolean;
  showGrade?: boolean;
}

function SectionToggle({
  label,
  icon,
  count,
  items,
  isOpen,
  onToggle,
  colorClass,
  showConsigner,
  showGrade,
}: SectionToggleProps) {
  const totalCost = items.reduce((sum, i) => sum + (i.total_cost || 0), 0);

  return (
    <div>
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg ${colorClass} transition-colors`}
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          {icon}
          {label} ({count})
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">{formatCurrency(totalCost)}</span>
          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
      </button>

      {isOpen && items.length > 0 && (
        <div className="ml-4 mt-1 space-y-1">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between px-3 py-1.5 text-sm hover:bg-gray-50 rounded"
            >
              <div className="flex-1">
                <span className="text-gray-900">
                  {item.checklist?.product_line?.year} {item.checklist?.product_line?.brand?.name || item.checklist?.product_line?.name}
                </span>
                {' '}
                <span className="text-gray-500">
                  {item.base_type?.name || 'Chrome'}
                  {item.parallel ? ` ${item.parallel.name}` : ''}
                </span>
                <span className="text-gray-400 ml-1">({item.quantity}x)</span>
                {showConsigner && item.consigner && (
                  <span className="ml-2 px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] rounded">
                    {item.consigner}
                  </span>
                )}
                {showGrade && item.grade_company && (
                  <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded">
                    {item.grade_company} {item.grade_value}
                  </span>
                )}
              </div>
              <div className="text-right text-xs text-gray-600 min-w-[100px]">
                {item.card_cost > 0 && <span>Card: {formatCurrency(item.card_cost)}</span>}
                {showConsigner && item.signing_cost > 0 && (
                  <span className="ml-2">Sign: {formatCurrency(item.signing_cost)}</span>
                )}
                {showGrade && item.grading_cost > 0 && (
                  <span className="ml-2">Grade: {formatCurrency(item.grading_cost)}</span>
                )}
                {!item.card_cost && !item.signing_cost && !item.grading_cost && (
                  <span>{formatCurrency(item.total_cost)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {isOpen && items.length === 0 && (
        <div className="ml-4 mt-1 px-3 py-2 text-xs text-gray-400 italic">
          None
        </div>
      )}
    </div>
  );
}

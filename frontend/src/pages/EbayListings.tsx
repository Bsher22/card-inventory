/**
 * eBay Listings Page
 * 
 * Displays generated eBay listing data with copyable fields.
 * Accessed via URL params with selected inventory IDs.
 */

import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Copy,
  Check,
  Tag,
  Package,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ebayApi } from '../api';
import type { EbayListingData, EbayItemSpecifics } from '../types/ebay';

export default function EbayListings() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Get inventory IDs from URL params
  const inventoryIds = searchParams.get('ids')?.split(',') || [];
  
  // Fetch listing data
  const { data, isLoading, error } = useQuery({
    queryKey: ['ebay-listings', inventoryIds],
    queryFn: () => ebayApi.generateListings({ inventory_ids: inventoryIds }),
    enabled: inventoryIds.length > 0,
  });

  if (inventoryIds.length === 0) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No Cards Selected</h2>
          <p className="text-gray-500 mb-4">
            Go back to Inventory and select cards to generate eBay listings.
          </p>
          <button
            onClick={() => navigate('/inventory')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Inventory
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/inventory')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">eBay Listings</h1>
            <p className="text-gray-500 mt-1">
              {data?.total_count || 0} listings ready • Copy and paste into eBay
            </p>
          </div>
        </div>

        {data && (
          <div className="text-right">
            <p className="text-sm text-gray-500">Total Minimum Price</p>
            <p className="text-2xl font-bold text-green-600">
              ${data.total_min_price.toFixed(2)}
            </p>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700">Error generating listings. Please try again.</p>
        </div>
      )}

      {/* Listings */}
      {data && (
        <div className="space-y-6">
          {data.listings.map((listing: EbayListingData, index: number) => (
            <ListingCard key={listing.inventory_id} listing={listing} index={index + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function ListingCard({ listing, index }: { listing: EbayListingData; index: number }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Card Header */}
      <div
        className="p-4 bg-gray-50 border-b border-gray-200 cursor-pointer flex items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          <span className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-semibold text-sm">
            {index}
          </span>
          <div>
            <h3 className="font-semibold text-gray-900">{listing.player_name}</h3>
            <p className="text-sm text-gray-500">
              {listing.year} {listing.product_name}
              {listing.parallel_name && ` • ${listing.parallel_name}`}
              {listing.serial_numbered && ` /${listing.serial_numbered}`}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          {/* Status badges */}
          <div className="flex gap-2">
            {listing.is_signed && (
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Signed</span>
            )}
            {listing.is_first_bowman && (
              <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">1st Bowman</span>
            )}
            {listing.is_slabbed && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                {listing.grade_company} {listing.grade_value}
              </span>
            )}
          </div>
          
          {/* Price */}
          <div className="text-right">
            <p className="font-bold text-green-600">{formatCurrency(listing.min_price)}</p>
            <p className="text-xs text-gray-500">Min Price (2x cost)</p>
          </div>
          
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-6 space-y-6">
          {/* Title Section */}
          <CopyableField
            label="Title"
            value={listing.title}
            sublabel={`${listing.title.length}/80 characters`}
            onCopy={() => copyToClipboard(listing.title, 'title')}
            isCopied={copiedField === 'title'}
          />

          {/* Pricing Section */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">Cost Basis</p>
              <p className="font-semibold">{formatCurrency(listing.cost_basis)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">Per Unit Cost</p>
              <p className="font-semibold">{formatCurrency(listing.per_unit_cost)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">Quantity</p>
              <p className="font-semibold">{listing.quantity}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-xs text-green-600 mb-1">Min Price (2x)</p>
              <p className="font-bold text-green-700">{formatCurrency(listing.min_price)}</p>
            </div>
          </div>

          {/* Item Specifics */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Tag size={16} />
              Item Specifics
            </h4>
            <ItemSpecificsTable
              specifics={listing.item_specifics}
              onCopy={copyToClipboard}
              copiedField={copiedField}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function CopyableField({
  label,
  value,
  sublabel,
  onCopy,
  isCopied,
}: {
  label: string;
  value: string;
  sublabel?: string;
  onCopy: () => void;
  isCopied: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        {sublabel && <span className="text-xs text-gray-400">{sublabel}</span>}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          readOnly
          className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 font-mono text-sm"
        />
        <button
          onClick={onCopy}
          className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
            isCopied
              ? 'bg-green-100 text-green-700'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isCopied ? <Check size={16} /> : <Copy size={16} />}
          {isCopied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

function ItemSpecificsTable({
  specifics,
  onCopy,
  copiedField,
}: {
  specifics: EbayItemSpecifics;
  onCopy: (text: string, field: string) => void;
  copiedField: string | null;
}) {
  // Build list of specifics to display
  const items: { label: string; value: string; key: string }[] = [
    { label: 'Type', value: specifics.type, key: 'type' },
    { label: 'Sport', value: specifics.sport, key: 'sport' },
    { label: 'League', value: specifics.league, key: 'league' },
    { label: 'Set', value: specifics.set, key: 'set' },
    { label: 'Season', value: specifics.season, key: 'season' },
    { label: 'Manufacturer', value: specifics.manufacturer, key: 'manufacturer' },
    { label: 'Player/Athlete', value: specifics.player_athlete, key: 'player' },
  ];

  // Add optional fields
  if (specifics.team) {
    items.push({ label: 'Team', value: specifics.team, key: 'team' });
  }
  if (specifics.card_number) {
    items.push({ label: 'Card Number', value: specifics.card_number, key: 'card_number' });
  }
  if (specifics.parallel_variety) {
    items.push({ label: 'Parallel/Variety', value: specifics.parallel_variety, key: 'parallel' });
  }
  if (specifics.features) {
    items.push({ label: 'Features', value: specifics.features, key: 'features' });
  }
  if (specifics.serial_numbered) {
    items.push({ label: 'Serial Numbered', value: specifics.serial_numbered, key: 'serial' });
  }
  
  // Autograph fields
  if (specifics.autographed) {
    items.push({ label: 'Autographed', value: specifics.autographed, key: 'autographed' });
  }
  if (specifics.autograph_authentication) {
    items.push({ label: 'Autograph Authentication', value: specifics.autograph_authentication, key: 'auth' });
  }
  if (specifics.autograph_format) {
    items.push({ label: 'Autograph Format', value: specifics.autograph_format, key: 'auth_format' });
  }
  if (specifics.signed_by) {
    items.push({ label: 'Signed By', value: specifics.signed_by, key: 'signed_by' });
  }

  items.push({ label: 'Card Condition', value: specifics.card_condition, key: 'condition' });

  return (
    <div className="bg-gray-50 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <tbody className="divide-y divide-gray-200">
          {items.map((item) => (
            <tr key={item.key} className="hover:bg-gray-100 transition-colors">
              <td className="px-4 py-2 font-medium text-gray-600 w-48">{item.label}</td>
              <td className="px-4 py-2 text-gray-900">{item.value}</td>
              <td className="px-4 py-2 text-right">
                <button
                  onClick={() => onCopy(item.value, item.key)}
                  className={`p-1 rounded transition-colors ${
                    copiedField === item.key
                      ? 'text-green-600'
                      : 'text-gray-400 hover:text-blue-600'
                  }`}
                >
                  {copiedField === item.key ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

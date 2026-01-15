/**
 * Price Suggestion Component
 *
 * Shows available prices when selecting cards for a consignment.
 * Can be integrated into the consignment creation flow.
 */

import { useQuery } from '@tanstack/react-query';
import { DollarSign, Info, AlertCircle } from 'lucide-react';
import { consignerPricingApi } from '../api/consignerPricingApi';

interface PriceSuggestionProps {
  playerId: string;
  consignerId: string;
  onPriceSelect?: (price: number) => void;
  showAllOptions?: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function PriceSuggestion({
  playerId,
  consignerId,
  onPriceSelect,
  showAllOptions = false,
}: PriceSuggestionProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['price-lookup', playerId, consignerId],
    queryFn: () => consignerPricingApi.lookupPlayerPrice(playerId, consignerId),
    enabled: !!playerId,
  });

  if (isLoading) {
    return (
      <div className="text-xs text-gray-400 animate-pulse">
        Loading price...
      </div>
    );
  }

  if (error || !data) {
    return null;
  }

  // Find the price for the selected consigner
  const consignerPrice = data.all_prices.find(
    (p) => p.consigner_id === consignerId
  );

  if (!consignerPrice && !showAllOptions) {
    // No price for this consigner
    return (
      <div className="flex items-center gap-1 text-xs text-amber-600">
        <AlertCircle size={12} />
        <span>No price set for this consigner</span>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Selected consigner's price */}
      {consignerPrice && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPriceSelect?.(consignerPrice.price_per_card)}
            className="flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs hover:bg-green-100 transition-colors"
          >
            <DollarSign size={12} />
            <span className="font-medium">
              {formatCurrency(consignerPrice.price_per_card)}
            </span>
          </button>
          {consignerPrice.notes && (
            <span className="text-xs text-gray-500 italic">
              {consignerPrice.notes}
            </span>
          )}
        </div>
      )}

      {/* Show best price if different from selected consigner */}
      {showAllOptions && data.best_price && data.best_consigner_id !== consignerId && (
        <div className="flex items-center gap-1 text-xs text-blue-600">
          <Info size={12} />
          <span>
            Best price: {formatCurrency(data.best_price)} from {data.best_consigner_name}
          </span>
        </div>
      )}

      {/* All options dropdown */}
      {showAllOptions && data.all_prices.length > 1 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
            View all {data.all_prices.length} options
          </summary>
          <div className="mt-1 space-y-1 pl-2 border-l-2 border-gray-200">
            {data.all_prices.map((price) => (
              <button
                key={price.id}
                onClick={() => onPriceSelect?.(price.price_per_card)}
                className={`block w-full text-left px-2 py-1 rounded hover:bg-gray-100 ${
                  price.consigner_id === consignerId
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600'
                }`}
              >
                <span className="font-medium">{price.consigner_name}</span>
                <span className="float-right">
                  {formatCurrency(price.price_per_card)}
                </span>
              </button>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

/**
 * Inline price indicator for tables/lists
 */
interface InlinePriceProps {
  playerId: string;
  consignerId: string;
}

export function InlinePrice({ playerId, consignerId }: InlinePriceProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['price-lookup', playerId, consignerId],
    queryFn: () => consignerPricingApi.lookupPlayerPrice(playerId, consignerId),
    enabled: !!playerId && !!consignerId,
    staleTime: 60000, // Cache for 1 minute
  });

  if (isLoading) {
    return <span className="text-gray-300">...</span>;
  }

  const price = data?.all_prices.find((p) => p.consigner_id === consignerId);

  if (!price) {
    return <span className="text-gray-400">-</span>;
  }

  const isBest = data?.best_consigner_id === consignerId;

  return (
    <span
      className={`${
        isBest ? 'text-green-600 font-medium' : 'text-gray-700'
      }`}
      title={isBest ? 'Best available price' : undefined}
    >
      {formatCurrency(price.price_per_card)}
      {isBest && ' *'}
    </span>
  );
}

export default PriceSuggestion;

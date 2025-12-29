/**
 * CardEntryRow Component
 * 
 * A row component for entering card details inline in the purchase form.
 * Supports: Year, Card Type, Player, Parallel, Quantity, Signed, Auto checkboxes.
 */

import { useState } from 'react';
import { Trash2, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import type { PurchaseItemCreate } from '../types/financial';
import {
  CARD_TYPE_OPTIONS,
  PARALLEL_OPTIONS,
  GRADE_COMPANY_OPTIONS,
} from '../types/financial';

// ============================================
// HELPER
// ============================================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

// ============================================
// COMPONENT PROPS
// ============================================

interface CardEntryRowProps {
  item: PurchaseItemCreate;
  index: number;
  onChange: (index: number, field: keyof PurchaseItemCreate, value: any) => void;
  onRemove: (index: number) => void;
  onDuplicate: (index: number) => void;
  canRemove: boolean;
}

// ============================================
// COMPONENT
// ============================================

export function CardEntryRow({
  item,
  index,
  onChange,
  onRemove,
  onDuplicate,
  canRemove,
}: CardEntryRowProps) {
  const [expanded, setExpanded] = useState(false);

  const lineTotal = (item.unit_price || 0) * (item.quantity || 1);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
      {/* Main Row */}
      <div className="grid grid-cols-12 gap-2 items-end">
        {/* Year */}
        <div className="col-span-3 sm:col-span-1">
          <label className="block text-xs font-medium text-gray-600 mb-1">Year</label>
          <input
            type="number"
            value={item.year || new Date().getFullYear()}
            onChange={(e) => onChange(index, 'year', parseInt(e.target.value) || new Date().getFullYear())}
            min={1990}
            max={2030}
            className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Card Type */}
        <div className="col-span-5 sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Card Type</label>
          <select
            value={item.card_type || 'Bowman Chrome'}
            onChange={(e) => onChange(index, 'card_type', e.target.value)}
            className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            {CARD_TYPE_OPTIONS.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* Player */}
        <div className="col-span-4 sm:col-span-3">
          <label className="block text-xs font-medium text-gray-600 mb-1">Player</label>
          <input
            type="text"
            value={item.player || ''}
            onChange={(e) => onChange(index, 'player', e.target.value)}
            placeholder="Roman Anthony"
            className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Parallel */}
        <div className="col-span-4 sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Parallel</label>
          <select
            value={item.parallel || 'Base'}
            onChange={(e) => onChange(index, 'parallel', e.target.value)}
            className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            {PARALLEL_OPTIONS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* Quantity */}
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs font-medium text-gray-600 mb-1">Qty</label>
          <input
            type="number"
            value={item.quantity || 1}
            onChange={(e) => onChange(index, 'quantity', parseInt(e.target.value) || 1)}
            min={1}
            className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
          />
        </div>

        {/* Unit Price */}
        <div className="col-span-3 sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">$/Card</label>
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
            <input
              type="number"
              value={item.unit_price || 0}
              onChange={(e) => onChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
              min={0}
              step={0.01}
              className="w-full pl-6 pr-2 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="col-span-3 sm:col-span-1 flex gap-1 justify-end">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
            title="More options"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button
            type="button"
            onClick={() => onDuplicate(index)}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
            title="Duplicate"
          >
            <Copy size={16} />
          </button>
          {canRemove && (
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
              title="Remove"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Checkboxes Row */}
      <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-gray-100">
        {/* Signed Checkbox */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={item.is_signed || false}
            onChange={(e) => onChange(index, 'is_signed', e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">Signed</span>
          <span className="text-xs text-gray-400">(bought signed)</span>
        </label>

        {/* Auto Checkbox */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={item.is_auto || false}
            onChange={(e) => onChange(index, 'is_auto', e.target.checked)}
            className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
          />
          <span className="text-sm text-gray-700">Auto</span>
          <span className="text-xs text-gray-400">(pack-pulled)</span>
        </label>

        {/* Line Total */}
        <div className="ml-auto text-sm">
          <span className="text-gray-500">Line: </span>
          <span className="font-medium text-gray-900">{formatCurrency(lineTotal)}</span>
        </div>
      </div>

      {/* Expanded Options */}
      {expanded && (
        <div className="pt-3 border-t border-gray-100">
          <div className="grid grid-cols-12 gap-3">
            {/* Card Number */}
            <div className="col-span-4 sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Card #</label>
              <input
                type="text"
                value={item.card_number || ''}
                onChange={(e) => onChange(index, 'card_number', e.target.value || null)}
                placeholder="BCP-61"
                className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Slabbed Checkbox */}
            <div className="col-span-4 sm:col-span-2 flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={item.is_slabbed || false}
                  onChange={(e) => onChange(index, 'is_slabbed', e.target.checked)}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">Slabbed</span>
              </label>
            </div>

            {/* Grade Company (only if slabbed) */}
            {item.is_slabbed && (
              <>
                <div className="col-span-4 sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Grader</label>
                  <select
                    value={item.grade_company || ''}
                    onChange={(e) => onChange(index, 'grade_company', e.target.value || null)}
                    className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                  >
                    <option value="">Select...</option>
                    {GRADE_COMPANY_OPTIONS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-4 sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Grade</label>
                  <input
                    type="number"
                    value={item.grade_value || ''}
                    onChange={(e) => onChange(index, 'grade_value', parseFloat(e.target.value) || null)}
                    min={0}
                    max={10}
                    step={0.5}
                    placeholder="9.5"
                    className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </>
            )}

            {/* Condition (for raw cards) */}
            {!item.is_slabbed && (
              <div className="col-span-4 sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Condition</label>
                <select
                  value={item.condition || 'Raw'}
                  onChange={(e) => onChange(index, 'condition', e.target.value)}
                  className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="Raw">Raw</option>
                  <option value="NM">Near Mint</option>
                  <option value="EX">Excellent</option>
                  <option value="VG">Very Good</option>
                  <option value="G">Good</option>
                </select>
              </div>
            )}

            {/* Notes */}
            <div className="col-span-12 sm:col-span-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <input
                type="text"
                value={item.notes || ''}
                onChange={(e) => onChange(index, 'notes', e.target.value || null)}
                placeholder="Optional notes..."
                className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CardEntryRow;

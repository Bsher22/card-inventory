import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Calendar,
  ChevronDown,
  ChevronRight,
  Package,
  X,
  Trash2,
  ShoppingCart,
  Check,
  AlertCircle,
  Copy,
  Settings,
  Zap,
} from 'lucide-react';
import { api } from '../api';
import type {
  Purchase,
  PurchaseCreate,
} from '../types';

// ============================================
// CONSTANTS
// ============================================

const CARD_TYPE_OPTIONS = [
  'Bowman',
  'Bowman Chrome',
  'Bowman Draft',
  'Bowman Sapphire',
  'Bowman Sterling',
  "Bowman's Best",
  'Topps Chrome',
  'Topps',
  'Other',
];

const PARALLEL_OPTIONS = [
  'Base',
  'Refractor',
  'Gold',
  'Gold Refractor',
  'Orange',
  'Orange Refractor',
  'Blue',
  'Blue Refractor',
  'Purple',
  'Purple Refractor',
  'Green',
  'Green Refractor',
  'Red',
  'Red Refractor',
  'Black',
  'Black Refractor',
  'Atomic',
  'X-Fractor',
  'Prism',
  'Shimmer',
  'Speckle',
  'Mojo',
  'Aqua',
  'Pink',
  'Yellow',
  'Superfractor',
  'Printing Plate',
  'Other',
];

const PLATFORM_OPTIONS = [
  'eBay',
  'COMC',
  'MySlabs',
  'Mercari',
  'Facebook',
  'Twitter/X',
  'Instagram',
  'Card Show',
  'LCS',
  'Direct',
  'Other',
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

// ============================================
// QUICK CARD ENTRY ROW
// ============================================

interface CardLineItem {
  id: string;
  year: number;
  card_type: string;
  player: string;
  parallel: string;
  quantity: number;
  unit_price: number;
  is_signed: boolean;
  is_auto: boolean;
}

interface QuickCardRowProps {
  item: CardLineItem;
  onUpdate: (id: string, updates: Partial<CardLineItem>) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  inputRef?: React.RefObject<HTMLInputElement>;
  isFirst?: boolean;
}

function QuickCardRow({ item, onUpdate, onRemove, onDuplicate, inputRef, isFirst }: QuickCardRowProps) {
  return (
    <div className="grid grid-cols-12 gap-2 items-center py-2 px-3 bg-white rounded-lg border hover:border-blue-300 transition-colors">
      {/* Year */}
      <div className="col-span-1">
        <input
          type="number"
          value={item.year}
          onChange={(e) => onUpdate(item.id, { year: parseInt(e.target.value) || 2024 })}
          min={1990}
          max={2030}
          className="w-full px-2 py-1.5 border rounded text-sm text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Year"
        />
      </div>

      {/* Card Type */}
      <div className="col-span-2">
        <select
          value={item.card_type}
          onChange={(e) => onUpdate(item.id, { card_type: e.target.value })}
          className="w-full px-2 py-1.5 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {CARD_TYPE_OPTIONS.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      {/* Parallel */}
      <div className="col-span-2">
        <select
          value={item.parallel}
          onChange={(e) => onUpdate(item.id, { parallel: e.target.value })}
          className="w-full px-2 py-1.5 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {PARALLEL_OPTIONS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* Player */}
      <div className="col-span-3">
        <input
          ref={isFirst ? inputRef : undefined}
          type="text"
          value={item.player}
          onChange={(e) => onUpdate(item.id, { player: e.target.value })}
          placeholder="Player name *"
          className="w-full px-2 py-1.5 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Quantity */}
      <div className="col-span-1">
        <input
          type="number"
          value={item.quantity}
          onChange={(e) => onUpdate(item.id, { quantity: parseInt(e.target.value) || 1 })}
          min={1}
          className="w-full px-2 py-1.5 border rounded text-sm text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Signed & Auto */}
      <div className="col-span-1 flex items-center justify-center gap-2">
        <label className="flex items-center gap-0.5 cursor-pointer" title="Card bought already signed">
          <input
            type="checkbox"
            checked={item.is_signed}
            onChange={(e) => onUpdate(item.id, { is_signed: e.target.checked })}
            className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
          />
          <span className="text-xs text-gray-500">S</span>
        </label>
        <label className="flex items-center gap-0.5 cursor-pointer" title="Pack-pulled autograph">
          <input
            type="checkbox"
            checked={item.is_auto}
            onChange={(e) => onUpdate(item.id, { is_auto: e.target.checked })}
            className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
          />
          <span className="text-xs text-gray-500">A</span>
        </label>
      </div>

      {/* Price */}
      <div className="col-span-1">
        <div className="relative">
          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
          <input
            type="number"
            value={item.unit_price || ''}
            onChange={(e) => onUpdate(item.id, { unit_price: parseFloat(e.target.value) || 0 })}
            min={0}
            step={0.01}
            placeholder="0.00"
            className="w-full pl-5 pr-1 py-1.5 border rounded text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="col-span-1 flex items-center justify-end gap-1">
        <button
          type="button"
          onClick={() => onDuplicate(item.id)}
          className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
          title="Duplicate row"
        >
          <Copy size={14} />
        </button>
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
          title="Remove"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// ============================================
// PURCHASE FORM MODAL COMPONENT
// ============================================

interface PurchaseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function PurchaseFormModal({ isOpen, onClose, onSuccess }: PurchaseFormModalProps) {
  const queryClient = useQueryClient();
  const playerInputRef = useRef<HTMLInputElement>(null);
  const [addToInventory, setAddToInventory] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);

  // Default values that persist (user preferences)
  const [defaults, setDefaults] = useState({
    year: new Date().getFullYear(),
    card_type: 'Bowman Chrome',
    parallel: 'Base',
  });

  // Purchase metadata
  const [purchaseInfo, setPurchaseInfo] = useState({
    purchase_date: getTodayString(),
    vendor: '',
    platform: '',
    order_number: '',
    shipping: 0,
    tax: 0,
    notes: '',
  });

  // Card line items
  const [lineItems, setLineItems] = useState<CardLineItem[]>([]);

  // Initialize with one empty row
  useEffect(() => {
    if (isOpen && lineItems.length === 0) {
      addNewRow();
    }
  }, [isOpen]);

  // Focus player input when modal opens
  useEffect(() => {
    if (isOpen && playerInputRef.current) {
      setTimeout(() => playerInputRef.current?.focus(), 100);
    }
  }, [isOpen, lineItems.length]);

  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const total = subtotal + purchaseInfo.shipping + purchaseInfo.tax;

  // Mutation
  const createMutation = useMutation({
    mutationFn: (data: { purchase: PurchaseCreate; addToInventory: boolean }) =>
      api.financial.createPurchase(data.purchase, data.addToInventory),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      onSuccess();
      handleClose();
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const addNewRow = () => {
    const newItem: CardLineItem = {
      id: crypto.randomUUID(),
      year: defaults.year,
      card_type: defaults.card_type,
      parallel: defaults.parallel,
      player: '',
      quantity: 1,
      unit_price: 0,
      is_signed: false,
      is_auto: false,
    };
    setLineItems((prev) => [...prev, newItem]);
  };

  const handleUpdateItem = (id: string, updates: Partial<CardLineItem>) => {
    setLineItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const handleRemoveItem = (id: string) => {
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleDuplicateItem = (id: string) => {
    const item = lineItems.find((i) => i.id === id);
    if (item) {
      const newItem: CardLineItem = {
        ...item,
        id: crypto.randomUUID(),
        player: '', // Clear player for new entry
      };
      const index = lineItems.findIndex((i) => i.id === id);
      const newItems = [...lineItems];
      newItems.splice(index + 1, 0, newItem);
      setLineItems(newItems);
    }
  };

  const handleClose = () => {
    setPurchaseInfo({
      purchase_date: getTodayString(),
      vendor: '',
      platform: '',
      order_number: '',
      shipping: 0,
      tax: 0,
      notes: '',
    });
    setLineItems([]);
    setError(null);
    setShowOptions(false);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate
    const validItems = lineItems.filter((item) => item.player.trim());
    if (validItems.length === 0) {
      setError('Please add at least one card with a player name');
      return;
    }

    const purchaseData: PurchaseCreate = {
      purchase_date: purchaseInfo.purchase_date,
      vendor: purchaseInfo.vendor || null,
      platform: purchaseInfo.platform || null,
      order_number: purchaseInfo.order_number || null,
      shipping: purchaseInfo.shipping,
      tax: purchaseInfo.tax,
      notes: purchaseInfo.notes || null,
      items: validItems.map((item) => ({
        year: item.year,
        card_type: item.card_type,
        player: item.player.trim(),
        parallel: item.parallel,
        quantity: item.quantity,
        unit_price: item.unit_price,
        is_signed: item.is_signed,
        is_auto: item.is_auto,
        condition: 'Raw',
      })),
    };

    createMutation.mutate({ purchase: purchaseData, addToInventory });
  };

  // Keyboard shortcut to add new row
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      addNewRow();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4">
      <div 
        className="bg-gray-50 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-white rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Zap className="text-blue-600" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Quick Add Cards</h2>
              <p className="text-sm text-gray-500">Fast entry for card purchases</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowOptions(!showOptions)}
              className={`p-2 rounded-lg transition-colors ${showOptions ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-500'}`}
              title="Purchase options"
            >
              <Settings size={18} />
            </button>
            <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          {/* Error */}
          {error && (
            <div className="mx-4 mt-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Options Panel (collapsible) */}
          {showOptions && (
            <div className="mx-4 mt-4 p-4 bg-white rounded-lg border">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Purchase Details</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Date</label>
                  <input
                    type="date"
                    value={purchaseInfo.purchase_date}
                    onChange={(e) => setPurchaseInfo({ ...purchaseInfo, purchase_date: e.target.value })}
                    className="w-full px-2 py-1.5 border rounded text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Vendor</label>
                  <input
                    type="text"
                    value={purchaseInfo.vendor}
                    onChange={(e) => setPurchaseInfo({ ...purchaseInfo, vendor: e.target.value })}
                    placeholder="Seller name"
                    className="w-full px-2 py-1.5 border rounded text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Platform</label>
                  <select
                    value={purchaseInfo.platform}
                    onChange={(e) => setPurchaseInfo({ ...purchaseInfo, platform: e.target.value })}
                    className="w-full px-2 py-1.5 border rounded text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select...</option>
                    {PLATFORM_OPTIONS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Order #</label>
                  <input
                    type="text"
                    value={purchaseInfo.order_number}
                    onChange={(e) => setPurchaseInfo({ ...purchaseInfo, order_number: e.target.value })}
                    placeholder="Optional"
                    className="w-full px-2 py-1.5 border rounded text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-3 mt-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Shipping</label>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={purchaseInfo.shipping || ''}
                      onChange={(e) => setPurchaseInfo({ ...purchaseInfo, shipping: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                      className="w-full pl-6 pr-2 py-1.5 border rounded text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Tax</label>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={purchaseInfo.tax || ''}
                      onChange={(e) => setPurchaseInfo({ ...purchaseInfo, tax: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                      className="w-full pl-6 pr-2 py-1.5 border rounded text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Notes</label>
                  <input
                    type="text"
                    value={purchaseInfo.notes}
                    onChange={(e) => setPurchaseInfo({ ...purchaseInfo, notes: e.target.value })}
                    placeholder="Optional"
                    className="w-full px-2 py-1.5 border rounded text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="mt-3 pt-3 border-t">
                <h4 className="text-xs font-medium text-gray-500 mb-2">Default Values for New Rows</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Default Year</label>
                    <input
                      type="number"
                      value={defaults.year}
                      onChange={(e) => setDefaults({ ...defaults, year: parseInt(e.target.value) || 2024 })}
                      min={1990}
                      max={2030}
                      className="w-full px-2 py-1.5 border rounded text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Default Card Type</label>
                    <select
                      value={defaults.card_type}
                      onChange={(e) => setDefaults({ ...defaults, card_type: e.target.value })}
                      className="w-full px-2 py-1.5 border rounded text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      {CARD_TYPE_OPTIONS.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Default Parallel</label>
                    <select
                      value={defaults.parallel}
                      onChange={(e) => setDefaults({ ...defaults, parallel: e.target.value })}
                      className="w-full px-2 py-1.5 border rounded text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      {PARALLEL_OPTIONS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Card Entry Area */}
          <div className="p-4">
            {/* Column Headers */}
            <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium text-gray-500 uppercase">
              <div className="col-span-1">Year</div>
              <div className="col-span-2">Card Type</div>
              <div className="col-span-2">Parallel</div>
              <div className="col-span-3">Player</div>
              <div className="col-span-1 text-center">Qty</div>
              <div className="col-span-1 text-center" title="S = Signed (bought signed), A = Auto (pack-pulled)">S / A</div>
              <div className="col-span-1 text-right">Price</div>
              <div className="col-span-1"></div>
            </div>

            {/* Card Rows */}
            <div className="space-y-2">
              {lineItems.map((item, index) => (
                <QuickCardRow
                  key={item.id}
                  item={item}
                  onUpdate={handleUpdateItem}
                  onRemove={handleRemoveItem}
                  onDuplicate={handleDuplicateItem}
                  inputRef={index === lineItems.length - 1 ? playerInputRef : undefined}
                  isFirst={index === lineItems.length - 1}
                />
              ))}
            </div>

            {/* Add Row Button */}
            <button
              type="button"
              onClick={addNewRow}
              className="mt-3 w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              <span>Add Card</span>
              <span className="text-xs text-gray-400">(Ctrl+Enter)</span>
            </button>
          </div>

          {/* Summary Footer */}
          <div className="p-4 bg-white border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                {/* Inventory Toggle */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addToInventory}
                    onChange={(e) => setAddToInventory(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">Add to Inventory</span>
                </label>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>
                    <strong className="text-gray-900">{lineItems.filter(i => i.player.trim()).length}</strong> cards
                  </span>
                  <span>
                    <strong className="text-gray-900">{lineItems.reduce((sum, i) => sum + (i.player.trim() ? i.quantity : 0), 0)}</strong> total qty
                  </span>
                  {(purchaseInfo.shipping > 0 || purchaseInfo.tax > 0) && (
                    <span className="text-gray-400">
                      +{formatCurrency(purchaseInfo.shipping + purchaseInfo.tax)} fees
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm text-gray-500">Total</div>
                  <div className="text-2xl font-bold text-gray-900">{formatCurrency(total)}</div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {createMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check size={18} />
                        Save Purchase
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================
// PURCHASE CARD COMPONENT
// ============================================

interface PurchaseCardProps {
  purchase: Purchase;
  isExpanded: boolean;
  onToggle: () => void;
}

function PurchaseCard({ purchase, isExpanded, onToggle }: PurchaseCardProps) {
  const totalCards = purchase.items?.reduce((sum, i) => sum + i.quantity, 0) || 0;

  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-4">
          {isExpanded ? (
            <ChevronDown size={20} className="text-gray-400" />
          ) : (
            <ChevronRight size={20} className="text-gray-400" />
          )}
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">
                {purchase.vendor || purchase.platform || 'Purchase'}
              </span>
              {purchase.platform && purchase.vendor && (
                <span className="text-sm text-gray-500">via {purchase.platform}</span>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-500 mt-0.5">
              <span className="flex items-center gap-1">
                <Calendar size={14} />
                {formatDate(purchase.purchase_date)}
              </span>
              <span className="flex items-center gap-1">
                <Package size={14} />
                {totalCards} card{totalCards !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-bold text-gray-900">{formatCurrency(purchase.total)}</div>
          {purchase.order_number && (
            <div className="text-xs text-gray-500">#{purchase.order_number}</div>
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && purchase.items && purchase.items.length > 0 && (
        <div className="border-t bg-gray-50">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-500 uppercase">
                <th className="px-4 py-2 text-left">Card</th>
                <th className="px-3 py-2 text-center">Condition</th>
                <th className="px-3 py-2 text-center">Qty</th>
                <th className="px-3 py-2 text-right">Unit Price</th>
                <th className="px-3 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {purchase.items.map((item) => (
                <tr key={item.id} className="hover:bg-white">
                  <td className="px-4 py-2">
                    <div className="font-medium text-gray-900">
                      #{item.checklist?.card_number} - {item.checklist?.player_name_raw}
                    </div>
                    <div className="text-xs text-gray-500">{item.checklist?.set_name}</div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                      {item.condition || 'NM'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center text-gray-600">{item.quantity}</td>
                  <td className="px-3 py-2 text-right text-gray-600">
                    {formatCurrency(item.unit_price)}
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-gray-900">
                    {formatCurrency(item.unit_price * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-medium">
                <td colSpan={4} className="px-4 py-2 text-right text-gray-700">
                  Subtotal / Shipping / Tax
                </td>
                <td className="px-3 py-2 text-right text-gray-900">
                  {formatCurrency(purchase.subtotal)} / {formatCurrency(purchase.shipping)} /{' '}
                  {formatCurrency(purchase.tax)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================
// MAIN PURCHASES PAGE
// ============================================

export default function Purchases() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [dateRange, setDateRange] = useState<{ start?: string; end?: string }>({});

  const { data: purchases, isLoading } = useQuery({
    queryKey: ['purchases', dateRange],
    queryFn: () =>
      api.financial.getPurchases({
        start_date: dateRange.start,
        end_date: dateRange.end,
      }),
  });

  // Calculate totals
  const totalSpent = purchases?.reduce((sum, p) => sum + (p.total || 0), 0) || 0;
  const totalCards =
    purchases?.reduce((sum, p) => sum + (p.items?.reduce((isum, i) => isum + i.quantity, 0) || 0), 0) ||
    0;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchases</h1>
          <p className="text-gray-500 mt-1">Track card acquisitions and cost basis</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} />
          Record Purchase
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-500">Total Purchases</div>
          <div className="text-2xl font-bold text-gray-900">{purchases?.length || 0}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-500">Cards Acquired</div>
          <div className="text-2xl font-bold text-gray-900">{totalCards}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-500">Total Spent</div>
          <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalSpent)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div>
          <label className="block text-sm text-gray-600 mb-1">From</label>
          <input
            type="date"
            value={dateRange.start || ''}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value || undefined })}
            className="px-3 py-2 border rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">To</label>
          <input
            type="date"
            value={dateRange.end || ''}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value || undefined })}
            className="px-3 py-2 border rounded-lg text-sm"
          />
        </div>
      </div>

      {/* Purchase List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : purchases?.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <ShoppingCart className="mx-auto text-gray-400 mb-3" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No purchases yet</h3>
          <p className="text-gray-500 mb-4">Record your first purchase to start tracking costs</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={18} />
            Record Purchase
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {purchases?.map((purchase) => (
            <PurchaseCard
              key={purchase.id}
              purchase={purchase}
              isExpanded={expandedId === purchase.id}
              onToggle={() => setExpandedId(expandedId === purchase.id ? null : purchase.id)}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <PurchaseFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {}}
      />
    </div>
  );
}
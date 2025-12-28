/**
 * eBay Import Page
 * 
 * Multi-step workflow for importing eBay sales reports:
 * 1. Upload CSV file
 * 2. Preview parsed listings with selection
 * 3. Submit selected listings to database
 */
import { useState, useCallback, useMemo } from 'react';
import { 
  Upload, 
  FileSpreadsheet, 
  Check, 
  X, 
  AlertTriangle, 
  ChevronDown, 
  ChevronRight,
  Package,
  DollarSign,
  TrendingUp,
  Trash2,
  CheckSquare,
  Square,
  MinusSquare
} from 'lucide-react';
import { ebayApi } from '../api/ebayApi';
import type { EbayListingPreview, EbayUploadPreviewResponse } from '../types/ebay';

// ============================================
// Helper Functions
// ============================================

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
};

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

// ============================================
// Sub-Components
// ============================================

interface ListingRowProps {
  listing: EbayListingPreview;
  isSelected: boolean;
  isExpanded: boolean;
  onToggleSelect: () => void;
  onToggleExpand: () => void;
}

function ListingRow({ listing, isSelected, isExpanded, onToggleSelect, onToggleExpand }: ListingRowProps) {
  const profitMargin = listing.item_sales > 0 
    ? ((listing.net_sales / listing.item_sales) * 100).toFixed(1) 
    : '0.0';
  
  return (
    <div className={`border rounded-lg mb-2 transition-colors ${
      isSelected ? 'border-blue-300 bg-blue-50/30' : 'border-gray-200 bg-white'
    }`}>
      {/* Main Row */}
      <div className="flex items-center p-3 gap-3">
        {/* Checkbox */}
        <button
          onClick={onToggleSelect}
          className="flex-shrink-0 p-1 hover:bg-gray-100 rounded"
        >
          {isSelected ? (
            <CheckSquare className="text-blue-600" size={20} />
          ) : (
            <Square className="text-gray-400" size={20} />
          )}
        </button>
        
        {/* Expand/Collapse */}
        <button
          onClick={onToggleExpand}
          className="flex-shrink-0 p-1 hover:bg-gray-100 rounded"
        >
          {isExpanded ? (
            <ChevronDown className="text-gray-600" size={18} />
          ) : (
            <ChevronRight className="text-gray-600" size={18} />
          )}
        </button>
        
        {/* Title & Item ID */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate" title={listing.listing_title}>
            {listing.listing_title}
          </p>
          <p className="text-xs text-gray-500">
            Item ID: {listing.ebay_item_id}
          </p>
        </div>
        
        {/* Qty */}
        <div className="text-center px-3">
          <p className="text-sm text-gray-500">Qty</p>
          <p className="font-semibold text-gray-900">{listing.quantity_sold}</p>
        </div>
        
        {/* Sales */}
        <div className="text-right px-3">
          <p className="text-sm text-gray-500">Sales</p>
          <p className="font-semibold text-gray-900">{formatCurrency(listing.item_sales)}</p>
        </div>
        
        {/* Fees */}
        <div className="text-right px-3">
          <p className="text-sm text-gray-500">Fees</p>
          <p className="font-semibold text-red-600">-{formatCurrency(listing.total_selling_costs)}</p>
        </div>
        
        {/* Net */}
        <div className="text-right px-3">
          <p className="text-sm text-gray-500">Net</p>
          <p className={`font-semibold ${listing.net_sales >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(listing.net_sales)}
          </p>
        </div>
        
        {/* Margin */}
        <div className="text-right px-3 w-20">
          <p className="text-sm text-gray-500">Margin</p>
          <p className="font-semibold text-gray-700">{profitMargin}%</p>
        </div>
      </div>
      
      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-gray-100 p-4 bg-gray-50/50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Revenue Breakdown */}
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Revenue</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Item Sales</span>
                  <span className="font-medium">{formatCurrency(listing.item_sales)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium">{formatCurrency(listing.shipping_collected)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Taxes (to you)</span>
                  <span className="font-medium">{formatCurrency(listing.taxes_to_seller)}</span>
                </div>
                <div className="flex justify-between border-t pt-1 mt-1">
                  <span className="text-gray-700 font-medium">Total</span>
                  <span className="font-semibold">{formatCurrency(listing.total_sales)}</span>
                </div>
              </div>
            </div>
            
            {/* Fees Breakdown */}
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Fees</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Final Value</span>
                  <span className="font-medium text-red-600">-{formatCurrency(listing.final_value_fees)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping Labels</span>
                  <span className="font-medium text-red-600">-{formatCurrency(listing.shipping_label_cost)}</span>
                </div>
                {listing.promoted_general_fees > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Promoted</span>
                    <span className="font-medium text-red-600">-{formatCurrency(listing.promoted_general_fees)}</span>
                  </div>
                )}
                {listing.fee_credits > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Credits</span>
                    <span className="font-medium text-green-600">+{formatCurrency(listing.fee_credits)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-1 mt-1">
                  <span className="text-gray-700 font-medium">Total Fees</span>
                  <span className="font-semibold text-red-600">-{formatCurrency(listing.total_selling_costs)}</span>
                </div>
              </div>
            </div>
            
            {/* Sales Channels */}
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Sales By Channel</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Direct</span>
                  <span className="font-medium">
                    {listing.quantity_sold - listing.quantity_via_promoted - listing.quantity_via_best_offer - listing.quantity_via_seller_offer}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Promoted</span>
                  <span className="font-medium">{listing.quantity_via_promoted}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Best Offer</span>
                  <span className="font-medium">{listing.quantity_via_best_offer}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Seller Offer</span>
                  <span className="font-medium">{listing.quantity_via_seller_offer}</span>
                </div>
              </div>
            </div>
            
            {/* Averages */}
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Averages</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Sale Price</span>
                  <span className="font-medium">{formatCurrency(listing.average_selling_price)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Net/Sale</span>
                  <span className="font-medium">
                    {formatCurrency(listing.quantity_sold > 0 ? listing.net_sales / listing.quantity_sold : 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Fee %</span>
                  <span className="font-medium">
                    {listing.item_sales > 0 
                      ? ((listing.total_selling_costs / listing.item_sales) * 100).toFixed(1) 
                      : '0.0'}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Main Component
// ============================================

type Step = 'upload' | 'preview' | 'success';

export default function EbayImport() {
  // State
  const [step, setStep] = useState<Step>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Upload state
  const [dragActive, setDragActive] = useState(false);
  
  // Preview state
  const [previewData, setPreviewData] = useState<EbayUploadPreviewResponse | null>(null);
  const [selections, setSelections] = useState<Record<number, boolean>>({});
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [importNotes, setImportNotes] = useState('');
  
  // Success state
  const [importResult, setImportResult] = useState<{
    count: number;
    totalSales: number;
    totalNet: number;
    batchId: string;
  } | null>(null);
  
  // ============================================
  // Computed Values
  // ============================================
  
  const selectedListings = useMemo(() => {
    if (!previewData?.listings) return [];
    return previewData.listings.filter((_, idx) => selections[idx] !== false);
  }, [previewData, selections]);
  
  const selectedStats = useMemo(() => {
    return {
      count: selectedListings.length,
      quantity: selectedListings.reduce((sum, l) => sum + l.quantity_sold, 0),
      itemSales: selectedListings.reduce((sum, l) => sum + l.item_sales, 0),
      netSales: selectedListings.reduce((sum, l) => sum + l.net_sales, 0),
    };
  }, [selectedListings]);
  
  const allSelected = useMemo(() => {
    if (!previewData?.listings.length) return false;
    return previewData.listings.every((_, idx) => selections[idx] !== false);
  }, [previewData, selections]);
  
  const noneSelected = useMemo(() => {
    if (!previewData?.listings.length) return true;
    return previewData.listings.every((_, idx) => selections[idx] === false);
  }, [previewData, selections]);
  
  // ============================================
  // Handlers
  // ============================================
  
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files?.[0]) {
      handleFileUpload(files[0]);
    }
  }, []);
  
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files?.[0]) {
      handleFileUpload(files[0]);
    }
  }, []);
  
  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await ebayApi.uploadPreview(file);
      
      if (!result.success) {
        setError(result.message);
        return;
      }
      
      setPreviewData(result);
      
      // Initialize all as selected
      const initialSelections: Record<number, boolean> = {};
      result.listings.forEach((_, idx) => {
        initialSelections[idx] = true;
      });
      setSelections(initialSelections);
      
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
    } finally {
      setIsLoading(false);
    }
  };
  
  const toggleSelection = useCallback((idx: number) => {
    setSelections(prev => ({
      ...prev,
      [idx]: prev[idx] === false ? true : false,
    }));
  }, []);
  
  const toggleExpanded = useCallback((idx: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  }, []);
  
  const selectAll = useCallback(() => {
    if (!previewData?.listings) return;
    const newSelections: Record<number, boolean> = {};
    previewData.listings.forEach((_, idx) => {
      newSelections[idx] = true;
    });
    setSelections(newSelections);
  }, [previewData]);
  
  const selectNone = useCallback(() => {
    if (!previewData?.listings) return;
    const newSelections: Record<number, boolean> = {};
    previewData.listings.forEach((_, idx) => {
      newSelections[idx] = false;
    });
    setSelections(newSelections);
  }, [previewData]);
  
  const handleImport = async () => {
    if (!previewData || selectedListings.length === 0) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await ebayApi.importListings({
        report_start_date: previewData.report_start_date || new Date().toISOString().split('T')[0],
        report_end_date: previewData.report_end_date || new Date().toISOString().split('T')[0],
        listings: selectedListings.map(l => ({
          listing_title: l.listing_title,
          ebay_item_id: l.ebay_item_id,
          quantity_sold: l.quantity_sold,
          total_sales: l.total_sales,
          item_sales: l.item_sales,
          shipping_collected: l.shipping_collected,
          taxes_to_seller: l.taxes_to_seller,
          taxes_to_ebay: l.taxes_to_ebay,
          total_selling_costs: l.total_selling_costs,
          insertion_fees: l.insertion_fees,
          listing_upgrade_fees: l.listing_upgrade_fees,
          final_value_fees: l.final_value_fees,
          promoted_general_fees: l.promoted_general_fees,
          promoted_priority_fees: l.promoted_priority_fees,
          ads_express_fees: l.ads_express_fees,
          promoted_offsite_fees: l.promoted_offsite_fees,
          international_fees: l.international_fees,
          other_ebay_fees: l.other_ebay_fees,
          deposit_processing_fees: l.deposit_processing_fees,
          fee_credits: l.fee_credits,
          shipping_label_cost: l.shipping_label_cost,
          net_sales: l.net_sales,
          average_selling_price: l.average_selling_price,
          quantity_via_promoted: l.quantity_via_promoted,
          quantity_via_best_offer: l.quantity_via_best_offer,
          quantity_via_seller_offer: l.quantity_via_seller_offer,
        })),
        notes: importNotes || undefined,
      });
      
      if (result.success) {
        setImportResult({
          count: result.imported_count,
          totalSales: result.total_item_sales,
          totalNet: result.total_net_sales,
          batchId: result.batch_id || '',
        });
        setStep('success');
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setIsLoading(false);
    }
  };
  
  const resetForm = () => {
    setStep('upload');
    setPreviewData(null);
    setSelections({});
    setExpandedRows(new Set());
    setImportNotes('');
    setImportResult(null);
    setError(null);
  };
  
  // ============================================
  // Render
  // ============================================
  
  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">eBay Sales Import</h1>
        <p className="text-gray-600">
          Upload your eBay Listings & Sales Report to import sales data
        </p>
      </div>
      
      {/* Step Indicator */}
      <div className="flex items-center gap-4 mb-6">
        {[
          { key: 'upload', label: '1. Upload' },
          { key: 'preview', label: '2. Review' },
          { key: 'success', label: '3. Done' },
        ].map((s, idx) => (
          <div key={s.key} className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
              step === s.key 
                ? 'bg-blue-600 text-white' 
                : idx < ['upload', 'preview', 'success'].indexOf(step)
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-600'
            }`}>
              {idx < ['upload', 'preview', 'success'].indexOf(step) ? (
                <Check size={16} />
              ) : (
                idx + 1
              )}
            </div>
            <span className={`ml-2 font-medium ${
              step === s.key ? 'text-blue-600' : 'text-gray-600'
            }`}>
              {s.label}
            </span>
            {idx < 2 && (
              <div className="w-12 h-0.5 mx-3 bg-gray-200" />
            )}
          </div>
        ))}
      </div>
      
      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-medium text-red-900">Error</p>
            <p className="text-red-700">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-600 hover:text-red-800"
          >
            <X size={20} />
          </button>
        </div>
      )}
      
      {/* Step: Upload */}
      {step === 'upload' && (
        <div
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
            dragActive 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 bg-gray-50 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {isLoading ? (
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
              <p className="text-gray-600">Parsing file...</p>
            </div>
          ) : (
            <>
              <FileSpreadsheet className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">
                Drop your eBay CSV here
              </p>
              <p className="text-gray-600 mb-4">
                or click to browse
              </p>
              <label className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
                <Upload size={20} />
                Select File
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
              <p className="text-sm text-gray-500 mt-4">
                Supports eBay "Listings & Sales Report" CSV format
              </p>
            </>
          )}
        </div>
      )}
      
      {/* Step: Preview */}
      {step === 'preview' && previewData && (
        <div className="space-y-4">
          {/* Report Info */}
          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="font-semibold text-gray-900">Report Period</h3>
                <p className="text-gray-600">
                  {formatDate(previewData.report_start_date)} — {formatDate(previewData.report_end_date)}
                </p>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{previewData.total_rows}</p>
                  <p className="text-sm text-gray-500">Listings</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{previewData.total_quantity}</p>
                  <p className="text-sm text-gray-500">Items Sold</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(previewData.total_item_sales)}</p>
                  <p className="text-sm text-gray-500">Total Sales</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(previewData.total_net_sales)}</p>
                  <p className="text-sm text-gray-500">Net Revenue</p>
                </div>
              </div>
            </div>
            
            {/* Warnings */}
            {previewData.warnings.length > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm font-medium text-yellow-800 mb-1">Warnings:</p>
                <ul className="text-sm text-yellow-700 list-disc list-inside">
                  {previewData.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          {/* Selection Controls */}
          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={allSelected ? selectNone : selectAll}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                >
                  {allSelected ? (
                    <>
                      <MinusSquare size={16} />
                      Deselect All
                    </>
                  ) : noneSelected ? (
                    <>
                      <CheckSquare size={16} />
                      Select All
                    </>
                  ) : (
                    <>
                      <CheckSquare size={16} />
                      Select All
                    </>
                  )}
                </button>
                
                <span className="text-sm text-gray-600">
                  {selectedStats.count} of {previewData.listings.length} selected
                </span>
              </div>
              
              {/* Selected Stats */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1 text-gray-600">
                  <Package size={16} />
                  <span>{selectedStats.quantity} items</span>
                </div>
                <div className="flex items-center gap-1 text-gray-600">
                  <DollarSign size={16} />
                  <span>{formatCurrency(selectedStats.itemSales)} sales</span>
                </div>
                <div className="flex items-center gap-1 text-green-600 font-medium">
                  <TrendingUp size={16} />
                  <span>{formatCurrency(selectedStats.netSales)} net</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Listings */}
          <div className="bg-white border rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Listings</h3>
            
            <div className="max-h-[500px] overflow-y-auto">
              {previewData.listings.map((listing, idx) => (
                <ListingRow
                  key={listing.row_index}
                  listing={listing}
                  isSelected={selections[idx] !== false}
                  isExpanded={expandedRows.has(idx)}
                  onToggleSelect={() => toggleSelection(idx)}
                  onToggleExpand={() => toggleExpanded(idx)}
                />
              ))}
            </div>
          </div>
          
          {/* Import Notes */}
          <div className="bg-white border rounded-lg p-4">
            <label className="block">
              <span className="font-medium text-gray-700">Import Notes (optional)</span>
              <textarea
                value={importNotes}
                onChange={(e) => setImportNotes(e.target.value)}
                placeholder="Add any notes about this import..."
                className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={2}
              />
            </label>
          </div>
          
          {/* Actions */}
          <div className="flex items-center justify-between bg-white border rounded-lg p-4">
            <button
              onClick={resetForm}
              className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors"
            >
              ← Start Over
            </button>
            
            <button
              onClick={handleImport}
              disabled={isLoading || selectedStats.count === 0}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Importing...
                </>
              ) : (
                <>
                  <Check size={18} />
                  Import {selectedStats.count} Listings
                </>
              )}
            </button>
          </div>
        </div>
      )}
      
      {/* Step: Success */}
      {step === 'success' && importResult && (
        <div className="bg-white border rounded-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="text-green-600" size={32} />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Import Successful!</h2>
          <p className="text-gray-600 mb-6">
            Your eBay sales data has been imported to the database.
          </p>
          
          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-8">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-3xl font-bold text-gray-900">{importResult.count}</p>
              <p className="text-sm text-gray-500">Listings</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-3xl font-bold text-gray-900">{formatCurrency(importResult.totalSales)}</p>
              <p className="text-sm text-gray-500">Total Sales</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-3xl font-bold text-green-600">{formatCurrency(importResult.totalNet)}</p>
              <p className="text-sm text-gray-500">Net Revenue</p>
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={resetForm}
              className="px-6 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              Import Another
            </button>
            <a
              href="/sales"
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              View Sales →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

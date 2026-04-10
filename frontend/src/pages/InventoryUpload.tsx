/**
 * Inventory Upload Page
 *
 * Upload a spreadsheet (CSV/Excel) to bulk-add cards to inventory.
 * Three-step flow: Upload File -> Preview & Match -> Confirm Import
 */

import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Upload,
  FileSpreadsheet,
  Check,
  AlertCircle,
  ArrowRight,
  X,
  Search,
  CheckCircle2,
  HelpCircle,
  XCircle,
} from 'lucide-react';
import { apiFormRequest, apiRequest } from '../api/base';

// Types for the upload flow
interface PreviewRow {
  row_num: number;
  player: string | null;
  year: string | null;
  product: string | null;
  card_number: string | null;
  parallel: string | null;
  quantity: number;
  condition: string;
  is_signed: boolean;
  is_slabbed: boolean;
  grade_company: string | null;
  grade_value: number | null;
  cost: number | null;
  checklist_id: string | null;
  match_status: 'matched' | 'unmatched' | 'multiple';
}

interface PreviewResponse {
  total_rows: number;
  matched_rows: number;
  unmatched_rows: number;
  detected_columns: Record<string, string>;
  rows: PreviewRow[];
  sample_data: Record<string, string>[];
}

interface ConfirmItem {
  checklist_id: string;
  quantity: number;
  raw_condition: string;
  is_signed: boolean;
  is_slabbed: boolean;
  grade_company: string | null;
  grade_value: number | null;
  card_cost: number;
}

interface ConfirmResponse {
  created: number;
  updated: number;
  errors: string[];
}

type Step = 'select' | 'preview' | 'result';

export default function InventoryUpload() {
  const [step, setStep] = useState<Step>('select');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [result, setResult] = useState<ConfirmResponse | null>(null);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  // Track which rows user wants to import (by row_num)
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  // Preview mutation - upload file and get match results
  const previewMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return apiFormRequest<PreviewResponse>('/inventory/upload/preview', formData);
    },
    onSuccess: (data) => {
      setPreview(data);
      // Auto-select all matched rows
      const matchedRowNums = new Set(
        data.rows
          .filter((r) => r.checklist_id && (r.match_status === 'matched' || r.match_status === 'multiple'))
          .map((r) => r.row_num)
      );
      setSelectedRows(matchedRowNums);
      setStep('preview');
      setError('');
    },
    onError: (err: Error) => setError(err.message),
  });

  // Confirm mutation - send selected items to create inventory
  const confirmMutation = useMutation({
    mutationFn: (items: ConfirmItem[]) =>
      apiRequest<ConfirmResponse>('/inventory/upload/confirm', {
        method: 'POST',
        body: JSON.stringify({ items }),
      }),
    onSuccess: (data) => {
      setResult(data);
      setStep('result');
      setError('');
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      setSelectedFile(file);
      previewMutation.mutate(file);
    } else {
      setError('Please upload a CSV or Excel file');
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      previewMutation.mutate(file);
    }
  };

  const handleConfirm = () => {
    if (!preview) return;

    const items: ConfirmItem[] = preview.rows
      .filter((r) => selectedRows.has(r.row_num) && r.checklist_id)
      .map((r) => ({
        checklist_id: r.checklist_id!,
        quantity: r.quantity,
        raw_condition: r.condition || 'NM',
        is_signed: r.is_signed,
        is_slabbed: r.is_slabbed,
        grade_company: r.grade_company,
        grade_value: r.grade_value,
        card_cost: r.cost || 0,
      }));

    if (items.length === 0) {
      setError('No matched rows selected for import');
      return;
    }

    confirmMutation.mutate(items);
  };

  const toggleRow = (rowNum: number) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowNum)) {
        next.delete(rowNum);
      } else {
        next.add(rowNum);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (!preview) return;
    const matchable = preview.rows.filter((r) => r.checklist_id);
    if (selectedRows.size === matchable.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(matchable.map((r) => r.row_num)));
    }
  };

  const resetUpload = () => {
    setStep('select');
    setSelectedFile(null);
    setPreview(null);
    setResult(null);
    setError('');
    setSelectedRows(new Set());
  };

  const matchStatusIcon = (status: string) => {
    switch (status) {
      case 'matched':
        return <CheckCircle2 size={16} className="text-green-500" />;
      case 'multiple':
        return <HelpCircle size={16} className="text-amber-500" />;
      case 'unmatched':
        return <XCircle size={16} className="text-red-400" />;
      default:
        return null;
    }
  };

  const matchStatusLabel = (status: string) => {
    switch (status) {
      case 'matched':
        return 'Matched';
      case 'multiple':
        return 'Best guess';
      case 'unmatched':
        return 'No match';
      default:
        return status;
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Upload Inventory</h1>
        <p className="text-gray-500 mt-1">
          Import cards from a CSV or Excel spreadsheet into your inventory
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-4 mb-8">
        {['Upload File', 'Preview & Match', 'Complete'].map((label, idx) => {
          const stepNum = idx + 1;
          const isActive =
            (step === 'select' && stepNum === 1) ||
            (step === 'preview' && stepNum === 2) ||
            (step === 'result' && stepNum === 3);
          const isComplete =
            (step === 'preview' && stepNum === 1) ||
            (step === 'result' && stepNum <= 2);

          return (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  isComplete
                    ? 'bg-green-500 text-white'
                    : isActive
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {isComplete ? <Check size={16} /> : stepNum}
              </div>
              <span className={`text-sm ${isActive ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                {label}
              </span>
              {idx < 2 && <ArrowRight className="text-gray-300 ml-2" size={16} />}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle size={18} />
          {error}
          <button onClick={() => setError('')} className="ml-auto">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Step 1: Select File */}
      {step === 'select' && (
        <div className="space-y-6">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
              isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50'
            }`}
          >
            <Upload className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Drop your inventory spreadsheet here</h3>
            <p className="text-gray-500 mb-4">Supports CSV and Excel files (.csv, .xlsx, .xls)</p>
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors">
              <FileSpreadsheet size={18} />
              Choose File
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>

            {previewMutation.isPending && <p className="mt-4 text-blue-600">Analyzing file...</p>}
          </div>

          {/* Expected format help */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="font-medium text-gray-900 mb-3">Expected Spreadsheet Format</h3>
            <p className="text-sm text-gray-600 mb-4">
              Your spreadsheet should have columns for card identification. The system will automatically detect and map columns.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Player', desc: 'Player name', required: true },
                { label: 'Year', desc: 'Card year', required: false },
                { label: 'Product / Set', desc: 'Product line', required: false },
                { label: 'Card #', desc: 'Card number', required: false },
                { label: 'Quantity', desc: 'Default: 1', required: false },
                { label: 'Condition', desc: 'Default: NM', required: false },
                { label: 'Signed', desc: 'Yes/No', required: false },
                { label: 'Cost', desc: 'Per card cost', required: false },
              ].map((col) => (
                <div key={col.label} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm font-medium text-gray-900">
                    {col.label}
                    {col.required && <span className="text-red-500 ml-1">*</span>}
                  </p>
                  <p className="text-xs text-gray-500">{col.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Preview & Match */}
      {step === 'preview' && preview && (
        <div className="space-y-6">
          {/* Summary Bar */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <FileSpreadsheet className="text-green-500" size={24} />
              <div>
                <p className="font-medium text-gray-900">{selectedFile?.name}</p>
                <p className="text-sm text-gray-500">{preview.total_rows} rows found</p>
              </div>
            </div>

            {/* Match Stats */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-green-600">{preview.matched_rows}</p>
                <p className="text-xs text-green-700">Matched</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-red-500">{preview.unmatched_rows}</p>
                <p className="text-xs text-red-600">Unmatched</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-blue-600">{selectedRows.size}</p>
                <p className="text-xs text-blue-700">Selected for Import</p>
              </div>
            </div>

            {/* Detected Columns */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Detected Columns</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(preview.detected_columns).map(([field, column]) => (
                  <span
                    key={field}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded text-xs"
                  >
                    <Check size={12} />
                    {field} &rarr; "{column}"
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Preview Table */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Preview ({preview.rows.length} rows)</h4>
              <button
                onClick={toggleAll}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {selectedRows.size === preview.rows.filter((r) => r.checklist_id).length
                  ? 'Deselect All'
                  : 'Select All Matched'}
              </button>
            </div>

            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 border-b z-10">
                  <tr>
                    <th className="px-3 py-2 text-left w-10"></th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Status</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Player</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Year</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Product</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Card #</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Qty</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Cond</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Signed</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {preview.rows.map((row) => {
                    const isSelected = selectedRows.has(row.row_num);
                    const canSelect = !!row.checklist_id;

                    return (
                      <tr
                        key={row.row_num}
                        className={`${
                          row.match_status === 'unmatched'
                            ? 'bg-red-50/50'
                            : isSelected
                            ? 'bg-blue-50/50'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <td className="px-3 py-2">
                          {canSelect && (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleRow(row.row_num)}
                              className="rounded border-gray-300"
                            />
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            {matchStatusIcon(row.match_status)}
                            <span
                              className={`text-xs ${
                                row.match_status === 'matched'
                                  ? 'text-green-600'
                                  : row.match_status === 'multiple'
                                  ? 'text-amber-600'
                                  : 'text-red-500'
                              }`}
                            >
                              {matchStatusLabel(row.match_status)}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-gray-900 font-medium whitespace-nowrap">
                          {row.player || '-'}
                        </td>
                        <td className="px-3 py-2 text-gray-700">{row.year || '-'}</td>
                        <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{row.product || '-'}</td>
                        <td className="px-3 py-2 text-gray-700">{row.card_number || '-'}</td>
                        <td className="px-3 py-2 text-gray-700">{row.quantity}</td>
                        <td className="px-3 py-2 text-gray-700">{row.condition}</td>
                        <td className="px-3 py-2">
                          {row.is_signed && (
                            <span className="inline-flex px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                              Signed
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-gray-700">
                          {row.cost != null ? `$${row.cost.toFixed(2)}` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Unmatched rows warning */}
          {preview.unmatched_rows > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle size={18} className="text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800">
                    {preview.unmatched_rows} rows couldn't be matched to existing cards
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    These rows will be skipped. Make sure the cards exist in a checklist first, or add them via Purchases.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={resetUpload}
              className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedRows.size === 0 || confirmMutation.isPending}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {confirmMutation.isPending
                ? 'Importing...'
                : `Import ${selectedRows.size} Cards to Inventory`}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Result */}
      {step === 'result' && result && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="text-green-600" size={32} />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Import Complete!</h3>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 my-6 max-w-lg mx-auto">
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-2xl font-bold text-green-600">{result.created}</p>
              <p className="text-sm text-gray-500">New Items</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-2xl font-bold text-blue-600">{result.updated}</p>
              <p className="text-sm text-gray-500">Updated</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-2xl font-bold text-gray-700">{result.created + result.updated}</p>
              <p className="text-sm text-gray-500">Total</p>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="mt-4 text-left bg-amber-50 border border-amber-200 rounded-lg p-4 max-w-lg mx-auto">
              <h4 className="font-medium text-amber-800 mb-2">
                {result.errors.length} items had issues:
              </h4>
              <ul className="text-sm text-amber-700 space-y-1 max-h-40 overflow-y-auto">
                {result.errors.slice(0, 10).map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
                {result.errors.length > 10 && (
                  <li className="text-amber-600">...and {result.errors.length - 10} more</li>
                )}
              </ul>
            </div>
          )}

          <button
            onClick={resetUpload}
            className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Upload Another File
          </button>
        </div>
      )}
    </div>
  );
}

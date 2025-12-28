import { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Upload, FileSpreadsheet, Check, AlertCircle, ChevronDown, ArrowRight } from 'lucide-react';
import { api } from '../api';
import type { ChecklistUploadPreview, ChecklistUploadResult } from '../types';

export default function ChecklistUpload() {
  const [step, setStep] = useState<'select' | 'preview' | 'result'>('select');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedProductLine, setSelectedProductLine] = useState('');
  const [preview, setPreview] = useState<ChecklistUploadPreview | null>(null);
  const [result, setResult] = useState<ChecklistUploadResult | null>(null);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const { data: productLines } = useQuery({
    queryKey: ['product-lines'],
    queryFn: () => api.products.getProductLines(),
  });

  const previewMutation = useMutation({
    mutationFn: (file: File) => api.checklists.previewChecklistUpload(file),
    onSuccess: (data) => {
      setPreview(data);
      setStep('preview');
      setError('');
    },
    onError: (err: Error) => setError(err.message),
  });

  const uploadMutation = useMutation({
    mutationFn: ({ file, productLineId }: { file: File; productLineId: string }) =>
      api.checklists.uploadChecklist(file, productLineId),
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

  const handleUpload = () => {
    if (!selectedFile || !selectedProductLine) {
      setError('Please select a product line');
      return;
    }
    uploadMutation.mutate({ file: selectedFile, productLineId: selectedProductLine });
  };

  const resetUpload = () => {
    setStep('select');
    setSelectedFile(null);
    setSelectedProductLine('');
    setPreview(null);
    setResult(null);
    setError('');
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Upload Checklist</h1>
        <p className="text-gray-500 mt-1">Import a checklist CSV or Excel file from Topps, Bowman, or other sources</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-4 mb-8">
        {['Select File', 'Preview', 'Complete'].map((label, idx) => {
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
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                isComplete ? 'bg-green-500 text-white' :
                isActive ? 'bg-blue-600 text-white' :
                'bg-gray-200 text-gray-500'
              }`}>
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
        </div>
      )}

      {/* Step 1: Select File */}
      {step === 'select' && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
            isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50'
          }`}
        >
          <Upload className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Drop your checklist file here
          </h3>
          <p className="text-gray-500 mb-4">
            Supports CSV and Excel files (.csv, .xlsx, .xls)
          </p>
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

          {previewMutation.isPending && (
            <p className="mt-4 text-blue-600">Analyzing file...</p>
          )}
        </div>
      )}

      {/* Step 2: Preview */}
      {step === 'preview' && preview && (
        <div className="space-y-6">
          {/* File Info */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <FileSpreadsheet className="text-green-500" size={24} />
              <div>
                <p className="font-medium text-gray-900">{selectedFile?.name}</p>
                <p className="text-sm text-gray-500">{preview.total_rows} rows detected</p>
              </div>
            </div>

            {/* Product Line Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Product Line *
              </label>
              <div className="relative">
                <select
                  value={selectedProductLine}
                  onChange={(e) => setSelectedProductLine(e.target.value)}
                  className="w-full appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Choose a product line...</option>
                  {productLines?.map((pl) => (
                    <option key={pl.id} value={pl.id}>
                      {pl.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
              </div>
            </div>

            {/* Detected Columns */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Detected Column Mappings</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(preview.detected_columns).map(([field, column]) => (
                  <span key={field} className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded text-sm">
                    <Check size={14} />
                    {field}: "{column}"
                  </span>
                ))}
              </div>
              {preview.unmapped_columns.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500">
                    Unmapped columns: {preview.unmapped_columns.join(', ')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sample Data */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b">
              <h4 className="font-medium text-gray-900">Sample Data (first 10 rows)</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    {preview.sample_rows.length > 0 &&
                      Object.keys(preview.sample_rows[0]).map((col) => (
                        <th key={col} className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {preview.sample_rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      {Object.values(row).map((val, vidx) => (
                        <td key={vidx} className="px-3 py-2 text-gray-700 whitespace-nowrap">
                          {String(val || '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={resetUpload}
              className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!selectedProductLine || uploadMutation.isPending}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploadMutation.isPending ? 'Importing...' : `Import ${preview.total_rows} Cards`}
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
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-2xl font-bold text-gray-900">{result.total_rows}</p>
              <p className="text-sm text-gray-500">Total Rows</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-2xl font-bold text-green-600">{result.cards_created}</p>
              <p className="text-sm text-gray-500">Cards Created</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-2xl font-bold text-blue-600">{result.cards_updated}</p>
              <p className="text-sm text-gray-500">Cards Updated</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-2xl font-bold text-purple-600">{result.players_created}</p>
              <p className="text-sm text-gray-500">New Players</p>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="mt-4 text-left bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="font-medium text-amber-800 mb-2">
                {result.errors.length} rows had issues:
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

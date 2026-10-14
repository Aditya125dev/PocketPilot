import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Download, 
  ArrowRight,
  ShieldAlert,
  RefreshCw
} from 'lucide-react';
import { api } from '../api/client';
import AlertBanner from '../components/AlertBanner';

export default function CsvImport({ setActiveTab }) {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);

  const sampleCsvContent = `date,merchant,category,amount,description,payment_method,notes
2026-04-01,Campus Bookstore,Books & Supplies,34.50,Calculus study guide and notebook,Card,Midterm prep
2026-04-02,Starbucks,Food & Dining,6.75,Iced Americano,Apple Pay,Morning study session
2026-04-03,Metro Transit,Transportation,2.50,Subway ticket,Card,Campus commute
2026-04-05,Trader Joe's,Food & Dining,52.30,Weekly dorm groceries,Card,Produce and snacks
2026-04-06,Spotify,Subscriptions,5.99,Spotify Student Premium,Card,Monthly recurring music subscription
2026-04-07,University Print Shop,Books & Supplies,12.00,Project report binding,Card,Term project submission
2026-04-08,Chipotle,Food & Dining,13.25,Burrito bowl with guacamole,Card,Dinner with classmates
2026-04-10,Netflix,Subscriptions,15.49,Netflix Standard Plan,Card,Monthly video streaming subscription
2026-04-11,CVS Pharmacy,Personal Care,18.40,Vitamins and toiletries,Card,Personal care items
2026-04-12,Campus Cafe,Food & Dining,5.50,Cold brew coffee,Card,Afternoon library break`;

  const downloadSampleCsv = () => {
    const blob = new Blob([sampleCsvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'sample_student_expenses.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      setError('Please select a valid .csv file.');
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('File size exceeds 5MB limit.');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setImportResult(null);
    setLoading(true);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const previewData = await api.previewCsv(formData);
      setPreview(previewData);
      if (!previewData.is_valid_file) {
        setError(previewData.validation_error || 'Malformed CSV format.');
      }
    } catch (err) {
      setError(err.message || 'Failed to parse CSV preview.');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!file) return;

    setImporting(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const result = await api.uploadCsv(formData);
      setImportResult(result);
    } catch (err) {
      setError(err.message || 'CSV Import failed.');
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setImportResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">CSV Batch Import Engine</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Validate, preview, sanitize, and persist bank statement or campus expense CSV files.
          </p>
        </div>
        <button
          onClick={downloadSampleCsv}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold border border-slate-300 transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4 text-slate-600" />
          Download Sample Student CSV
        </button>
      </div>

      {error && (
        <AlertBanner type="error" title="Import Error" message={error} onDismiss={() => setError(null)} />
      )}

      {/* Upload Zone */}
      {!importResult && (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center hover:border-indigo-500 transition-colors">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv"
            className="hidden"
          />
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center mb-4">
            <UploadCloud className="w-7 h-7" />
          </div>

          <h3 className="text-base font-bold text-slate-900 mb-1">
            {file ? file.name : 'Choose a CSV file or drag & drop here'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
            Supported columns: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">date</code>,{' '}
            <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">merchant</code>,{' '}
            <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">category</code>,{' '}
            <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">amount</code>,{' '}
            <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">description</code>. Max size 5MB.
          </p>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              Select CSV File
            </button>
            {file && (
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Pre-flight Preview Table */}
      {preview && !importResult && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                Pre-Flight Validation Preview
              </h2>
              <p className="text-xs text-slate-500">
                Found {preview.total_rows} rows &bull;{' '}
                <span className="text-emerald-600 font-semibold">{preview.valid_rows_count} valid</span>,{' '}
                <span className={preview.invalid_rows_count > 0 ? 'text-rose-600 font-semibold' : 'text-slate-500'}>
                  {preview.invalid_rows_count} invalid
                </span>
              </p>
            </div>

            {preview.is_valid_file && (
              <button
                disabled={importing || preview.valid_rows_count === 0}
                onClick={handleExecuteImport}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {importing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Persisting to Database...
                  </>
                ) : (
                  <>
                    Commit & Import {preview.valid_rows_count} Records
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>

          {/* Sample Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Row #</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Merchant</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {preview.sample_preview.map((r) => (
                  <tr key={r.row_number} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">#{r.row_number}</td>
                    <td className="py-2.5 px-3">
                      {r.is_valid ? (
                        <span className="flex items-center gap-1 text-emerald-600 font-medium text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-rose-600 font-medium text-[11px]" title={r.error_message}>
                          <XCircle className="w-3.5 h-3.5" /> Error
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px]">{r.date || '-'}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{r.merchant || '-'}</td>
                    <td className="py-2.5 px-3">{r.category || '-'}</td>
                    <td className="py-2.5 px-3 max-w-xs truncate text-slate-600">{r.description || '-'}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                      {r.amount !== null ? `$${r.amount.toFixed(2)}` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-400 italic">Displaying first 10 rows for validation inspection.</p>
        </div>
      )}

      {/* Import Completed Summary Result */}
      {importResult && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-2xl ${importResult.success ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              {importResult.success ? <CheckCircle2 className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {importResult.success ? 'CSV Batch Import Successful!' : 'Batch Import Finished with Warnings'}
              </h2>
              <p className="text-xs text-slate-600 mt-1">{importResult.message}</p>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <span className="text-[11px] text-slate-500 uppercase font-semibold">Total Rows</span>
              <p className="text-xl font-bold text-slate-900">{importResult.total_processed}</p>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 uppercase font-semibold">Imported</span>
              <p className="text-xl font-bold text-emerald-600">{importResult.imported_count}</p>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 uppercase font-semibold">Duplicates Skipped</span>
              <p className="text-xl font-bold text-indigo-600">{importResult.duplicate_count}</p>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 uppercase font-semibold">Rejected</span>
              <p className="text-xl font-bold text-rose-600">{importResult.failed_count}</p>
            </div>
          </div>

          {/* Errors list if any */}
          {importResult.errors?.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Rejected Row Explanations ({importResult.errors.length})
              </h4>
              <div className="max-h-40 overflow-y-auto space-y-1.5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
                {importResult.errors.map((err, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="font-mono font-semibold">Row #{err.row_number}:</span>
                    <span>{err.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
            >
              Upload Another CSV
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab('transactions')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs"
              >
                View in Transactions &rarr;
              </button>
              <button
                onClick={() => setActiveTab('dashboard')}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-xs"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

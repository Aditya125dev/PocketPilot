import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  AlertTriangle, 
  Info, 
  TrendingUp, 
  Calculator, 
  CheckCircle2,
  HelpCircle,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import { api } from '../api/client';
import AlertBanner from '../components/AlertBanner';
import EmptyState from '../components/EmptyState';

export default function Insights() {
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnomalies = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAnomalies(30);
      setAnomalies(data);
    } catch (err) {
      setError(err.message || 'Failed to detect spending anomalies.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnomalies();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Spending Anomaly Intelligence
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full font-semibold">
              Statistical Rules Engine
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Identifies unusually large student purchases using explainable statistical thresholds rather than opaque ML.
          </p>
        </div>
        <button
          onClick={fetchAnomalies}
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
        >
          {loading ? 'Evaluating...' : 'Refresh Anomaly Scan'}
        </button>
      </div>

      {error && (
        <AlertBanner type="error" title="Error" message={error} onDismiss={() => setError(null)} />
      )}

      {/* Explanatory Technical Notice (Explicitly addresses requirement to avoid claiming trained ML) */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white shadow-sm border border-slate-800 space-y-3">
        <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs uppercase tracking-wider">
          <Calculator className="w-4 h-4 text-indigo-400" />
          Explainable Statistical Methodology (No Black-Box ML)
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          PocketPilot employs <strong>leave-one-out statistical baseline rules</strong> and <strong>median multipliers</strong>.
          Every flagged transaction is evaluated against peer transactions in the exact same spending category.
          When a purchase exceeds the category peer mean by more than <strong>2.5 standard deviations</strong> (or exceeds 3x median in sparse categories), it is surfaced with its mathematical explanation.
        </p>
        <div className="flex flex-wrap gap-4 pt-1 text-[11px] text-slate-400 border-t border-slate-800">
          <span>&bull; Robust against outlier masking</span>
          <span>&bull; Handles small student sample sizes gracefully</span>
          <span>&bull; 100% transparent and verifiable formulas</span>
        </div>
      </div>

      {/* Flagged Transactions List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">
            Flagged Transactions ({anomalies.length})
          </h2>
          <span className="text-xs text-slate-500">Sorted by recency and deviation magnitude</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs animate-pulse">
            Computing category distributions and statistical variances...
          </div>
        ) : anomalies.length === 0 ? (
          <EmptyState
            title="No spending anomalies detected"
            description="All your recorded transactions align closely with typical historical spending patterns within their categories."
          />
        ) : (
          <div className="space-y-4">
            {anomalies.map((item) => {
              const isHigh = item.severity === 'high';
              const deviation = item.amount - item.baseline_category_mean;

              return (
                <div
                  key={item.transaction_id}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${isHigh ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900">{item.merchant}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isHigh ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {item.severity} severity
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                          <span>Category: <strong className="text-slate-700">{item.category}</strong></span>
                          <span>&bull;</span>
                          <span className="font-mono text-[11px]">{item.date}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-extrabold text-slate-900">
                        ${item.amount.toFixed(2)}
                      </div>
                      <span className="text-xs font-semibold text-rose-600">
                        +${deviation.toFixed(2)} over category baseline
                      </span>
                    </div>
                  </div>

                  {/* Plain Language Explanation */}
                  <div className="space-y-2 text-xs">
                    <p className="text-slate-800 font-medium leading-relaxed">
                      {item.explanation}
                    </p>

                    {/* Technical Mathematical Rule details */}
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 space-y-1 text-[11px] font-mono">
                      <div className="flex items-center justify-between text-slate-500">
                        <span>Rule Applied:</span>
                        <span className="font-semibold text-slate-700">{item.statistical_rule}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-500">
                        <span>Category Peer Mean:</span>
                        <span className="font-semibold text-slate-700">${item.baseline_category_mean.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-500">
                        <span>Computed Anomaly Cutoff:</span>
                        <span className="font-semibold text-slate-700">${item.threshold_value.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

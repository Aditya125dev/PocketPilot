import React, { useState, useEffect } from 'react';
import { 
  Repeat, 
  Sparkles, 
  CheckCircle2, 
  HelpCircle, 
  XCircle, 
  Trash2, 
  AlertCircle,
  Clock,
  DollarSign,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { api } from '../api/client';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';
import AlertBanner from '../components/AlertBanner';
import EmptyState from '../components/EmptyState';

export default function Subscriptions() {
  const [intelligence, setIntelligence] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchIntelligence = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getSubscriptionIntelligence();
      setIntelligence(data);
    } catch (err) {
      setError(err.message || 'Failed to analyze subscriptions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntelligence();
  }, []);

  const handleUpdateStatus = async (subId, newStatus) => {
    setActionLoading(true);
    try {
      await api.updateSubscriptionStatus(subId, newStatus);
      await fetchIntelligence();
    } catch (err) {
      setError(err.message || 'Failed to update status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveCandidate = async (candidate, status = 'active') => {
    setActionLoading(true);
    try {
      await api.saveSubscription({
        merchant_name: candidate.merchant_name,
        category: candidate.category || 'Subscriptions',
        amount: candidate.estimated_amount,
        billing_cycle: candidate.billing_cycle,
        status: status,
        confidence_score: candidate.confidence_score,
        explanation: candidate.explanation,
        detected_frequency_days: candidate.frequency_days,
        last_charged_date: candidate.dates?.length > 0 ? candidate.dates[candidate.dates.length - 1] : null
      });
      await fetchIntelligence();
    } catch (err) {
      setError(err.message || 'Failed to save subscription.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSaved = async (subId) => {
    setActionLoading(true);
    try {
      await api.deleteSubscription(subId);
      await fetchIntelligence();
    } catch (err) {
      setError(err.message || 'Failed to delete subscription record.');
    } finally {
      setActionLoading(false);
    }
  };

  const {
    estimated_monthly_recurring_spend = 0,
    active_subscriptions_count = 0,
    saved_subscriptions = [],
    detected_candidates = [],
    unreviewed_alerts_count = 0
  } = intelligence || {};

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Subscription Leak Intelligence
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full font-semibold">
              Explainable Rule Engine
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Detects recurring payments through interval periodicity, merchant normalization, and amount variance.
          </p>
        </div>
        <button
          onClick={fetchIntelligence}
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
        >
          {loading ? 'Re-analyzing...' : 'Re-run Detection Engine'}
        </button>
      </div>

      {error && (
        <AlertBanner type="error" title="Error" message={error} onDismiss={() => setError(null)} />
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Monthly Recurring Spend"
          value={`$${estimated_monthly_recurring_spend.toFixed(2)}`}
          icon={DollarSign}
          subtitle={`Annualized ~$${(estimated_monthly_recurring_spend * 12).toFixed(2)}`}
          badge="Committed Outflow"
          badgeColor="bg-indigo-50 text-indigo-700"
        />
        <StatCard
          title="Active Subscriptions"
          value={active_subscriptions_count}
          icon={Repeat}
          subtitle="Recognized active recurring services"
          badge={active_subscriptions_count > 4 ? 'High Volume' : 'Manageable'}
          badgeColor={active_subscriptions_count > 4 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}
        />
        <StatCard
          title="Unreviewed Recurring Alerts"
          value={unreviewed_alerts_count}
          icon={Sparkles}
          subtitle="Detected candidates awaiting your confirmation"
          badge={unreviewed_alerts_count > 0 ? 'Requires Review' : 'Up to Date'}
          badgeColor={unreviewed_alerts_count > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}
        />
      </div>

      {/* Transparent Logic Banner */}
      <div className="p-4 rounded-xl bg-slate-900 text-slate-300 border border-slate-800 text-xs flex items-start gap-3">
        <HelpCircle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-white">How PocketPilot Identifies Recurring Subscriptions</p>
          <p className="leading-relaxed text-slate-300">
            PocketPilot compares normalized merchant names, evaluates inter-transaction time deltas (e.g., 25–35 days for monthly subscriptions), and inspects amount variance. To prevent false positives, merchants with widely varying bills (e.g. groceries or coffee) are marked as <em>Potential</em> with low confidence rather than assumed to be fixed subscriptions.
          </p>
        </div>
      </div>

      {/* Detected Candidates Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">
            Detected Candidates from Transaction History ({detected_candidates.length})
          </h2>
          <span className="text-xs text-slate-500">Evaluated across all historical payments</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs animate-pulse">
            Analyzing transaction frequencies and amounts...
          </div>
        ) : detected_candidates.length === 0 ? (
          <EmptyState
            title="No recurring patterns detected"
            description="As you add or import multiple months of transactions, repeated subscriptions like Spotify, Netflix, or gym memberships will be detected here."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {detected_candidates.map((cand, idx) => {
              const isHigh = cand.confidence_label === 'High';
              const isMed = cand.confidence_label === 'Medium';

              return (
                <div 
                  key={idx}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 text-sm">{cand.merchant_name}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isHigh 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : isMed 
                              ? 'bg-amber-100 text-amber-800' 
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {cand.confidence_label} Confidence ({Math.round(cand.confidence_score * 100)}%)
                          </span>
                        </div>
                        <span className="text-xs text-slate-400 block mt-0.5">{cand.category}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-extrabold text-slate-900">
                          ${cand.estimated_amount.toFixed(2)}
                        </span>
                        <span className="text-[11px] text-slate-500 block capitalize">
                          /{cand.billing_cycle}
                        </span>
                      </div>
                    </div>

                    {/* Evidence & Explanation Box */}
                    <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200/70 text-xs space-y-1.5 text-slate-600">
                      <p className="font-medium text-slate-800 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-indigo-600" />
                        Cadence: ~{cand.frequency_days} days apart ({cand.occurrences_count} payments logged)
                      </p>
                      <p className="text-[11px] leading-relaxed text-slate-600 italic">
                        "{cand.explanation}"
                      </p>
                    </div>

                    {/* Historical Payment Samples */}
                    <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1 flex-wrap">
                      <span className="font-medium">Observed dates:</span>
                      {cand.dates.map((d, i) => (
                        <span key={i} className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-[10px]">
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    {cand.is_saved ? (
                      <span className="flex items-center gap-1.5 font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Tracked ({cand.saved_status})
                      </span>
                    ) : (
                      <div className="flex items-center gap-2 w-full justify-end">
                        <button
                          disabled={actionLoading}
                          onClick={() => handleSaveCandidate(cand, 'under_review')}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium text-[11px]"
                        >
                          Review Later
                        </button>
                        <button
                          disabled={actionLoading}
                          onClick={() => handleSaveCandidate(cand, 'active')}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] shadow-xs"
                        >
                          Confirm Active
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Managed Subscriptions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Tracked Student Subscriptions ({saved_subscriptions.length})
            </h2>
            <p className="text-xs text-slate-500">Manage status (Active, Cancelled, Under Review)</p>
          </div>
        </div>

        {saved_subscriptions.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">
            No confirmed subscriptions yet. Use the detected candidates above to acknowledge your recurring memberships.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Merchant</th>
                  <th className="py-3 px-4">Monthly Rate</th>
                  <th className="py-3 px-4">Cadence</th>
                  <th className="py-3 px-4">Current Status</th>
                  <th className="py-3 px-4">Change Status</th>
                  <th className="py-3 px-4 text-right">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {saved_subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {sub.merchant_name}
                      <span className="block text-[10px] font-normal text-slate-400">{sub.category}</span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">${sub.amount.toFixed(2)}</td>
                    <td className="py-3.5 px-4 capitalize text-slate-500">{sub.billing_cycle}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                        sub.status === 'active' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : sub.status === 'cancelled' 
                          ? 'bg-slate-100 text-slate-600 line-through' 
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {sub.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <select
                        value={sub.status}
                        onChange={(e) => handleUpdateStatus(sub.id, e.target.value)}
                        className="py-1 px-2 rounded-md border border-slate-300 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                      >
                        <option value="active">Active</option>
                        <option value="under_review">Under Review</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleDeleteSaved(sub.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-slate-100"
                        title="Remove subscription record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

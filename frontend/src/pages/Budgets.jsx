import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  PieChart, 
  AlertTriangle, 
  CheckCircle2, 
  Edit3, 
  Trash2, 
  Calendar,
  Wallet,
  TrendingDown
} from 'lucide-react';
import { api } from '../api/client';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import AlertBanner from '../components/AlertBanner';

const PRESET_CATEGORIES = [
  'Food & Dining',
  'Housing & Utilities',
  'Books & Supplies',
  'Entertainment',
  'Subscriptions',
  'Transportation',
  'Personal Care',
  'Health & Medical',
  'Other'
];

export default function Budgets() {
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [activeBudget, setActiveBudget] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    category: 'Food & Dining',
    monthly_limit: '',
    month: today.getMonth() + 1,
    year: today.getFullYear()
  });
  const [formError, setFormError] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const fetchBudgetOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getBudgetOverview(selectedMonth, selectedYear);
      setOverview(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch budget overview.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgetOverview();
  }, [selectedMonth, selectedYear]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const openCreateModal = () => {
    setFormData({
      category: 'Food & Dining',
      monthly_limit: '',
      month: selectedMonth,
      year: selectedYear
    });
    setFormError(null);
    setIsCreateOpen(true);
  };

  const openEditModal = (b) => {
    setActiveBudget(b);
    setFormData({
      category: b.category,
      monthly_limit: b.monthly_limit.toString(),
      month: b.month,
      year: b.year
    });
    setFormError(null);
    setIsEditOpen(true);
  };

  const openDeleteModal = (b) => {
    setActiveBudget(b);
    setIsDeleteOpen(true);
  };

  const handleSaveBudget = async (e) => {
    e.preventDefault();
    setFormError(null);

    const limit = parseFloat(formData.monthly_limit);
    if (isNaN(limit) || limit <= 0) {
      setFormError('Monthly limit must be a positive number.');
      return;
    }

    setFormSubmitting(true);
    try {
      if (isEditOpen && activeBudget) {
        await api.updateBudget(activeBudget.id, { monthly_limit: limit });
        setIsEditOpen(false);
      } else {
        await api.createBudget({
          category: formData.category,
          monthly_limit: limit,
          month: Number(formData.month),
          year: Number(formData.year)
        });
        setIsCreateOpen(false);
      }
      fetchBudgetOverview();
    } catch (err) {
      setFormError(err.message || 'Failed to save budget.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteBudget = async () => {
    if (!activeBudget) return;
    setFormSubmitting(true);
    try {
      await api.deleteBudget(activeBudget.id);
      setIsDeleteOpen(false);
      fetchBudgetOverview();
    } catch (err) {
      setError(err.message || 'Failed to delete budget.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const {
    total_budget = 0,
    total_spent = 0,
    remaining = 0,
    overall_percentage = 0,
    budgets = []
  } = overview || {};

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Category Budgets</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Set student spending targets, monitor utilization, and receive overspending warnings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Month selector */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="text-xs font-semibold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
            >
              {monthNames.map((m, idx) => (
                <option key={m} value={idx + 1}>{m}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="text-xs font-semibold text-slate-700 bg-transparent focus:outline-none cursor-pointer border-l border-slate-200 pl-2"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Budget
          </button>
        </div>
      </div>

      {error && (
        <AlertBanner type="error" title="Budget operation error" message={error} onDismiss={() => setError(null)} />
      )}

      {/* Aggregate Overview Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Student Budget Utilization
            </span>
            <div className="flex items-baseline gap-3">
              <h2 className="text-3xl font-extrabold text-slate-900">
                ${total_spent.toFixed(2)}{' '}
                <span className="text-sm font-normal text-slate-500">of ${total_budget.toFixed(2)} limit</span>
              </h2>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                overall_percentage >= 100 
                  ? 'bg-rose-100 text-rose-800' 
                  : overall_percentage >= 80 
                  ? 'bg-amber-100 text-amber-800' 
                  : 'bg-emerald-100 text-emerald-800'
              }`}>
                {overall_percentage}% Spent
              </span>
            </div>
            <p className="text-xs text-slate-500">
              ${remaining.toFixed(2)} remaining for {monthNames[selectedMonth - 1]} {selectedYear}
            </p>
          </div>

          <div className="w-full md:w-64 space-y-2">
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  overall_percentage >= 100 
                    ? 'bg-rose-500' 
                    : overall_percentage >= 80 
                    ? 'bg-amber-500' 
                    : 'bg-indigo-600'
                }`}
                style={{ width: `${Math.min(overall_percentage, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 font-medium">
              <span>0%</span>
              <span>80% Warning</span>
              <span>100% Cap</span>
            </div>
          </div>
        </div>
      </div>

      {/* Budgets Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 bg-slate-200 rounded-xl"></div>
          ))}
        </div>
      ) : budgets.length === 0 ? (
        <EmptyState
          title="No category budgets configured"
          description="Create spending limits for dining, housing, supplies, or entertainment to receive automated warnings."
          actionLabel="Create First Budget"
          onAction={openCreateModal}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {budgets.map((b) => {
            const isExceeded = b.status === 'exceeded';
            const isWarning = b.status === 'warning';

            return (
              <div 
                key={b.id} 
                className={`bg-white rounded-xl border p-5 shadow-xs transition-shadow hover:shadow-md flex flex-col justify-between ${
                  isExceeded ? 'border-rose-300 bg-rose-50/20' : isWarning ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-slate-900 text-sm truncate max-w-[170px]" title={b.category}>
                      {b.category}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      isExceeded 
                        ? 'bg-rose-100 text-rose-800' 
                        : isWarning 
                        ? 'bg-amber-100 text-amber-800' 
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {b.percentage_used}%
                    </span>
                  </div>

                  {/* Limit & Spent amounts */}
                  <div className="flex items-baseline justify-between mb-2 text-xs">
                    <div>
                      <span className="text-slate-500">Spent: </span>
                      <span className="font-bold text-slate-900">${b.spent.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Limit: </span>
                      <span className="font-semibold text-slate-700">${b.monthly_limit.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-3">
                    <div
                      className={`h-full ${
                        isExceeded ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-indigo-600'
                      }`}
                      style={{ width: `${Math.min(b.percentage_used, 100)}%` }}
                    />
                  </div>

                  {/* Warning Message if any */}
                  {b.warning_message ? (
                    <div className="p-2.5 rounded-lg bg-white/80 border border-slate-200 text-[11px] text-slate-700 flex items-start gap-2 mb-3">
                      <AlertTriangle className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isExceeded ? 'text-rose-500' : 'text-amber-500'}`} />
                      <span className="leading-tight">{b.warning_message}</span>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500 mb-3 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>${b.remaining.toFixed(2)} remaining under budget cap.</span>
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-mono text-[10px]">
                    {monthNames[b.month - 1]} {b.year}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(b)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition-colors"
                      title="Adjust Limit"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => openDeleteModal(b)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-md transition-colors"
                      title="Delete Budget"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create or Edit Budget */}
      <Modal
        isOpen={isCreateOpen || isEditOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setIsEditOpen(false);
        }}
        title={isEditOpen ? `Edit ${activeBudget?.category} Budget Limit` : 'Create Category Spending Limit'}
      >
        <form onSubmit={handleSaveBudget} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {formError}
            </div>
          )}

          {!isEditOpen ? (
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full py-2 px-3 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 cursor-pointer"
              >
                {PRESET_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700">
              Modifying budget for category: <strong className="text-slate-900">{activeBudget?.category}</strong>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
              Monthly Limit ($) *
            </label>
            <input
              type="number"
              step="1"
              min="1"
              required
              value={formData.monthly_limit}
              onChange={(e) => setFormData({ ...formData, monthly_limit: e.target.value })}
              placeholder="e.g. 350.00"
              className="w-full py-2 px-3 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>

          {!isEditOpen && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">Month</label>
                <select
                  value={formData.month}
                  onChange={(e) => setFormData({ ...formData, month: Number(e.target.value) })}
                  className="w-full py-2 px-3 rounded-lg border border-slate-300 text-xs"
                >
                  {monthNames.map((m, idx) => (
                    <option key={m} value={idx + 1}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">Year</label>
                <select
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                  className="w-full py-2 px-3 rounded-lg border border-slate-300 text-xs"
                >
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsCreateOpen(false);
                setIsEditOpen(false);
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {formSubmitting ? 'Saving...' : isEditOpen ? 'Update Limit' : 'Save Budget'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Delete Budget Confirmation */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Delete Budget Target"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600 leading-relaxed">
            Are you sure you want to delete the <strong className="text-slate-900">{activeBudget?.category}</strong> budget?
          </p>
          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsDeleteOpen(false)}
              className="px-4 py-2 font-semibold text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={formSubmitting}
              onClick={handleDeleteBudget}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
            >
              {formSubmitting ? 'Deleting...' : 'Delete Budget'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

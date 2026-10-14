import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  Edit3, 
  Eye, 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  AlertCircle,
  Tag
} from 'lucide-react';
import { api } from '../api/client';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import AlertBanner from '../components/AlertBanner';

const CATEGORIES = [
  'All',
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

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [limit] = useState(15);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [activeTx, setActiveTx] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    merchant: '',
    category: 'Food & Dining',
    amount: '',
    payment_method: 'Card',
    notes: ''
  });
  const [formError, setFormError] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getTransactions({
        page,
        limit,
        search,
        category,
        startDate,
        endDate
      });
      setTransactions(data.items);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      setError(err.message || 'Failed to fetch transactions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [page, category, startDate, endDate]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchTransactions();
  };

  const openAddModal = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      description: '',
      merchant: '',
      category: 'Food & Dining',
      amount: '',
      payment_method: 'Card',
      notes: ''
    });
    setFormError(null);
    setIsAddOpen(true);
  };

  const openEditModal = (tx) => {
    setActiveTx(tx);
    setFormData({
      date: tx.date,
      description: tx.description,
      merchant: tx.merchant,
      category: tx.category,
      amount: tx.amount.toString(),
      payment_method: tx.payment_method,
      notes: tx.notes || ''
    });
    setFormError(null);
    setIsEditOpen(true);
  };

  const openDetailsModal = (tx) => {
    setActiveTx(tx);
    setIsDetailsOpen(true);
  };

  const openDeleteModal = (tx) => {
    setActiveTx(tx);
    setIsDeleteOpen(true);
  };

  const handleSaveTransaction = async (e) => {
    e.preventDefault();
    setFormError(null);

    const amt = parseFloat(formData.amount);
    if (isNaN(amt) || amt <= 0) {
      setFormError('Amount must be a positive number.');
      return;
    }
    if (!formData.merchant.trim()) {
      setFormError('Merchant name is required.');
      return;
    }
    if (!formData.description.trim()) {
      setFormError('Description is required.');
      return;
    }
    if (!formData.date) {
      setFormError('Date is required.');
      return;
    }

    setFormSubmitting(true);
    try {
      const payload = {
        date: formData.date,
        description: formData.description.trim(),
        merchant: formData.merchant.trim(),
        category: formData.category,
        amount: amt,
        payment_method: formData.payment_method,
        notes: formData.notes.trim() || null
      };

      if (isEditOpen && activeTx) {
        await api.updateTransaction(activeTx.id, payload);
        setIsEditOpen(false);
      } else {
        await api.createTransaction(payload);
        setIsAddOpen(false);
      }
      fetchTransactions();
    } catch (err) {
      setFormError(err.message || 'Operation failed.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteTransaction = async () => {
    if (!activeTx) return;
    setFormSubmitting(true);
    try {
      await api.deleteTransaction(activeTx.id);
      setIsDeleteOpen(false);
      fetchTransactions();
    } catch (err) {
      setError(err.message || 'Failed to delete transaction.');
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Transactions Ledger</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage, filter, search, and audit your student expenses.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Transaction
        </button>
      </div>

      {error && (
        <AlertBanner type="error" title="Action failed" message={error} onDismiss={() => setError(null)} />
      )}

      {/* Search and Filters Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row items-center gap-3">
          {/* Keyword Search */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by merchant, description, notes..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>

          {/* Category Dropdown */}
          <div className="w-full md:w-48">
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="w-full py-2 px-3 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 cursor-pointer text-slate-700 font-medium"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>
              ))}
            </select>
          </div>

          {/* Date range inputs */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="py-1.5 px-2.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-600 text-slate-600"
              title="Start Date"
            />
            <span className="text-slate-400 text-xs">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="py-1.5 px-2.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-600 text-slate-600"
              title="End Date"
            />
          </div>

          <button
            type="submit"
            className="w-full md:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Filter
          </button>
        </form>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs animate-pulse">
            Loading transactions from database...
          </div>
        ) : transactions.length === 0 ? (
          <EmptyState
            title="No transactions found"
            description="No transactions match your current filters. Clear your filters or add a new transaction."
            actionLabel="Add Transaction"
            onAction={openAddModal}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Merchant</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">{tx.date}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{tx.merchant}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium text-[11px]">
                        {tx.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate text-slate-600" title={tx.description}>
                      {tx.description}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">{tx.payment_method}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      ${tx.amount.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openDetailsModal(tx)}
                          title="View Details"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditModal(tx)}
                          title="Edit Transaction"
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-md transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(tx)}
                          title="Delete Transaction"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-md transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {total > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div>
              Showing <span className="font-semibold text-slate-800">{(page - 1) * limit + 1}</span> to{' '}
              <span className="font-semibold text-slate-800">{Math.min(page * limit, total)}</span> of{' '}
              <span className="font-semibold text-slate-800">{total}</span> transactions
            </div>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 font-medium">Page {page} of {pages}</span>
              <button
                disabled={page >= pages}
                onClick={() => setPage(page + 1)}
                className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Add or Edit Transaction */}
      <Modal
        isOpen={isAddOpen || isEditOpen}
        onClose={() => {
          setIsAddOpen(false);
          setIsEditOpen(false);
        }}
        title={isEditOpen ? 'Edit Transaction' : 'Record New Student Transaction'}
      >
        <form onSubmit={handleSaveTransaction} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">Date *</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full py-2 px-3 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">Amount ($) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="15.50"
                className="w-full py-2 px-3 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">Merchant *</label>
              <input
                type="text"
                required
                value={formData.merchant}
                onChange={(e) => setFormData({ ...formData, merchant: e.target.value })}
                placeholder="e.g. Spotify, Campus Bookstore, Trader Joe's"
                className="w-full py-2 px-3 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full py-2 px-3 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 cursor-pointer"
              >
                {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">Description *</label>
            <input
              type="text"
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g. Monthly music subscription, Lunch with classmates"
              className="w-full py-2 px-3 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">Payment Method</label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                className="w-full py-2 px-3 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              >
                <option value="Card">Card</option>
                <option value="Apple Pay">Apple Pay</option>
                <option value="Google Pay">Google Pay</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">Notes (Optional)</label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="e.g. Split with roomate"
                className="w-full py-2 px-3 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsAddOpen(false);
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
              {formSubmitting ? 'Saving...' : isEditOpen ? 'Update Transaction' : 'Save Transaction'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: View Details */}
      <Modal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title="Transaction Audit Record"
      >
        {activeTx && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Transaction ID</span>
                <span className="font-mono font-semibold text-slate-900">#{activeTx.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Merchant</span>
                <span className="font-bold text-slate-900 text-sm">{activeTx.merchant}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Amount</span>
                <span className="font-bold text-slate-900 text-sm text-indigo-700">
                  ${activeTx.amount.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Category</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold">
                  {activeTx.category}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Date</span>
                <span className="font-mono text-slate-700">{activeTx.date}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Payment Method</span>
                <span className="text-slate-700">{activeTx.payment_method}</span>
              </div>
            </div>

            <div>
              <span className="font-semibold text-slate-700 block mb-1">Description</span>
              <p className="p-3 rounded-lg bg-white border border-slate-200 text-slate-800">
                {activeTx.description}
              </p>
            </div>

            {activeTx.notes && (
              <div>
                <span className="font-semibold text-slate-700 block mb-1">Notes</span>
                <p className="p-3 rounded-lg bg-white border border-slate-200 text-slate-600 italic">
                  {activeTx.notes}
                </p>
              </div>
            )}

            <div className="flex justify-end pt-3">
              <button
                type="button"
                onClick={() => setIsDetailsOpen(false)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-900"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Delete Confirmation */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Confirm Transaction Deletion"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600 leading-relaxed">
            Are you sure you want to permanently delete the transaction for{' '}
            <strong className="text-slate-900">{activeTx?.merchant}</strong> in the amount of{' '}
            <strong className="text-slate-900">${activeTx?.amount?.toFixed(2)}</strong>?
          </p>
          <p className="text-rose-600 bg-rose-50 p-3 rounded-lg border border-rose-200">
            This action cannot be undone and will update your dashboard metrics and budget limits immediately.
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
              onClick={handleDeleteTransaction}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
            >
              {formSubmitting ? 'Deleting...' : 'Delete Transaction'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Wallet, 
  PiggyBank, 
  TrendingUp, 
  AlertTriangle, 
  Repeat, 
  ArrowRight, 
  Sparkles,
  Calendar,
  CreditCard,
  CheckCircle2
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from 'recharts';
import { api } from '../api/client';
import StatCard from '../components/StatCard';
import AlertBanner from '../components/AlertBanner';
import EmptyState from '../components/EmptyState';

const CATEGORY_COLORS = [
  '#4f46e5', '#06b6d4', '#10b981', '#f59e0b', 
  '#ec4899', '#8b5cf6', '#64748b', '#ef4444'
];

export default function Dashboard({ setActiveTab }) {
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const summary = await api.getDashboard(selectedMonth, selectedYear);
      setData(summary);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [selectedMonth, selectedYear]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded-lg w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72 bg-slate-200 rounded-xl"></div>
          <div className="h-72 bg-slate-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <AlertBanner type="error" title="Could not load dashboard" message={error} />
        <button
          onClick={fetchDashboard}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  const {
    total_expenses = 0,
    total_budget = 0,
    remaining_budget = 0,
    savings_rate = 0,
    categories = [],
    monthly_trends = [],
    recent_transactions = [],
    budget_warnings = [],
    active_subscriptions = [],
    anomalies = []
  } = data || {};

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header with Month Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Student Financial Overview</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time analytics derived from your database transactions & budgets.
          </p>
        </div>

        {/* Month & Year Selectors */}
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
      </div>

      {/* Critical Warnings / Statistical Anomaly Banners */}
      {anomalies.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200/80 flex items-start justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                Statistical Anomaly Detected ({anomalies.length})
              </h4>
              <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                {anomalies[0].explanation}
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('insights')}
            className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 shrink-0"
          >
            Review Rule <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Monthly Spend"
          value={`$${total_expenses.toFixed(2)}`}
          icon={DollarSign}
          subtitle={`For ${monthNames[selectedMonth - 1]} ${selectedYear}`}
          badge={total_budget > 0 && total_expenses > total_budget ? 'Over Budget' : 'On Track'}
          badgeColor={total_budget > 0 && total_expenses > total_budget ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}
        />
        <StatCard
          title="Allocated Budget"
          value={`$${total_budget.toFixed(2)}`}
          icon={Wallet}
          subtitle={`${data?.categories?.length || 0} active categories`}
        />
        <StatCard
          title="Remaining Balance"
          value={`$${remaining_budget.toFixed(2)}`}
          icon={PiggyBank}
          subtitle={total_budget > 0 ? `${((remaining_budget / total_budget) * 100).toFixed(0)}% allowance left` : 'No budget set'}
          badgeColor="bg-blue-50 text-blue-700"
        />
        <StatCard
          title="Student Savings Rate"
          value={`${savings_rate.toFixed(1)}%`}
          icon={TrendingUp}
          subtitle="Relative to target budget cap"
          badge={savings_rate >= 15 ? 'Healthy' : 'Tight Margin'}
          badgeColor={savings_rate >= 15 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}
        />
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Spending Donut Chart */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Category Spending Breakdown
              </h3>
              <p className="text-xs text-slate-500">Distribution of expenditures this month</p>
            </div>
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
              {categories.length} Categories
            </span>
          </div>

          {categories.length === 0 ? (
            <EmptyState 
              title="No transactions for this month" 
              description="Add transactions or import CSV data to see category analytics." 
              actionLabel="Add Transaction"
              onAction={() => setActiveTab('transactions')}
            />
          ) : (
            <div className="h-64 flex flex-col sm:flex-row items-center justify-center">
              <div className="w-full sm:w-1/2 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categories}
                      dataKey="amount"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {categories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val) => [`$${Number(val).toFixed(2)}`, 'Amount']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Category Legend list */}
              <div className="w-full sm:w-1/2 max-h-56 overflow-y-auto pl-2 space-y-2 text-xs">
                {categories.map((cat, idx) => (
                  <div key={cat.category} className="flex items-center justify-between py-1 border-b border-slate-50">
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
                      />
                      <span className="text-slate-700 truncate font-medium">{cat.category}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-semibold text-slate-900">${cat.amount.toFixed(2)}</span>
                      <span className="text-slate-600 ml-1.5 font-medium">({cat.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 6-Month Expense Trends Bar Chart */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Monthly Spending Trend
              </h3>
              <p className="text-xs text-slate-500">Historical expenditure pattern over time</p>
            </div>
            <span className="text-xs text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-md">
              6-Month Window
            </span>
          </div>

          {monthly_trends.length === 0 ? (
            <EmptyState 
              title="No spending history yet" 
              description="Historical monthly charts will populate as you log expenses." 
            />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly_trends} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month_name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip formatter={(val) => [`$${Number(val).toFixed(2)}`, 'Total Expenses']} />
                  <Bar dataKey="total_amount" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Grid: Budget Warnings & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Budget Warnings & Subscriptions Summary (1 Col) */}
        <div className="space-y-6">
          {/* Budget Health Card */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Budget Alerts
              </h3>
              <button
                onClick={() => setActiveTab('budgets')}
                className="text-xs text-indigo-600 font-semibold hover:text-indigo-800"
              >
                Manage
              </button>
            </div>

            {budget_warnings.length === 0 ? (
              <div className="py-4 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1.5" />
                <p className="text-xs font-medium text-slate-700">All Budgets Healthy</p>
                <p className="text-[11px] text-slate-400">No categories approaching or exceeding caps.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {budget_warnings.map((b) => (
                  <div key={b.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-xs">
                    <div className="flex items-center justify-between mb-1 font-medium">
                      <span className="text-slate-800">{b.category}</span>
                      <span className={b.status === 'exceeded' ? 'text-rose-600 font-bold' : 'text-amber-600 font-bold'}>
                        {b.percentage_used}% used
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mb-1.5">
                      <div
                        className={`h-full ${b.status === 'exceeded' ? 'bg-rose-500' : 'bg-amber-500'}`}
                        style={{ width: `${Math.min(b.percentage_used, 100)}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Spent ${b.spent.toFixed(2)} of ${b.monthly_limit.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Subscriptions Quick Glance */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Repeat className="w-4 h-4 text-indigo-600" />
                Active Subscriptions ({active_subscriptions.length})
              </h3>
              <button
                onClick={() => setActiveTab('subscriptions')}
                className="text-xs text-indigo-600 font-semibold hover:text-indigo-800"
              >
                Intelligence
              </button>
            </div>

            {active_subscriptions.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">No active subscriptions registered.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {active_subscriptions.slice(0, 4).map((sub) => (
                  <div key={sub.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-slate-800">{sub.merchant_name}</p>
                      <p className="text-[11px] text-slate-400 capitalize">{sub.billing_cycle} billing</p>
                    </div>
                    <span className="font-bold text-slate-900">${sub.amount.toFixed(2)}/mo</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Transactions Table (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Recent Transactions
                </h3>
                <p className="text-xs text-slate-500">Latest recorded student purchases</p>
              </div>
              <button
                onClick={() => setActiveTab('transactions')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                View All <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recent_transactions.length === 0 ? (
              <EmptyState 
                title="No recent transactions" 
                description="Start tracking your expenses by adding your first transaction." 
                actionLabel="Create Transaction"
                onAction={() => setActiveTab('transactions')}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="pb-3 pl-1">Date</th>
                      <th className="pb-3">Merchant</th>
                      <th className="pb-3">Category</th>
                      <th className="pb-3">Method</th>
                      <th className="pb-3 text-right pr-1">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {recent_transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 pl-1 text-slate-500 font-mono text-[11px]">{tx.date}</td>
                        <td className="py-3 font-semibold text-slate-900">
                          {tx.merchant}
                          <span className="block text-[11px] font-normal text-slate-400 truncate max-w-[200px]">
                            {tx.description}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium text-[11px]">
                            {tx.category}
                          </span>
                        </td>
                        <td className="py-3 text-slate-500">{tx.payment_method}</td>
                        <td className="py-3 text-right pr-1 font-bold text-slate-900">
                          ${tx.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>Displaying up to 6 recent items</span>
            <button
              onClick={() => setActiveTab('transactions')}
              className="text-indigo-600 font-medium hover:underline"
            >
              Manage all transactions &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { 
  LayoutDashboard, 
  ReceiptText, 
  PieChart, 
  Repeat, 
  Sparkles, 
  UploadCloud,
  ShieldCheck
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, mobileMenuOpen, setMobileMenuOpen }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transactions', icon: ReceiptText },
    { id: 'budgets', label: 'Budgets', icon: PieChart },
    { id: 'subscriptions', label: 'Subscriptions', icon: Repeat, badge: 'Intelligence' },
    { id: 'insights', label: 'Anomalies & Insights', icon: Sparkles },
    { id: 'csv-import', label: 'CSV Import', icon: UploadCloud },
  ];

  const handleSelect = (id) => {
    setActiveTab(id);
    if (setMobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-20 bg-slate-900/50 backdrop-blur-xs md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <aside className={`
        fixed top-16 bottom-0 left-0 z-30 w-64 bg-slate-900 border-r border-slate-800 transition-transform duration-200 ease-in-out
        md:translate-x-0 md:static md:h-[calc(100vh-4rem)]
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full justify-between p-4">
          <div className="space-y-1">
            <div className="px-3 py-2 text-[11px] font-semibold tracking-wider uppercase text-slate-400">
              Core Navigation
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className={`
                    w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
                    ${isActive 
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30' 
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Student Privacy & Data Isolation Note */}
          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-xs text-slate-400 space-y-1.5">
            <div className="flex items-center gap-1.5 text-indigo-300 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Isolated Vault</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400">
              Your financial records are strictly isolated with user-level authentication & encrypted sessions.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}

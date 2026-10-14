import React from 'react';

export default function StatCard({ title, value, subtitle, icon: Icon, badge, badgeColor = 'bg-brand-50 text-brand-700', trend }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
        </div>
        {Icon && (
          <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600">
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      {(subtitle || badge) && (
        <div className="mt-3 flex items-center justify-between text-xs">
          {subtitle && <span className="text-slate-500">{subtitle}</span>}
          {badge && (
            <span className={`px-2 py-0.5 rounded-full font-medium ${badgeColor}`}>
              {badge}
            </span>
          )}
        </div>
      )}
      {trend && (
        <div className="mt-2 text-xs font-medium text-slate-600 flex items-center gap-1">
          {trend}
        </div>
      )}
    </div>
  );
}

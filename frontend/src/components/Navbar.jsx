import React from 'react';
import { Compass, LogOut, User, Activity, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ mobileMenuOpen, setMobileMenuOpen }) {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-navy-900 border-b border-slate-800 text-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
                <Compass className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-bold text-lg tracking-tight text-white flex items-center gap-1.5">
                  PocketPilot
                  <span className="text-[10px] font-medium tracking-normal uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded-full">
                    Student
                  </span>
                </span>
                <p className="text-[10px] text-slate-400 hidden sm:block">Expense Intelligence & Leak Detection</p>
              </div>
            </div>
          </div>

          {/* Right: API status & User Profile */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>API Live</span>
            </div>

            {user && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-slate-200">
                  <div className="w-8 h-8 rounded-full bg-indigo-700/80 border border-indigo-400/40 flex items-center justify-center font-medium text-xs text-indigo-100">
                    {user.full_name?.charAt(0) || 'U'}
                  </div>
                  <span className="hidden md:inline font-medium">{user.full_name}</span>
                </div>
                <button
                  onClick={logout}
                  title="Sign out"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

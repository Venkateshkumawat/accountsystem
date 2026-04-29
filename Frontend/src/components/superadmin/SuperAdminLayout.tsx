import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Settings,
  LogOut,
  Bell,
  Menu,
  X,
  Search,
  Building2,
  CreditCard,
  Activity
} from 'lucide-react';
import { GlobalSearch } from '../GlobalSearch';
import { useNotify } from '../../context/NotificationContext';
import socketService from '../../services/socket';
import api from '../../services/api';

const SuperAdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useNotify();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    socketService.connect();
  }, []);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/superadmin/dashboard', icon: LayoutDashboard },
    { name: 'User Plan', path: '/superadmin/user-plan', icon: Users },
    { name: 'Account Center', path: '/superadmin/accounts', icon: ShieldCheck },
    { name: 'Admin Setting', path: '/superadmin/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-slate-50/50 overflow-hidden font-inter">
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] lg:hidden animate-in fade-in duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-100 flex flex-col shrink-0 shadow-2xl z-[110] 
        transform transition-transform duration-500 lg:translate-x-0 lg:static lg:w-56 lg:shadow-sm
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <NavLink to="/superadmin/dashboard" className="p-6 pb-4 flex items-center justify-between no-underline">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg font-black text-xl">
              N
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-lg tracking-tight text-slate-900 leading-none">NexusBill</span>
              <span className="text-indigo-600 text-[10px] font-semibold uppercase tracking-widest mt-1">SuperAdmin</span>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-slate-400 hover:text-slate-900">
            <X size={20} />
          </button>
        </NavLink>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto no-scrollbar py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-sm font-${isActive ? 'semibold' : 'medium'} tracking-wide transition-all
                ${isActive ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}
              `}
            >
              <item.icon size={16} />
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 mt-auto border-t border-slate-50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 hover:text-white hover:bg-rose-500 hover:border-rose-600 transition-all group shadow-sm active:scale-95"
          >
            <span className="group-hover:translate-x-1 transition-transform flex items-center gap-2">
              <LogOut size={14} /> Secure Exit
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-white animate-pulse"></div>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-16 bg-white border-b border-slate-100 flex items-center gap-3 px-3 lg:px-6 shrink-0 z-[100] shadow-sm sticky top-0 transition-all duration-300">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden p-2 bg-slate-50 text-slate-500 rounded-xl border border-slate-100 shrink-0"
          >
            <Menu size={18} />
          </button>

          <div className="flex-1 max-w-sm">
            <GlobalSearch />
          </div>

          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/superadmin/dashboard#global-audit-log')} className="relative p-2 text-slate-400">
              <Bell size={18} />
              {unreadCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full" />}
            </button>
            <div className="w-9 h-9 bg-slate-900 text-white rounded-xl flex items-center justify-center font-semibold text-xs">SA</div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto no-scrollbar bg-[#F1F5F9]/50 p-4 lg:px-8 lg:py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default SuperAdminLayout;

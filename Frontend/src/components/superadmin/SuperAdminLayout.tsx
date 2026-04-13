import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  ShieldCheck, 
  Settings, 
  LogOut,
  Bell,
  Menu,
  X
} from 'lucide-react';
import { useNotify } from '../../context/NotificationContext';
import socketService from '../../services/socket';

const SuperAdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useNotify();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // -- Global Socket Connection --
  useEffect(() => {
    socketService.connect();
  }, []);

  // Close sidebar on route change (mobile)
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
    { name: 'User & Plan', path: '/superadmin/user-plan', icon: Users },
    { name: 'Master Account', path: '/superadmin/accounts', icon: ShieldCheck },
    { name: 'Admin Setting', path: '/superadmin/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-[#F1F5F9]  overflow-hidden relative">
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
        <div className="p-6 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg font-black text-xl">
              N
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-lg tracking-tight text-slate-900 leading-none">
                NexusBill
              </span>
              <span className="text-indigo-600 text-[10px] font-semibold uppercase tracking-widest mt-1">
                SuperAdmin
              </span>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-slate-400 hover:text-slate-900">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto no-scrollbar py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-sm font-${isActive ? 'semibold' : 'medium'} tracking-wide transition-all
                ${isActive 
                  ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' 
                  : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}
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
            className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-semibold uppercase tracking-widest text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all"
          >
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 lg:px-8 shrink-0 z-[100] shadow-sm sticky top-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2.5 bg-slate-50 text-slate-500 rounded-xl hover:bg-indigo-50 transition-all border border-slate-100"
            >
              <Menu size={20} />
            </button>
            <div className="flex flex-col">
              <h1 className="text-lg lg:text-xl font-semibold text-slate-900 tracking-tight leading-none">
                {navItems.find(n => location.pathname === n.path)?.name || 'Admin Dashboard'}
              </h1>
              <p className="text-xs font-normal text-slate-500 mt-1">System Health: Optimal</p>
            </div>
          </div>

          <div className="flex items-center gap-3 lg:gap-6">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
               <ShieldCheck size={10} className="text-indigo-600" />
               <span className="text-[10px] font-medium uppercase text-slate-500 tracking-widest">Protocol V4.2 Locked</span>
            </div>
            <button onClick={() => navigate('/superadmin/notifications')} className="relative p-2 text-slate-400 hover:text-indigo-600 transition-colors">
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-black flex items-center justify-center rounded-full shadow-sm ring-2 ring-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <div className="flex items-center gap-3 pl-3 lg:pl-6 border-l border-slate-100">
               <div className="hidden xs:block text-right">
                <p className="text-[10px] font-semibold text-slate-900 uppercase">SuperAdmin</p>
                <p className="text-[10px] font-medium text-slate-400 uppercase mt-0.5 tracking-widest">Platform Root</p>
              </div>
              <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-semibold text-xs">
                SA
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar bg-[#F1F5F9]/50">
          <div className="px-4 pb-4 lg:px-10 lg:pb-10 pt-0">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default SuperAdminLayout;


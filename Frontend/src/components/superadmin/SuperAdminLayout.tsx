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
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100 font-bold text-lg rotate-3 shrink-0">
              N
            </div>
            <span className="font-bold text-lg tracking-tight uppercase text-slate-900 leading-none">
              Nexus <br /> <span className="text-indigo-600 text-xs tracking-wider not-">Master</span>
            </span>
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
                flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-sm font-semibold tracking-wide transition-all
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
            className="w-full h-12 flex items-center gap-2.5 px-4 rounded-xl text-[11px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50 transition-all"
          >
            <LogOut size={14} />
            Eject Node
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
              <h1 className="text-sm lg:text-lg font-black text-slate-900 tracking-tighter uppercase leading-none">
                {navItems.find(n => location.pathname === n.path)?.name || 'Nexus Master Control'}
              </h1>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></span>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none">Administrative Node Active</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 lg:gap-6">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
               <ShieldCheck size={10} className="text-indigo-600" />
               <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Protocol V4.2 Locked</span>
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
                <p className="text-[10px] font-black text-slate-900 uppercase leading-none">Nexus Master</p>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Authority Authority</p>
              </div>
              <div className="w-9 h-9 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black border border-slate-900 shadow-lg text-[10px]">
                NM
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar bg-[#F1F5F9]/50">
          <div className="p-4 lg:p-10">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default SuperAdminLayout;


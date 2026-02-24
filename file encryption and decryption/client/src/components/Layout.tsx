import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import {
  HiOutlineShieldCheck,
  HiOutlineHome,
  HiOutlineFolder,
  HiOutlineCloudArrowUp,
  HiOutlineUserGroup,
  HiOutlineEye,
  HiOutlineCpuChip,
  HiOutlineBugAnt,
  HiOutlineArrowRightOnRectangle,
} from 'react-icons/hi2';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: HiOutlineHome },
  { to: '/vault', label: 'Vault', icon: HiOutlineFolder },
  { to: '/upload', label: 'Upload', icon: HiOutlineCloudArrowUp },
  { to: '/rooms', label: 'Rooms', icon: HiOutlineUserGroup },
  { to: '/security-monitor', label: 'Security', icon: HiOutlineEye },
];

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-vault-bg grid-bg">
      {/* Sidebar */}
      <aside className="w-64 border-r border-vault-border bg-vault-card/40 backdrop-blur-xl flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-vault-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-vault-accent to-cyber-500 flex items-center justify-center">
              <HiOutlineShieldCheck className="w-6 h-6 text-vault-bg" />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-vault-accent to-cyber-400 bg-clip-text text-transparent">
                SecureVault
              </h1>
              <p className="text-[10px] text-gray-500 tracking-widest uppercase">Operating System</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 group ${
                  isActive
                    ? 'bg-vault-accent/10 text-vault-accent border border-vault-accent/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <item.icon className="w-5 h-5 transition-transform group-hover:scale-110" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-vault-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyber-500 to-vault-accent flex items-center justify-center text-xs font-bold text-vault-bg">
                {user?.username?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{user?.username}</p>
                <p className="text-[10px] text-gray-500">{user?.email}</p>
              </div>
            </div>
            <button onClick={logout} className="text-gray-400 hover:text-vault-danger transition-colors">
              <HiOutlineArrowRightOnRectangle className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-8"
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
}

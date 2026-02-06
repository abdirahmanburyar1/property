import type { ReactNode } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logout } from '../../store/slices/authSlice';
import { toggleSidebar } from '../../store/slices/uiSlice';
import { useState, useRef, useEffect } from 'react';
import {
  HomeIcon,
  MapPinIcon,
  DocumentTextIcon,
  CreditCardIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
  BellIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  UserCircleIcon,
  BuildingOfficeIcon,
  ShieldCheckIcon,
  KeyIcon,
  FolderIcon,
  FolderOpenIcon,
} from '@heroicons/react/24/outline';
interface MainLayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Properties', href: '/properties', icon: MapPinIcon },
  { name: 'Property Types', href: '/property-types', icon: BuildingOfficeIcon },
  { name: 'Sections', href: '/sections', icon: FolderIcon },
  { name: 'SubSections', href: '/subsections', icon: FolderOpenIcon },
  { name: 'Payments', href: '/payments', icon: CreditCardIcon },
  { name: 'Property Notices', href: '/property-notices', icon: DocumentTextIcon },
  { name: 'Users', href: '/users', icon: UserGroupIcon },
  { name: 'Roles', href: '/roles', icon: ShieldCheckIcon },
  { name: 'Permissions', href: '/permissions', icon: KeyIcon },
  { name: 'Reports', href: '/reports', icon: DocumentTextIcon },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
];

export default function MainLayout({ children }: MainLayoutProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAppSelector((state) => state.auth);
  const { sidebarOpen } = useAppSelector((state) => state.ui);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const _userInitials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase();
  void _userInitials;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuOpen]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 lg:hidden transition-opacity print:hidden"
          onClick={() => dispatch(toggleSidebar())}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 print:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between min-h-[5.5rem] px-6 border-b border-gray-200 bg-white">
            <div className="flex items-center space-x-3">
              <img src="/logo.png" alt="Gaalkacyo PR" className="h-14 w-14 shrink-0 object-contain" />
              <h1 className="text-lg font-bold text-gray-900">Gaalkacyo PR</h1>
            </div>
            <button
              onClick={() => dispatch(toggleSidebar())}
              className="lg:hidden text-gray-600 hover:text-gray-900 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 shadow-sm'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  onClick={() => {
                    if (window.innerWidth < 1024) {
                      dispatch(toggleSidebar());
                    }
                  }}
                >
                  <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-primary-600' : 'text-gray-500'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white shadow-sm border-b border-gray-200 backdrop-blur-sm bg-white/95 print:hidden">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center space-x-4 flex-1">
              <button
                onClick={() => dispatch(toggleSidebar())}
                className="lg:hidden text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Bars3Icon className="h-6 w-6" />
              </button>
              
              {/* Search bar */}
              <div className="hidden md:block flex-1 max-w-lg">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search properties, payments, users..."
                    className="input pl-10 py-2 w-full bg-gray-50 border-gray-200 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                <BellIcon className="h-6 w-6" />
                <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-danger-500 ring-2 ring-white"></span>
              </button>

              {/* User menu dropdown */}
              <div className="relative pl-4 border-l border-gray-200" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-gray-500">{user?.roles?.[0] || 'User'}</p>
                  </div>
                  <ChevronDownIcon className={`h-5 w-5 text-gray-500 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-200">
                      <p className="text-sm font-semibold text-gray-900">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{user?.email}</p>
                      {user?.roles && user.roles.length > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-700 mt-2">
                          {user.roles[0]}
                        </span>
                      )}
                    </div>
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          navigate('/settings');
                        }}
                        className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <UserCircleIcon className="h-5 w-5 mr-3 text-gray-400" />
                        Profile Settings
                      </button>
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          navigate('/settings');
                        }}
                        className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Cog6ToothIcon className="h-5 w-5 mr-3 text-gray-400" />
                        Preferences
                      </button>
                    </div>
                    <div className="border-t border-gray-200 py-1">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center px-4 py-2 text-sm text-danger-600 hover:bg-danger-50 transition-colors"
                      >
                        <ArrowRightOnRectangleIcon className="h-5 w-5 mr-3" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

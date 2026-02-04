import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import apiClient from '../config/api';
import {
  MapPinIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

interface DashboardStats {
  totalProperties: number;
  totalPropertiesLastMonth: number;
  propertiesChangePercent: number;
  totalPaymentsCount: number;
  totalPaymentsAmount: number;
  totalPaymentsAmountLastMonth: number;
  paymentsChangePercent: number;
  activeUsers: number;
  pendingApprovals: number;
  registrationTrends: { label: string; count: number; month: number; year: number }[];
  recentActivity: { type: string; description: string; time: string }[];
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour(s) ago`;
  if (diffDays < 7) return `${diffDays} day(s) ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function Dashboard() {
  const { user } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiClient
      .get<DashboardStats>('/dashboard')
      .then((res) => {
        if (!cancelled) {
          const d = res.data;
          setData({
            ...d,
            recentActivity: (d.recentActivity || []).map((a: { type: string; description: string; time: string }) => ({
              ...a,
              time: typeof a.time === 'string' ? formatTime(a.time) : String(a.time),
            })),
          });
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || err.message || 'Failed to load dashboard');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const stats = data
    ? [
        {
          name: 'Total Properties',
          value: data.totalProperties.toLocaleString(),
          change: `${data.propertiesChangePercent >= 0 ? '+' : ''}${data.propertiesChangePercent}%`,
          changeType: data.propertiesChangePercent > 0 ? 'positive' : data.propertiesChangePercent < 0 ? 'negative' : 'neutral',
          icon: MapPinIcon,
          color: 'from-blue-500 to-blue-600',
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
        },
        {
          name: 'Total Payments',
          value: `${(Number(data.totalPaymentsAmount) || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} USD`,
          change: `${data.paymentsChangePercent >= 0 ? '+' : ''}${data.paymentsChangePercent}%`,
          changeType: data.paymentsChangePercent > 0 ? 'positive' : data.paymentsChangePercent < 0 ? 'negative' : 'neutral',
          icon: CurrencyDollarIcon,
          color: 'from-green-500 to-green-600',
          iconBg: 'bg-green-100',
          iconColor: 'text-green-600',
        },
        {
          name: 'Active Users',
          value: data.activeUsers.toLocaleString(),
          change: '+0%',
          changeType: 'neutral' as const,
          icon: UserGroupIcon,
          color: 'from-purple-500 to-purple-600',
          iconBg: 'bg-purple-100',
          iconColor: 'text-purple-600',
        },
        {
          name: 'Pending Approvals',
          value: data.pendingApprovals.toLocaleString(),
          change: '+0%',
          changeType: 'neutral' as const,
          icon: DocumentTextIcon,
          color: 'from-amber-500 to-amber-600',
          iconBg: 'bg-amber-100',
          iconColor: 'text-amber-600',
        },
      ]
    : [];

  const maxTrendCount = data?.registrationTrends?.length
    ? Math.max(...data.registrationTrends.map((t) => t.count), 1)
    : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-sm text-gray-600">
            Welcome back, <span className="font-medium text-gray-900">{user?.firstName} {user?.lastName}</span>
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link to="/reports" className="btn-secondary px-4 py-2">
            <ChartBarIcon className="h-5 w-5 mr-2" />
            View Reports
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-danger-50 border border-danger-200 px-4 py-3 text-sm text-danger-700">
          {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? [1, 2, 3, 4].map((i) => (
              <div key={i} className="card overflow-hidden">
                <div className="card-body">
                  <div className="animate-pulse flex items-center justify-between">
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
                      <div className="h-8 bg-gray-200 rounded w-16 mb-2" />
                      <div className="h-3 bg-gray-100 rounded w-20" />
                    </div>
                    <div className="h-12 w-12 bg-gray-200 rounded-xl" />
                  </div>
                </div>
              </div>
            ))
          : stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.name} className="card overflow-hidden">
                  <div className="card-body">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600 mb-1">{stat.name}</p>
                        <p className="text-3xl font-bold text-gray-900 mb-2">{stat.value}</p>
                        <div className="flex items-center">
                          {stat.changeType === 'positive' && (
                            <span className="inline-flex items-center text-sm font-medium text-success-600">
                              <ArrowUpIcon className="h-4 w-4 mr-1" />
                              {stat.change}
                            </span>
                          )}
                          {stat.changeType === 'negative' && (
                            <span className="inline-flex items-center text-sm font-medium text-danger-600">
                              <ArrowDownIcon className="h-4 w-4 mr-1" />
                              {stat.change}
                            </span>
                          )}
                          {stat.changeType === 'neutral' && (
                            <span className="text-sm text-gray-500">{stat.change}</span>
                          )}
                          <span className="ml-2 text-sm text-gray-500">vs last month</span>
                        </div>
                      </div>
                      <div className={`${stat.iconBg} p-3 rounded-xl`}>
                        <Icon className={`h-6 w-6 ${stat.iconColor}`} />
                      </div>
                    </div>
                  </div>
                  <div className={`h-1 bg-gradient-to-r ${stat.color}`}></div>
                </div>
              );
            })}
      </div>

      {/* Charts and Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Property Registration Trends */}
        <div className="lg:col-span-2 card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">Property Registration Trends</h3>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="animate-pulse text-gray-400">Loading chart...</div>
              </div>
            ) : data?.registrationTrends?.length ? (
              <div className="h-64 flex items-end gap-1 px-2">
                {data.registrationTrends.map((t, i) => (
                  <div key={`${t.year}-${t.month}`} className="flex-1 flex flex-col items-center min-w-0">
                    <div
                      className="w-full bg-primary-500 rounded-t min-h-[4px] transition-all"
                      style={{ height: `${Math.max(4, (t.count / maxTrendCount) * 100)}%` }}
                      title={`${t.label}: ${t.count}`}
                    />
                    <span className="text-xs text-gray-500 mt-1 truncate w-full text-center" title={t.label}>
                      {t.label}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center">
                  <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No registration data yet</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse flex items-start space-x-3">
                    <div className="h-2 w-2 rounded-full bg-gray-200 mt-2 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="h-3 bg-gray-200 rounded w-full mb-2" />
                      <div className="h-3 bg-gray-100 rounded w-16" />
                    </div>
                  </div>
                ))}
              </div>
            ) : data?.recentActivity?.length ? (
              <div className="space-y-4">
                {data.recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="h-2 w-2 rounded-full bg-primary-500 mt-2"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{activity.description}</p>
                      <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => navigate('/properties/new')}
              className="flex items-center p-4 border border-gray-200 rounded-xl hover:border-primary-300 hover:bg-primary-50 transition-all group"
            >
              <div className="bg-primary-100 p-2 rounded-lg group-hover:bg-primary-200 transition-colors">
                <MapPinIcon className="h-5 w-5 text-primary-600" />
              </div>
              <span className="ml-3 text-sm font-medium text-gray-700 group-hover:text-primary-700">
                Register Property
              </span>
            </button>
            <button
              onClick={() => navigate('/payments')}
              className="flex items-center p-4 border border-gray-200 rounded-xl hover:border-primary-300 hover:bg-primary-50 transition-all group"
            >
              <div className="bg-green-100 p-2 rounded-lg group-hover:bg-green-200 transition-colors">
                <CurrencyDollarIcon className="h-5 w-5 text-green-600" />
              </div>
              <span className="ml-3 text-sm font-medium text-gray-700 group-hover:text-primary-700">
                Process Payment
              </span>
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="flex items-center p-4 border border-gray-200 rounded-xl hover:border-primary-300 hover:bg-primary-50 transition-all group"
            >
              <div className="bg-purple-100 p-2 rounded-lg group-hover:bg-purple-200 transition-colors">
                <UserGroupIcon className="h-5 w-5 text-purple-600" />
              </div>
              <span className="ml-3 text-sm font-medium text-gray-700 group-hover:text-primary-700">
                Add User
              </span>
            </button>
            <Link
              to="/reports"
              className="flex items-center p-4 border border-gray-200 rounded-xl hover:border-primary-300 hover:bg-primary-50 transition-all group"
            >
              <div className="bg-amber-100 p-2 rounded-lg group-hover:bg-amber-200 transition-colors">
                <DocumentTextIcon className="h-5 w-5 text-amber-600" />
              </div>
              <span className="ml-3 text-sm font-medium text-gray-700 group-hover:text-primary-700">
                Generate Report
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

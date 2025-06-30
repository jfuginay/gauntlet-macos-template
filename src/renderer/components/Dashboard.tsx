import React from 'react';
import { Activity, TrendingUp, Users, Zap } from 'lucide-react';
import { MetricCard } from './MetricCard';
import { PerformanceChart } from './PerformanceChart';

export const Dashboard: React.FC = () => {
  const metrics = [
    {
      title: 'Active Users',
      value: '2,543',
      change: '+12%',
      trend: 'up' as const,
      icon: Users,
    },
    {
      title: 'Performance Score',
      value: '98.2%',
      change: '+2.1%',
      trend: 'up' as const,
      icon: Zap,
    },
    {
      title: 'Revenue',
      value: '$45,231',
      change: '+8.3%',
      trend: 'up' as const,
      icon: TrendingUp,
    },
    {
      title: 'System Load',
      value: '23%',
      change: '-5%',
      trend: 'down' as const,
      icon: Activity,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Real-time metrics and performance overview
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Performance Over Time
          </h3>
          <PerformanceChart />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recent Activity
          </h3>
          <div className="space-y-4">
            {[
              { action: 'User login', time: '2 min ago', status: 'success' },
              { action: 'Data sync completed', time: '5 min ago', status: 'success' },
              { action: 'Background task started', time: '12 min ago', status: 'pending' },
              { action: 'System backup', time: '1 hour ago', status: 'success' },
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {activity.action}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {activity.time}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    activity.status === 'success'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  }`}
                >
                  {activity.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
            <div className="text-center">
              <Zap className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Run Performance Test
              </p>
            </div>
          </button>
          
          <button className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
            <div className="text-center">
              <Activity className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Generate Report
              </p>
            </div>
          </button>
          
          <button className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
            <div className="text-center">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Export Analytics
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
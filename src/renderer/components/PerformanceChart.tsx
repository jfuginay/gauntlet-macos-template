import React from 'react';

export const PerformanceChart: React.FC = () => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Writing Performance
      </h3>
      <div className="h-40 flex items-center justify-center text-gray-500 dark:text-gray-400">
        Chart placeholder - would integrate with real charting library
      </div>
    </div>
  );
};
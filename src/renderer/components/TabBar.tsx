import React from 'react';
import { X, Plus } from 'lucide-react';

export interface Tab {
  id: string;
  type: 'chat' | 'task' | 'terminal';
  title: string;
  closeable: boolean;
  taskId?: string; // For task tabs
  data?: any; // Task data for task tabs
}

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string;
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onNewTab?: () => void;
  maxTabs?: number;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onNewTab,
  maxTabs = 8
}) => {
  
  const handleTabClick = (tabId: string) => {
    onTabSelect(tabId);
  };

  const handleCloseClick = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    onTabClose(tabId);
  };

  const canAddTab = tabs.length < maxTabs;

  return (
    <div className="tab-bar">
      <div className="tab-list">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`tab ${activeTabId === tab.id ? 'active' : ''} ${tab.type}`}
            onClick={() => handleTabClick(tab.id)}
            title={tab.type === 'task' ? `Task #${tab.taskId}: ${tab.title}` : tab.title}
          >
            <span className="tab-icon">
              {tab.type === 'chat' ? '💬' : '📋'}
            </span>
            <span className="tab-title">
              {tab.type === 'task' ? `#${tab.taskId}` : tab.title}
            </span>
            {tab.closeable && (
              <button
                className="tab-close"
                onClick={(e) => handleCloseClick(e, tab.id)}
                title="Close tab (Ctrl+W)"
              >
                <X size={12} />
              </button>
            )}
          </div>
        ))}
        
        {canAddTab && onNewTab && (
          <button
            className="tab-add"
            onClick={onNewTab}
            title="Open task (Ctrl+T)"
          >
            <Plus size={14} />
          </button>
        )}
      </div>
      
      <div className="tab-info">
        <span className="tab-count">{tabs.length}/{maxTabs}</span>
        <span className="tab-shortcuts">
          Ctrl+1-8: switch • Ctrl+W: close • Ctrl+T: new
        </span>
      </div>
    </div>
  );
};

export default TabBar; 
import React, { useState } from 'react';

/**
 * Reusable Segmented Tabs Component
 * 
 * @param {Object} props
 * @param {Array<{id: string, label: string, icon?: React.ReactNode}>} props.tabs
 * @param {string} props.activeTab
 * @param {(tabId: string) => void} props.onChange
 * @param {string} [props.className]
 */
export function Tabs({ tabs, activeTab, onChange, className = '' }) {
  return (
    <div className={`demo-tabs-nav ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            className={`tab-btn ${isActive ? 'active' : ''}`}
            onClick={() => onChange(tab.id)}
          >
            {tab.icon && tab.icon}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

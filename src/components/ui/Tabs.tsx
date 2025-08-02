import React from 'react';

interface Tab {
  label: string;
  value: string;
}

interface TabsProps {
  tabs: Tab[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  children: React.ReactNode[];
}

const Tabs: React.FC<TabsProps> = ({ tabs, value, onChange, className = '', children }) => {
  return (
    <div className={className}>
      <div className="flex border-b border-gray-300 bg-background">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            className={`px-4 py-2 font-medium focus:outline-none transition-colors duration-150 ${
              value === tab.value
                ? 'border-b-2 border-primary text-primary'
                : 'text-gray-500 hover:text-primary'
            }`}
            onClick={() => onChange(tab.value)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="pt-4">
        {children[tabs.findIndex((tab) => tab.value === value)]}
      </div>
    </div>
  );
};

export default Tabs; 
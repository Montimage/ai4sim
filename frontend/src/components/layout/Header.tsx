import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 h-16 flex items-center">
        <h1 className="text-xl font-semibold text-gray-900">AI4SIM Dashboard</h1>
      </div>
    </header>
  );
};

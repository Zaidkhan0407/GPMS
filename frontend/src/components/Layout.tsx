import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 overflow-hidden">
      <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 overflow-y-auto">
        {children}
      </div>
    </div>
  );
};

export default Layout;
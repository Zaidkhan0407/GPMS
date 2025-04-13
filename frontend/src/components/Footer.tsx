import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gradient-to-br from-purple-950 via-purple-900 to-purple-800 backdrop-blur-xl shadow-2xl border-t border-purple-500/30 transition-all duration-300 hover:shadow-purple-500/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center">
        <p className="text-fuchsia-100 font-medium tracking-wide">&copy; 2024 AI Placement Management System. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gradient-to-br from-sky-600 via-sky-700 to-sky-800 backdrop-blur-xl shadow-2xl border-t border-sky-500/30 transition-all duration-300 hover:shadow-sky-400/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center">
        <p className="text-sky-100 font-medium tracking-wide">&copy; 2024 AI Placement Management System. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
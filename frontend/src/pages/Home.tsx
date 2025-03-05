import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Users, Briefcase } from 'lucide-react';
import { motion } from 'framer-motion';

const Home: React.FC = () => {
  const cardVariants = {
    hover: { scale: 1.05, transition: { duration: 0.3 } }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full space-y-12">
        <motion.h1 
          className="text-5xl font-extrabold text-center text-gray-900 mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          Welcome to AI Placement Management System
        </motion.h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { to: "/resume-analysis", icon: FileText, title: "Resume Analysis", description: "Get AI-powered insights for your resume", color: "blue" },
            { to: "/interview-prep", icon: Users, title: "Interview Preparation", description: "Practice with AI-generated interview questions", color: "green" },
            { to: "/job-recommendations", icon: Briefcase, title: "Job Recommendations", description: "Discover matched job opportunities", color: "purple" }
          ].map((item, index) => (
            <motion.div key={index} variants={cardVariants} whileHover="hover">
              <Link to={item.to} className={`block bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border-t-4 border-${item.color}-500`}>
                <item.icon size={56} className={`mx-auto mb-6 text-${item.color}-600`} />
                <h2 className="text-2xl font-bold mb-4 text-gray-800">{item.title}</h2>
                <p className="text-gray-600">{item.description}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;

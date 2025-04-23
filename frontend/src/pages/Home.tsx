import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Users, Briefcase, LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

// Define the type for the useAuth hook's return value
interface AuthContextType {
  user: any; // Replace 'any' with a specific user type if available
}

// Define the type for each card item
interface CardItem {
  to: string;
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
  hoverColor: string;
}

const Home: React.FC = () => {
  const { user } = useAuth() as AuthContextType;

  const cardVariants = {
    initial: { opacity: 0, y: 20, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: "easeOut" } },
    hover: { scale: 1.05, y: -5, rotate: 1, transition: { type: "spring", stiffness: 300 } }
  };

  const containerVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: { staggerChildren: 0.2, delayChildren: 0.3 }
    }
  };

  const titleVariants = {
    initial: { opacity: 0, y: -50 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
  };

  const cardItems: CardItem[] = [
    { to: "/resume-analysis", icon: FileText, title: "Resume Analysis", description: "Get AI-powered insights for your resume", color: "text-coral-500", hoverColor: "text-coral-600" },
    { to: "/interview-prep", icon: Users, title: "Interview Preparation", description: "Practice with AI-generated interview questions", color: "text-sky-500", hoverColor: "text-sky-600" },
    { to: "/job-recommendations", icon: Briefcase, title: "Job Recommendations", description: "Discover matched job opportunities", color: "text-lime-500", hoverColor: "text-lime-600" }
  ];

  return (
    <div
      className="min-h-screen py-12 relative bg-gradient-to-br from-sky-200 via-sky-300 to-sky-500 bg-fixed overflow-hidden"
    >
      <div className="absolute inset-0 bg-white/30 backdrop-blur-sm z-0"></div>
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
          className="text-center mb-16 animate-fade-in-down"
        >
          <motion.h1
            variants={titleVariants}
            initial="initial"
            animate="animate"
            className="text-6xl font-extrabold text-indigo-600 mb-6 filter drop-shadow-2xl hover:scale-105 transition-all duration-300 font-['Playfair_Display']"
          >
            AI Placement Management System
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="text-xl text-indigo-700 font-medium tracking-wide drop-shadow-md"
          >
            Elevate your career journey with our advanced AI-powered tools
          </motion.p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="initial"
          animate="animate"
          className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4"
        >
          {cardItems.map((item, index) => (
            <motion.div
              key={index}
              variants={cardVariants}
              whileHover="hover"
              className="transform transition-all duration-300"
            >
              <Link
                to={user ? item.to : "/login"}
                className="block bg-white shadow-2xl border border-gray-200 rounded-2xl overflow-hidden hover:border-indigo-400 hover:shadow-indigo-200/50 transition-all duration-300 h-full"
              >
                <div className="p-8 relative group">
                  <div className="relative z-10">
                    <item.icon size={56} className={`mx-auto mb-6 ${item.color} group-hover:${item.hoverColor} group-hover:scale-110 transition-transform duration-300`} />
                    <h2 className="text-2xl font-bold mb-4 text-black filter drop-shadow-lg font-['Playfair_Display']">{item.title}</h2>
                    <p className="text-gray-600 leading-relaxed group-hover:text-gray-800 transition-colors duration-300">{item.description}</p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="text-center mt-12"
        >
          <Link
            to="/signup"
            className="inline-block bg-indigo-500 text-white px-8 py-3 rounded-full text-lg font-semibold hover:bg-indigo-600 transition-all duration-300 shadow-xl hover:shadow-2xl"
          >
            Get Started Now
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default Home;
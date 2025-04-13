import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Users, Briefcase } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const Home: React.FC = () => {
  const { user } = useAuth();
  const cardVariants = {
    initial: { opacity: 0, y: 20, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: "easeOut" } },
    hover: { scale: 1.05, y: -5, transition: { duration: 0.3, ease: "easeInOut" } }
  };

  const containerVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3
      }
    }
  };

  const titleVariants = {
    initial: { opacity: 0, y: -50 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-deep-purple-900 to-black py-12 animate-gradient-x">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
            className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-300 mb-6 filter drop-shadow-lg hover:scale-105 transition-all duration-300 font-['Playfair_Display']"
          >
            AI Placement Management System
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="text-xl text-purple-300 font-medium tracking-wide"
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
          {[
            { to: "/resume-analysis", icon: FileText, title: "Resume Analysis", description: "Get AI-powered insights for your resume", gradient: "from-deep-purple-900 to-deep-purple-700" },
            { to: "/interview-prep", icon: Users, title: "Interview Preparation", description: "Practice with AI-generated interview questions", gradient: "from-deep-purple-800 to-deep-purple-600" },
            { to: "/job-recommendations", icon: Briefcase, title: "Job Recommendations", description: "Discover matched job opportunities", gradient: "from-deep-purple-700 to-deep-purple-500" }
          ].map((item, index) => (
            <motion.div
              key={index}
              variants={cardVariants}
              whileHover="hover"
              className="transform transition-all duration-300"
            >
              <Link
                to={user ? item.to : "/login"}
                className="block bg-deep-purple-900/30 backdrop-blur-xl shadow-xl border border-purple-500/30 rounded-2xl overflow-hidden hover:border-purple-400/50 hover:shadow-purple-500/20 transition-all duration-300 h-full"
              >
                <div className={`p-8 relative overflow-hidden group`}>
                  <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-10 group-hover:opacity-20 transition-opacity duration-300`}></div>

                  <div className="relative z-10">
                    <item.icon size={56} className="mx-auto mb-6 text-purple-400 group-hover:scale-110 transition-transform duration-300" />
                    <h2 className="text-2xl font-bold mb-4 text-purple-300 filter drop-shadow-lg font-['Playfair_Display']">{item.title}</h2>
                    <p className="text-purple-200 leading-relaxed group-hover:text-purple-100 transition-colors duration-300">{item.description}</p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default Home;

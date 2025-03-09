import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Users, Briefcase } from 'lucide-react';
import { motion } from 'framer-motion';

const Home: React.FC = () => {
  const cardVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    hover: { scale: 1.05, y: -5, transition: { duration: 0.3 } }
  };

  const containerVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  return (
    <div className="min-h-screen bg-[conic-gradient(at_top_right,_var(--tw-gradient-stops))] from-indigo-200 via-slate-600 to-indigo-200 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 animate-gradient-x overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 backdrop-blur-3xl"></div>
      <div className="max-w-5xl w-full space-y-16 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="text-center"
        >
          <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-indigo-200 mb-6 filter drop-shadow-lg hover:scale-105 transition-all duration-300">
            AI Placement Management System
          </h1>
          <p className="text-xl text-white/80 font-medium">Empowering Your Career Journey with AI</p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="initial"
          animate="animate"
          className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4"
        >
          {[
            { to: "/resume-analysis", icon: FileText, title: "Resume Analysis", description: "Get AI-powered insights for your resume", gradient: "from-blue-600 to-cyan-500" },
            { to: "/interview-prep", icon: Users, title: "Interview Preparation", description: "Practice with AI-generated interview questions", gradient: "from-emerald-600 to-teal-500" },
            { to: "/job-recommendations", icon: Briefcase, title: "Job Recommendations", description: "Discover matched job opportunities", gradient: "from-purple-600 to-indigo-500" }
          ].map((item, index) => (
            <motion.div
              key={index}
              variants={cardVariants}
              whileHover="hover"
              className="transform transition-all duration-300"
            >
              <Link
                to={item.to}
                className="block bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-white/20 hover:border-white/40 transition-all duration-300 h-full hover:shadow-indigo-500/20"
              >
                <div className={`p-8 relative overflow-hidden group`}>
                  <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-10 group-hover:opacity-20 transition-opacity duration-300`}></div>
                  <div className="relative z-10">
                    <item.icon size={56} className="mx-auto mb-6 text-white/90 group-hover:scale-110 transition-transform duration-300" />
                    <h2 className="text-2xl font-bold mb-4 text-white filter drop-shadow-lg">{item.title}</h2>
                    <p className="text-white/70 group-hover:text-white/90 transition-colors duration-300">{item.description}</p>
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

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "./Sidebar";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { useThemeStore } from "../../store/themeStore";
import { NotificationToastContainer } from "../features/Notifications/NotificationToast";
import WebSocketStatus from "../shared/WebSocketStatus";

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isSidebarOpen = useThemeStore(state => state.isSidebarOpen);
  const toggleSidebar = useThemeStore(state => state.toggleSidebar);
  const theme = useThemeStore(state => state.theme);

  return (
    <div className={`h-screen w-screen overflow-hidden ${
      theme === 'light' 
        ? 'bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200' 
        : 'bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900'
    }`}>
      {/* Sidebar Toggle Button */}
      <motion.button
        onClick={toggleSidebar}
        className={`
          fixed top-6 left-6 z-50 p-3 rounded-xl transition-all duration-300 group
          ${theme === 'light'
            ? 'bg-white/80 hover:bg-white border border-slate-200 shadow-lg'
            : 'bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 shadow-xl'
          }
          backdrop-blur-sm
        `}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
      >
        <motion.div
          animate={{ rotate: isSidebarOpen ? 0 : 180 }}
          transition={{ duration: 0.3 }}
        >
          {isSidebarOpen ? (
            <ChevronLeftIcon className={`w-5 h-5 transition-colors ${
              theme === 'light' 
                ? 'text-slate-600 group-hover:text-indigo-600' 
                : 'text-white group-hover:text-indigo-400'
            }`} />
          ) : (
            <ChevronRightIcon className={`w-5 h-5 transition-colors ${
              theme === 'light' 
                ? 'text-slate-600 group-hover:text-indigo-600' 
                : 'text-white group-hover:text-indigo-400'
            }`} />
          )}
        </motion.div>
      </motion.button>

      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.div
            className="fixed left-0 top-0 h-full w-80 z-40"
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <Sidebar />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay for mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleSidebar}
          />
        )}
      </AnimatePresence>

      {/* Main Content */}
      <motion.main
        className={`h-full transition-all duration-300 ${
          isSidebarOpen ? 'lg:ml-80' : 'ml-0'
        }`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div className="h-full p-6 pt-20 overflow-auto">
          <div className={`
            min-h-full rounded-2xl shadow-2xl
            ${theme === 'light'
              ? 'bg-white/90 border border-slate-200'
              : 'bg-slate-800/90 border border-white/10'
            }
            backdrop-blur-sm
          `}>
            <div className="p-6 overflow-auto">
              {children}
            </div>
          </div>
        </div>
      </motion.main>

      {/* WebSocket Status */}
      <div className="fixed bottom-6 right-6 z-50">
        <WebSocketStatus />
      </div>

      {/* Notifications */}
      <NotificationToastContainer />
    </div>
  );
};

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTheme } from '@/context/ThemeContext';
import { 
  HiHome, 
  HiDocumentText, 
  HiChartBar, 
  HiCollection, 
  HiUser, 
  HiCamera, 
  HiQuestionMarkCircle, 
  HiChevronLeft, 
  HiChevronRight,
  HiClock,
  HiDownload,
  HiSparkles
} from 'react-icons/hi';

interface SidebarProps {
  onCollapse?: (collapsed: boolean) => void;
}

const navItems = [
  { label: 'Home', href: '/', icon: HiHome, color: 'from-green-500/20 to-green-600/20' },
  { label: 'Upload & Summarize', href: '/upload', icon: HiDocumentText, color: 'from-blue-500/20 to-blue-600/20' },
  { label: 'Previous Summaries', href: '/summaries', icon: HiCollection, color: 'from-purple-500/20 to-purple-600/20' },
  { label: 'Real-Time Camera', href: '/camera', icon: HiCamera, color: 'from-pink-500/20 to-pink-600/20' },
  { label: 'Question & Answer', href: '/qa', icon: HiQuestionMarkCircle, color: 'from-orange-500/20 to-orange-600/20' },
  { label: 'Analytics', href: '/analytics', icon: HiChartBar, color: 'from-red-500/20 to-red-600/20' },
  { label: 'Premium', href: '/premium', icon: HiSparkles, color: 'from-yellow-500/20 to-yellow-600/20' },
  { label: 'Profile', href: '/profile', icon: HiUser, color: 'from-cyan-500/20 to-cyan-600/20' },
];

const recentHistory = [
  { title: 'Quantum Computing Research', date: 'Apr 2, 2025', score: 98, duration: '5 pages' },
  { title: 'AI Ethics in Healthcare', date: 'Apr 1, 2025', score: 95, duration: '10 pages' },
  { title: 'Climate Change Analysis', date: 'Mar 30, 2025', score: 92, duration: '8 pages' },
];

export default function Sidebar({ onCollapse }: SidebarProps) {
  const { themeColor } = useTheme();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    onCollapse?.(isCollapsed);
  }, [isCollapsed, onCollapse]);

  return (
    <motion.aside
      initial={false}
      animate={{ 
        width: isCollapsed ? 90 : 320,
        paddingLeft: isCollapsed ? 16 : 24,
        paddingRight: isCollapsed ? 16 : 24
      }}
      className="fixed left-0 top-0 bottom-0 z-40 flex flex-col py-8 bg-black/70 backdrop-blur-xl border-r border-white/10 rounded-tr-2xl rounded-br-2xl"
      style={{
        top: '70px',
        height: 'calc(100vh - 120px)'
      }}
    >
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-4 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
      >
        {isCollapsed ? (
          <HiChevronRight className="w-5 h-5 text-white" />
        ) : (
          <HiChevronLeft className="w-5 h-5 text-white" />
        )}
      </button>

      <div className="flex items-center space-x-3 mb-8">
        <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
          <HiDocumentText className="w-6 h-6 text-white" />
        </div>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-white font-medium text-lg"
          >
            AI Research Summarizer
          </motion.div>
        )}
      </div>

      <nav className="flex-1">
        {navItems.map((item) => {
          const isActive = router.pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl mb-2 transition-colors ${
                isActive 
                  ? `bg-${themeColor}22` 
                  : 'hover:bg-white/10'
              }`}
            >
              <div className={`w-7 h-7 rounded-2xl bg-gradient-to-br ${item.color} bg-opacity-20 flex items-center justify-center`}>
                <Icon 
                  className="w-7 h-7 text-white p-1"
                  style={{
                    filter: isActive ? 'drop-shadow(0 0 8px rgba(255,255,255,0.5))' : 'none'
                  }}
                />
              </div>
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={`text-white transition-colors ${isActive ? 'text-white' : 'text-white/70'}`}
                >
                  {item.label}
                </motion.span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Recent Summaries Section */}
      {!isCollapsed && (
        <div className="mt-4 mb-4">
          <div className="flex items-center space-x-2 mb-3 text-white/60">
            <HiClock className="w-4 h-4" />
            <span className="text-sm font-medium">Recent Summaries</span>
          </div>
          <div className="space-y-2">
            {recentHistory.map((item, index) => (
              <div
                key={index}
                className="bg-white/5 rounded-lg p-3 hover:bg-white/10 transition-colors cursor-pointer"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-white text-sm font-medium">{item.title}</div>
                    <div className="text-white/40 text-xs">{item.date}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-white/80 text-sm font-medium">{item.score}%</div>
                    <div className="text-white/40 text-xs">{item.duration}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={`${isCollapsed ? 'px-2' : 'px-4'} py-4 bg-black/30 rounded-xl border border-white/10`}>
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
            <HiDownload className="w-5 h-5 text-white" />
          </div>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="text-white font-medium">Documents</div>
              <div className="text-white/60 text-xs">23 files processed</div>
            </motion.div>
          )}
        </div>
        {!isCollapsed && (
          <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full"
              style={{ 
                width: '65%',
                background: `linear-gradient(90deg, ${themeColor}88, ${themeColor})`
              }}
            ></div>
          </div>
        )}
      </div>
    </motion.aside>
  );
}

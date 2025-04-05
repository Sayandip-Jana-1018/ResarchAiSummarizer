import { useTheme } from '../../context/ThemeContext';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  HiHome, 
  HiDocumentText, 
  HiChartBar, 
  HiCollection, 
  HiUser, 
  HiCamera, 
  HiQuestionMarkCircle,
  HiCog,
  HiSparkles
} from 'react-icons/hi';

const navLinks = [
  { label: 'Home', href: '/', icon: HiHome, color: '#4CAF50' },
  { label: 'Upload', href: '/upload', icon: HiDocumentText, color: '#2196F3' },
  { label: 'Summaries', href: '/summaries', icon: HiCollection, color: '#9C27B0' },
  { label: 'Camera', href: '/camera', icon: HiCamera, color: '#FF4081' },
  { label: 'Q&A', href: '/qa', icon: HiQuestionMarkCircle, color: '#FF9800' },
  { label: 'Analytics', href: '/analytics', icon: HiChartBar, color: '#E91E63' },
  { label: 'Premium', href: '/premium', icon: HiSparkles, color: '#FFD700' },
  { label: 'Profile', href: '/profile', icon: HiUser, color: '#00BCD4' }
];

export default function Navbar() {
  const { themeColor } = useTheme();
  const router = useRouter();

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-3 left-[41%] -translate-x-1/2 w-auto z-10"
    >
      <div className="relative flex items-center gap-1 p-2 rounded-2xl nav-glass-container">
        {navLinks.map((link) => {
          const isActive = router.pathname === link.href;
          const Icon = link.icon;

          return (
            <Link key={link.href} href={link.href} passHref>
              <motion.div
                className="relative px-4 py-2 rounded-xl transition-all duration-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isActive && (
                  <motion.div
                    layoutId="navBackground"
                    className="absolute inset-0 rounded-xl"
                    style={{ 
                      background: `linear-gradient(135deg, ${link.color}22 0%, ${link.color}44 100%)`,
                      backdropFilter: 'blur(8px)',
                      border: `1px solid ${link.color}33`
                    }}
                    transition={{ type: 'spring', duration: 0.5 }}
                  />
                )}
                <div className="relative flex flex-col items-center">
                  <Icon 
                    className={`w-6 h-5 mb-1 transition-colors ${
                      isActive ? 'text-white' : 'text-white/50'
                    }`}
                    style={{ color: link.color }}
                  />
                  <span 
                    className={`text-xs transition-colors ${
                      isActive ? 'text-white' : 'text-white/50'
                    }`}
                  >
                    {link.label}
                  </span>
                </div>
              </motion.div>
            </Link>
          );
        })}
      </div>

      {/* Glowing Border and Glass Effect */}
      <style jsx>{`
        .nav-glass-container {
          background: rgba(0, 0, 0, 0.2);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 
            0 10px 15px -3px rgba(0, 0, 0, 0.1),
            0 4px 6px -2px rgba(0, 0, 0, 0.05),
            0 0 0 1px rgba(255, 255, 255, 0.1) inset,
            0 8px 32px 0 rgba(31, 38, 135, 0.37);
          background-image: linear-gradient(
            125deg,
            rgba(255, 255, 255, 0.1) 0%,
            rgba(255, 255, 255, 0.05) 40%,
            rgba(255, 255, 255, 0) 100%
          );
        }
      `}</style>
    </motion.nav>
  );
}

import { useTheme } from '../../context/ThemeContext';
import { motion } from 'framer-motion';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { useState } from 'react';

// Helper function to darken a color
const darkenColor = (color: string, amount: number): string => {
  if (color.startsWith('#')) {
    const r = Math.max(0, parseInt(color.slice(1, 3), 16) - amount);
    const g = Math.max(0, parseInt(color.slice(3, 5), 16) - amount);
    const b = Math.max(0, parseInt(color.slice(5, 7), 16) - amount);
    return `rgb(${r}, ${g}, ${b})`;
  }
  return color;
};

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function AppLayout({ children, title }: AppLayoutProps) {
  const { themeColor } = useTheme();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div
      className="min-h-screen w-full text-center relative overflow-hidden bg-black"
      style={{
        background: `
          linear-gradient(135deg,
            ${darkenColor(themeColor, 60)} 0%,
            ${darkenColor(themeColor, 80)} 10%,
            ${darkenColor(themeColor, 100)} 20%,
            rgba(0, 0, 0, 1) 40%,
            rgba(0, 0, 0, 1) 60%,
            ${darkenColor(themeColor, 100)} 80%,
            ${darkenColor(themeColor, 80)} 90%,
            ${darkenColor(themeColor, 60)} 100%
          )
        `,
        backgroundAttachment: 'fixed'
      }}
    >
      <Navbar />
      <Sidebar onCollapse={(collapsed) => setSidebarCollapsed(collapsed)} />

      <main 
        className="transition-all duration-700 pt-20"
        style={{
          paddingLeft: sidebarCollapsed ? '5rem' : '16rem'
        }}
      >
        <motion.div 
          className="container mx-auto p-8"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            duration: 1.5,
            ease: "easeOut"
          }}
        >
          {children}
        </motion.div>
      </main>

      {/* Decorative gradient orbs */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.2 }}
          animate={{ opacity: 0.3, scale: 2 }}
          transition={{ 
            duration: 20,
            repeat: Infinity,
            repeatType: "reverse",
            delay: i * 5
          }}
          className="absolute rounded-full blur-3xl"
          style={{
            background: `radial-gradient(circle, ${themeColor}22 0%, transparent 70%)`,
            width: '40vw',
            height: '40vw',
            top: i === 0 ? '-20%' : i === 1 ? '60%' : '30%',
            left: i === 0 ? '70%' : i === 1 ? '-10%' : '40%',
            zIndex: -1
          }}
        />
      ))}
    </div>
  );
}

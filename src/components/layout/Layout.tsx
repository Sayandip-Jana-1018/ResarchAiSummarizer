import React, { useState } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import ThemeSelector from '../ThemeSelector';
import { useTheme } from '@/context/ThemeContext';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { themeColor } = useTheme();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen w-full relative overflow-hidden">
      <Navbar />
      <Sidebar onCollapse={setSidebarCollapsed} />
      <ThemeSelector />
      
      <main 
        className="pt-24 pb-12 transition-all duration-300"
        style={{
          marginLeft: sidebarCollapsed ? '90px' : '320px',
          marginRight: '20px'
        }}
      >
        {children}
      </main>
      
      {/* Decorative elements */}
      <div 
        className="fixed top-0 right-0 w-[800px] h-[800px] rounded-full opacity-20 blur-3xl pointer-events-none z-[-1]"
        style={{ 
          background: `radial-gradient(circle, ${themeColor}44 0%, transparent 70%)`,
        }}
      />
      <div 
        className="fixed bottom-0 left-0 w-[600px] h-[600px] rounded-full opacity-10 blur-3xl pointer-events-none z-[-1]"
        style={{ 
          background: `radial-gradient(circle, ${themeColor}44 0%, transparent 70%)`,
        }}
      />
    </div>
  );
}

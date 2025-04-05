import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';
import ThemeSelector from '@/components/ThemeSelector';
import Image from 'next/image';
import Link from 'next/link';
import { HiArrowRight, HiDocumentText, HiCamera, HiQuestionMarkCircle, HiChartBar } from 'react-icons/hi';

export default function Home() {
  const { themeColor, darkMode } = useTheme();
  const [isLoaded, setIsLoaded] = useState(false);

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

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const features = [
    { 
      title: 'Upload & Summarize', 
      description: 'Upload research papers and get AI-powered summaries instantly',
      icon: HiDocumentText,
      href: '/upload',
      color: '#2196F3' 
    },
    { 
      title: 'Real-Time Camera', 
      description: 'Use your camera to capture and analyze documents on the go',
      icon: HiCamera,
      href: '/camera',
      color: '#FF4081' 
    },
    { 
      title: 'Q&A with Documents', 
      description: 'Ask questions about your research papers and get intelligent answers',
      icon: HiQuestionMarkCircle,
      href: '/qa',
      color: '#FF9800' 
    },
    { 
      title: 'Analytics Dashboard', 
      description: 'Track your research activity with detailed analytics',
      icon: HiChartBar,
      href: '/analytics',
      color: '#E91E63' 
    }
  ];

  return (
    <div
      className="min-h-screen w-full -mt-8 left-36 absolute overflow-none"
    >
      {/* Theme selector in top right */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeSelector />
      </div>

      {/* Animated gradient orbs */}
      {[...Array(7)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.2 }}
          animate={{ 
            opacity: [0.3, 0.7, 0.3],
            scale: [1, 1.8, 1],
            x: [0, Math.random() * 100 - 50, 0],
            y: [0, Math.random() * 100 - 50, 0],
          }}
          transition={{ 
            duration: 15 + i * 3,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
            delay: i * 1.5
          }}
          className="absolute rounded-full blur-3xl"
        />
      ))}

      {/* Main content */}
      <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center min-h-screen relative z-10">
        <AnimatePresence>
          {isLoaded && (
            <>
              {/* Logo and Title */}
              <motion.div
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="flex flex-col items-center mb-8"
              >
                <div className="w-40 h-40 mb-6 relative">
                  <Image
                    src="/3dlogo.webp"
                    alt="AI Research Summarizer"
                    fill
                    style={{ objectFit: 'contain' }}
                    className="drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                  />
                </div>
                <motion.h1 
                  className="text-6xl md:text-8xl font-bold text-white mb-6 text-center"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3, duration: 0.8 }}
                >
                  <span className="bg-clip-text text-transparent relative" 
                    style={{ 
                      backgroundImage: `linear-gradient(90deg, #fff, ${themeColor}, #fff)`,
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 2s infinite' 
                    }}
                  >
                    AI Research Summarizer
                    <motion.div 
                      className="absolute -inset-1 rounded-lg opacity-50 blur-xl -z-10"
                      animate={{ 
                        opacity: [0.3, 0.7, 0.3],
                        scale: [1, 1.05, 1],
                      }}
                      transition={{ duration: 3, repeat: Infinity }}
                      style={{ 
                        background: `linear-gradient(90deg, transparent, ${themeColor}, transparent)`,
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 3s infinite'
                      }}
                    />
                  </span>
                </motion.h1>
                <motion.p 
                  className="text-xl md:text-3xl text-white/90 text-center max-w-3xl"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                >
                  Transform complex scientific papers into clear, concise summaries with the power of artificial intelligence
                </motion.p>
              </motion.div>

              {/* CTA Button */}
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.8 }}
                className="mb-20"
              >
                <Link href="/upload">
                  <motion.button
                    className="px-10 py-5 rounded-full text-white font-bold text-xl flex items-center gap-3 overflow-hidden relative"
                    style={{ 
                      background: `linear-gradient(90deg, ${themeColor}, ${darkenColor(themeColor, 40)})`,
                      boxShadow: `0 0 30px ${themeColor}88, 0 0 60px ${themeColor}44`
                    }}
                    whileHover={{ scale: 1.05, boxShadow: `0 0 40px ${themeColor}aa, 0 0 80px ${themeColor}66` }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span>Get Started</span>
                    <HiArrowRight className="w-6 h-6" />
                    <motion.div 
                      className="absolute inset-0"
                      initial={{ x: '-100%' }}
                      animate={{ x: '200%' }}
                      transition={{ 
                        repeat: Infinity, 
                        duration: 1.5,
                        ease: "easeInOut"
                      }}
                      style={{ 
                        background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)`,
                        width: '50%'
                      }}
                    />
                  </motion.button>
                </Link>
              </motion.div>

              {/* Features */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9, duration: 0.8 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 w-full max-w-7xl"
              >
                {features.map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 + index * 0.1, duration: 0.6 }}
                  >
                    <Link href={feature.href}>
                      <motion.div 
                        className="bg-black/30 backdrop-blur-lg p-8 rounded-2xl h-full border border-white/10 flex flex-col relative overflow-hidden"
                        whileHover={{ 
                          y: -10,
                          boxShadow: `0 10px 30px -5px ${feature.color}66`
                        }}
                        transition={{ duration: 0.2 }}
                      >
                        {/* Background gradient */}
                        <motion.div 
                          className="absolute -inset-1 opacity-30 rounded-2xl -z-10 blur-xl"
                          animate={{ 
                            opacity: [0.2, 0.4, 0.2],
                            scale: [1, 1.05, 1],
                          }}
                          transition={{ duration: 4, repeat: Infinity }}
                          style={{ 
                            background: `radial-gradient(circle at top right, ${feature.color}, transparent 70%)`
                          }}
                        />
                        
                        <div 
                          className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
                          style={{ 
                            background: `linear-gradient(135deg, ${feature.color}22, ${feature.color}44)`,
                            border: `2px solid ${feature.color}66`,
                            boxShadow: `0 0 20px ${feature.color}33`
                          }}
                        >
                          <feature.icon className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-2xl font-semibold text-white mb-3">{feature.title}</h3>
                        <p className="text-white/70 text-base flex-grow">{feature.description}</p>
                        <div className="mt-6 flex items-center text-base font-medium" style={{ color: feature.color }}>
                          <span>Explore</span>
                          <HiArrowRight className="w-5 h-5 ml-2" />
                        </div>
                      </motion.div>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* CSS for shimmer effect */}
      <style jsx global>{`
        @keyframes shimmer {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
}
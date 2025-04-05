import React from 'react';
import { motion } from 'framer-motion';
import { 
  HiOutlineDocumentText, 
  HiOutlineTranslate, 
  HiOutlinePencilAlt,
  HiOutlineAcademicCap,
  HiOutlineBeaker,
  HiOutlineClipboardCheck,
  HiOutlineViewList,
  HiOutlineLightBulb,
  HiOutlineSparkles
} from 'react-icons/hi';
import { useTheme } from '@/context/ThemeContext';

export interface SummarizationOptionsType {
  length: 'short' | 'medium' | 'long';
  style: 'bullet' | 'paragraph';
  focus: 'methods' | 'results' | 'conclusions' | 'comprehensive';
  language: string;
}

export const languageOptions = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' },
  { code: 'bn', name: 'Bengali' },
  { code: 'mr', name: 'Marathi' },
  { code: 'te', name: 'Telugu' },
  { code: 'ta', name: 'Tamil' },
  { code: 'gu', name: 'Gujarati' },
  { code: 'kn', name: 'Kannada' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'pa', name: 'Punjabi' },
  { code: 'or', name: 'Odia' },
  { code: 'as', name: 'Assamese' },
  { code: 'ur', name: 'Urdu' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ru', name: 'Russian' }
];

interface SummarizationOptionsProps {
  options: SummarizationOptionsType;
  onChange: (options: SummarizationOptionsType) => void;
}

export default function SummarizationOptions({ options, onChange }: SummarizationOptionsProps) {
  const { themeColor } = useTheme();
  
  const handleChange = (key: keyof SummarizationOptionsType, value: any) => {
    onChange({
      ...options,
      [key]: value
    });
  };
  
  const languages = languageOptions.map(lang => {
    const flagIcons: Record<string, string> = {
      'en': '🇺🇸', 'es': '🇪🇸', 'fr': '🇫🇷', 'de': '🇩🇪', 'it': '🇮🇹', 'pt': '🇵🇹',
      'ru': '🇷🇺', 'zh': '🇨🇳', 'ja': '🇯🇵', 'ko': '🇰🇷', 'ar': '🇸🇦', 'hi': '🇮🇳',
      'bn': '🇧🇩', 'mr': '🇮🇳', 'te': '🇮🇳', 'ta': '🇮🇳', 'gu': '🇮🇳', 'kn': '🇸🇳',
      'ml': '🇮🇳', 'pa': '🇮🇳', 'or': '🇮🇳', 'as': '🇮🇳', 'ur': '🇮🇳'
    };
    return {
      ...lang,
      icon: flagIcons[lang.code] || '🌐'
    };
  });
  
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  return (
    <div className="w-full flex justify-center">
      <motion.div 
        className={`bg-gradient-to-br from-${themeColor}-800/50 to-black/50 rounded-2xl shadow-2xl border border-${themeColor}-400/20 overflow-hidden backdrop-blur-md max-w-4xl w-full`}
        initial="hidden"
        animate="show"
        variants={containerVariants}
        style={{
          boxShadow: `0 10px 30px -5px rgba(var(--color-${themeColor}-500), 0.2)`
        }}
      >
        {/* Header */}
        <div className={`px-6 py-5 bg-gradient-to-r from-${themeColor}-500/60 to-${themeColor}-700/60 border-b border-${themeColor}-400/20 flex items-center justify-between backdrop-blur-sm`}>
          <div className="flex items-center">
            <div className={`p-3 rounded-full bg-gradient-to-br from-${themeColor}-400 to-${themeColor}-600 text-white mr-4 shadow-lg`}>
              <HiOutlineSparkles className="h-6 w-6" />
            </div>
            <h2 className="text-white font-semibold text-xl tracking-tight">Summarization Options</h2>
          </div>
          <div className="text-xs text-white font-medium bg-gradient-to-r from-${themeColor}-500/40 to-${themeColor}-600/30 px-3 py-1.5 rounded-full border border-${themeColor}-400/30 shadow-inner backdrop-blur-sm">
            AI-Powered
          </div>
        </div>
        
        {/* Options Container */}
        <div className="p-8 space-y-10 flex flex-col items-center">
          {/* Length Option */}
          <motion.div className="relative w-full max-w-3xl" variants={itemVariants}>
            <div className="flex items-center mb-4">
              <div className={`p-2 rounded-full bg-gradient-to-br from-${themeColor}-400 to-${themeColor}-600 text-white mr-3 shadow-md`}>
                <HiOutlineDocumentText className="h-5 w-5" />
              </div>
              <h3 className="text-white font-medium text-lg">Summary Length</h3>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {(['short', 'medium', 'long'] as const).map((length) => (
                <motion.button
                  key={length}
                  type="button"
                  className={`
                    relative py-3 px-4 rounded-xl text-sm font-medium transition-all duration-300
                    ${options.length === length 
                      ? `bg-gradient-to-br from-${themeColor}-500/30 to-${themeColor}-700/30 border border-${themeColor}-400/40 text-white shadow-md` 
                      : `bg-transparent border border-${themeColor}-400/20 text-white/80 hover:bg-${themeColor}-500/10 hover:border-${themeColor}-400/30`}
                  `}
                  onClick={() => handleChange('length', length)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="flex items-center justify-center">
                    {length === 'short' && <span className="w-4 h-1 bg-current rounded mr-2"></span>}
                    {length === 'medium' && <span className="w-6 h-1 bg-current rounded mr-2"></span>}
                    {length === 'long' && <span className="w-8 h-1 bg-current rounded mr-2"></span>}
                    {length.charAt(0).toUpperCase() + length.slice(1)}
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.div>
          
          {/* Style Option */}
          <motion.div className="relative w-full max-w-3xl" variants={itemVariants}>
            <div className="flex items-center mb-4">
              <div className={`p-2 rounded-full bg-gradient-to-br from-${themeColor}-400 to-${themeColor}-600 text-white mr-3 shadow-md`}>
                <HiOutlinePencilAlt className="h-5 w-5" />
              </div>
              <h3 className="text-white font-medium text-lg">Summary Style</h3>
            </div>
            <div className={`p-1 bg-gradient-to-r from-${themeColor}-600/30 to-${themeColor}-700/20 rounded-xl flex backdrop-blur-sm`}>
              {(['bullet', 'paragraph'] as const).map((style) => (
                <motion.button
                  key={style}
                  type="button"
                  className={`
                    flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-300 flex items-center justify-center
                    ${options.style === style 
                      ? `bg-gradient-to-br from-${themeColor}-500/40 to-${themeColor}-700/40 text-white` 
                      : 'bg-transparent text-white/80 hover:bg-${themeColor}-500/10'}
                  `}
                  onClick={() => handleChange('style', style)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {style === 'bullet' ? (
                    <>
                      <HiOutlineViewList className="mr-2 h-4 w-4" />
                      <span>Bullet Points</span>
                    </>
                  ) : (
                    <>
                      <HiOutlineDocumentText className="mr-2 h-4 w-4" />
                      <span>Paragraphs</span>
                    </>
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
          
          {/* Focus Option */}
          <motion.div className="relative w-full max-w-3xl" variants={itemVariants}>
            <div className="flex items-center mb-4">
              <div className={`p-2 rounded-full bg-gradient-to-br from-${themeColor}-400 to-${themeColor}-600 text-white mr-3 shadow-md`}>
                <HiOutlineLightBulb className="h-5 w-5" />
              </div>
              <h3 className="text-white font-medium text-lg">Summary Focus</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {(['methods', 'results', 'conclusions', 'comprehensive'] as const).map((focus) => {
                const icons = {
                  methods: <HiOutlineBeaker className="h-4 w-4" />,
                  results: <HiOutlineClipboardCheck className="h-4 w-4" />,
                  conclusions: <HiOutlineAcademicCap className="h-4 w-4" />,
                  comprehensive: <HiOutlineDocumentText className="h-4 w-4" />
                };
                return (
                  <motion.button
                    key={focus}
                    type="button"
                    className={`
                      relative py-3 px-4 rounded-xl text-sm font-medium transition-all duration-300
                      ${options.focus === focus 
                        ? `bg-gradient-to-br from-${themeColor}-500/30 to-${themeColor}-700/30 border border-${themeColor}-400/40 text-white shadow-md` 
                        : `bg-transparent border border-${themeColor}-400/20 text-white/80 hover:bg-${themeColor}-500/10 hover:border-${themeColor}-400/30`}
                    `}
                    onClick={() => handleChange('focus', focus)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span className="flex items-center justify-center">
                      <span className="mr-2">{icons[focus]}</span>
                      {focus.charAt(0).toUpperCase() + focus.slice(1)}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
          
          {/* Language Option */}
          <motion.div className="relative w-full max-w-3xl" variants={itemVariants}>
            <div className="flex items-center mb-4">
              <div className={`p-2 rounded-full bg-gradient-to-br from-${themeColor}-400 to-${themeColor}-600 text-white mr-3 shadow-md`}>
                <HiOutlineTranslate className="h-5 w-5" />
              </div>
              <h3 className="text-white font-medium text-lg">Output Language</h3>
            </div>
            <div className="relative">
              <select
                value={options.language}
                onChange={(e) => handleChange('language', e.target.value)}
                className={`w-full text-white rounded-xl py-3.5 px-4 border border-${themeColor}-400/30 focus:outline-none focus:ring-2 focus:ring-${themeColor}-500 focus:border-transparent shadow-lg appearance-none transition-all duration-300 bg-black/20 backdrop-blur-md`}
              >
                {languages.map((lang) => (
                  <option 
                    key={lang.code} 
                    value={lang.code}
                    style={{ 
                      backgroundColor: `rgba(0, 0, 0, 0.8)`,
                      color: 'white',
                      padding: '8px',
                    }}
                  >
                    {lang.icon} {lang.name}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                <div className={`p-1.5 rounded-md bg-gradient-to-br from-${themeColor}-400 to-${themeColor}-600 text-white shadow-inner backdrop-blur-sm`}>
                  <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="absolute top-full mt-2 left-0 right-0 text-xs text-${themeColor}-300 flex items-center justify-center">
                <HiOutlineTranslate className="h-3 w-3 mr-1" />
                <span>Summaries will be generated in {languages.find(l => l.code === options.language)?.name}</span>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
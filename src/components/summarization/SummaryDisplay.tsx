import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HiPencil, 
  HiSave, 
  HiClipboard, 
  HiDownload, 
  HiShare, 
  HiAnnotation,
  HiOutlineBookmark,
  HiOutlineBookmarkAlt,
  HiOutlineExclamation,
  HiOutlineCheck,
  HiOutlineX,
  HiOutlineRefresh,
  HiOutlineFilter,
  HiOutlineBookOpen,
  HiOutlineClock,
  HiOutlineSparkles,
  HiOutlineTranslate
} from 'react-icons/hi';
import { useToast } from '@/components/ui/use-toast';

interface SummaryDisplayProps {
  summary: string;
  onEdit: (editedSummary: string) => void;
  extractedText: string | null;
  metadata: {
    processingTime: number;
    wordCount: number;
    model: string;
    language?: string;
  } | null;
}

export default function SummaryDisplay({ 
  summary, 
  onEdit,
  extractedText,
  metadata
}: SummaryDisplayProps) {
  const { themeColor } = useTheme();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedSummary, setEditedSummary] = useState(summary);
  const [highlights, setHighlights] = useState<{text: string, color: string}[]>([]);
  const [currentHighlightColor, setCurrentHighlightColor] = useState<string>('yellow');
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);
  
  // Highlight colors
  const highlightColors = [
    { name: 'yellow', color: '#FFF176' },
    { name: 'blue', color: '#90CAF9' },
    { name: 'green', color: '#A5D6A7' },
    { name: 'pink', color: '#F48FB1' },
    { name: 'orange', color: '#FFCC80' },
  ];
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  
  // Helper function to get language name from code
  const getLanguageName = (code: string) => {
    const languages = {
      en: 'English',
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      zh: 'Chinese',
      ja: 'Japanese',
      hi: 'Hindi',
      ar: 'Arabic',
      ru: 'Russian',
      pt: 'Portuguese',
    };
    return languages[code as keyof typeof languages] || code;
  };
  
  // Helper function to get language-specific font family
  const getLanguageFont = (code: string) => {
    const fonts = {
      zh: "'Noto Sans SC', 'Inter', sans-serif",
      ja: "'Noto Sans JP', 'Inter', sans-serif",
      hi: "'Noto Sans Devanagari', 'Inter', sans-serif",
      ar: "'Noto Sans Arabic', 'Inter', sans-serif",
      ru: "'Noto Sans', 'Inter', sans-serif",
    };
    return fonts[code as keyof typeof fonts] || "'Merriweather', 'Georgia', serif";
  };
  
  // Process summary content based on language and style
  const processSummaryContent = (content: string, language: string, style: string) => {
    let processedContent = content;
    
    // Clean up extra whitespace and newlines
    processedContent = processedContent.replace(/\n{3,}/g, '\n\n');
    
    // Handle bullet points
    if (style === 'bullet') {
      // Split into sections by double newline
      const sections = processedContent.split(/\n\n+/);
      
      processedContent = sections.map(section => {
        // If section starts with a heading (# or ##), preserve it
        if (section.startsWith('#')) {
          return section;
        }
        
        // For bullet points, split by newline and add proper formatting
        const lines = section.split('\n').filter(line => line.trim() !== '');
        if (lines.length > 1) {
          return lines.map(line => {
            // If line already has bullet point markers, preserve them
            if (line.startsWith('- ') || line.startsWith('* ')) {
              return line;
            }
            // Otherwise add bullet point
            return `- ${line}`;
          }).join('\n');
        }
        return section;
      }).join('\n\n');
    }
    
    // Clean up markdown formatting
    processedContent = processedContent
      // Fix heading spacing
      .replace(/^(#{1,6})\s*(.+)$/gm, '$1 $2')
      // Fix bullet point spacing
      .replace(/^[-*]\s*(.+)$/gm, '- $1')
      // Fix bold/italic spacing
      .replace(/\*\*(\S)/g, '** $1')
      .replace(/(\S)\*\*/g, '$1 **')
      .replace(/_(\S)/g, '_ $1')
      .replace(/(\S)_/g, '$1 _');
    
    return processedContent;
  };

  // Update edited summary when original summary changes
  React.useEffect(() => {
    setEditedSummary(summary);
  }, [summary]);

  const handleEdit = () => {
    setIsEditing(true);
    setTimeout(() => {
      if (textAreaRef.current) {
        textAreaRef.current.focus();
      }
    }, 100);
  };

  const handleSave = () => {
    onEdit(editedSummary);
    setIsEditing(false);
    toast({
      title: "Summary updated",
      description: "Your changes have been saved successfully",
    });
  };

  const handleCancel = () => {
    setEditedSummary(summary);
    setIsEditing(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editedSummary);
    toast({
      title: "Copied to clipboard",
      description: "The summary has been copied to your clipboard",
    });
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([editedSummary], {type: 'text/markdown'});
    element.href = URL.createObjectURL(file);
    element.download = `research-summary-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    toast({
      title: "Summary downloaded",
      description: "The summary has been downloaded as a Markdown file",
    });
  };

  const handleHighlight = () => {
    setShowColorPicker(!showColorPicker);
  };
  
  const applyHighlight = () => {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) {
      const selectedText = selection.toString();
      if (selectedText && selectedText.trim().length > 0) {
        const existingHighlight = highlights.find(h => h.text === selectedText);
        if (existingHighlight) {
          setHighlights(highlights.map(h => 
            h.text === selectedText ? { ...h, color: currentHighlightColor } : h
          ));
          toast({
            title: "Highlight updated",
            description: `Changed highlight color to ${currentHighlightColor}`,
          });
        } else {
          setHighlights([...highlights, { text: selectedText, color: currentHighlightColor }]);
          toast({
            title: "Text highlighted",
            description: `"${selectedText.substring(0, 20)}${selectedText.length > 20 ? '...' : ''}" has been highlighted`,
          });
        }
        setShowColorPicker(false);
      } else {
        toast({
          title: "No text selected",
          description: "Please select some text to highlight",
          variant: "destructive"
        });
      }
    } else {
      toast({
        title: "No text selected",
        description: "Please select some text to highlight",
        variant: "destructive"
      });
    }
  };

  const clearHighlights = () => {
    setHighlights([]);
    toast({
      title: "Highlights cleared",
      description: "All highlights have been removed",
    });
  };

  const highlightText = (text: string) => {
    if (!highlights.length) return text;
    
    let highlightedText = text;
    
    try {
      const sortedHighlights = [...highlights].sort((a, b) => b.text.length - a.text.length);
      
      sortedHighlights.forEach(highlight => {
        if (!highlight.text || !highlight.text.trim()) return;
        
        const escapedText = highlight.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedText, 'gi');
        highlightedText = highlightedText.replace(regex, match => 
          `<span style="background-color: ${highlight.color}; padding: 0 2px; border-radius: 2px; display: inline;">${match}</span>`
        );
      });
      
      return highlightedText;
    } catch (error) {
      console.error('Error applying highlights:', error);
      return text;
    }
  };

  return (
    <div className="w-full">
      {summary && (
        <motion.div 
          className="flex flex-wrap items-center justify-between mb-6 gap-3"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-wrap items-center gap-3 bg-black/30 p-4 rounded-lg border border-white/10 backdrop-blur-sm shadow-xl">
            <motion.div 
              className={`px-4 py-2 rounded-full bg-gradient-to-r from-${themeColor}-900/70 to-${themeColor}-700/50 text-${themeColor}-300 text-sm font-medium flex items-center shadow-lg`}
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <span className="text-white/90">{metadata?.model || 'AI'} Summary</span>
            </motion.div>
            
            {metadata?.wordCount && (
              <motion.div 
                className="px-3 py-2 rounded-md bg-white/5 text-white/80 text-sm flex items-center border border-white/5 shadow-lg hover:bg-white/10 transition-all"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <div className="p-1.5 rounded-full bg-blue-500/20 text-blue-400 mr-2">
                  <HiOutlineBookOpen className="h-4 w-4" />
                </div>
                <span className="font-medium">Words:</span>
                <span className="ml-1.5">{metadata.wordCount.toLocaleString()}</span>
              </motion.div>
            )}
            
            {metadata?.processingTime && (
              <motion.div 
                className="px-3 py-2 rounded-md bg-white/5 text-white/80 text-sm flex items-center border border-white/5 shadow-lg hover:bg-white/10 transition-all"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <div className="p-1.5 rounded-full bg-green-500/20 text-green-400 mr-2">
                  <HiOutlineClock className="h-4 w-4" />
                </div>
                <span className="font-medium">Time:</span>
                <span className="ml-1.5">{metadata.processingTime.toFixed(1)}s</span>
              </motion.div>
            )}
            
            {metadata?.language && (
              <motion.div 
                className="px-3 py-2 rounded-md bg-white/5 text-white/80 text-sm flex items-center border border-white/5 shadow-lg hover:bg-white/10 transition-all"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <div className="p-1.5 rounded-full bg-purple-500/20 text-purple-400 mr-2">
                  <HiOutlineTranslate className="h-4 w-4" />
                </div>
                <span className="font-medium">Language:</span>
                <span className="ml-1.5 flex items-center">
                  <span>{getLanguageName(metadata.language)}</span>
                  <motion.span 
                    className={`inline-block w-2 h-2 rounded-full bg-${themeColor}-400 ml-2`}
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  ></motion.span>
                </span>
              </motion.div>
            )}
          </div>
          
          <div className="flex space-x-3">
            {!isEditing ? (
              <>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`p-2.5 rounded-full bg-${themeColor}-600/30 text-${themeColor}-300 hover:bg-${themeColor}-600/50 shadow-lg shadow-${themeColor}-900/20 backdrop-blur-sm border border-${themeColor}-500/20`}
                  onClick={handleEdit}
                  title="Edit summary"
                >
                  <HiPencil className="w-4 h-4" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`p-2.5 rounded-full bg-blue-600/30 text-blue-300 hover:bg-blue-600/50 shadow-lg shadow-blue-900/20 backdrop-blur-sm border border-blue-500/20`}
                  onClick={handleCopy}
                  title="Copy to clipboard"
                >
                  <HiClipboard className="w-4 h-4" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`p-2.5 rounded-full bg-green-600/30 text-green-300 hover:bg-green-600/50 shadow-lg shadow-green-900/20 backdrop-blur-sm border border-green-500/20`}
                  onClick={handleDownload}
                  title="Download as markdown"
                >
                  <HiDownload className="w-4 h-4" />
                </motion.button>
                <div className="relative">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`p-2.5 rounded-full bg-yellow-600/30 text-yellow-300 hover:bg-yellow-600/50 shadow-lg shadow-yellow-900/20 backdrop-blur-sm border border-yellow-500/20`}
                    onClick={handleHighlight}
                    title="Highlight selected text"
                  >
                    <HiOutlineFilter className="w-4 h-4" />
                  </motion.button>
                  {showColorPicker && (
                    <div className={`absolute top-full right-0 mt-2 p-3 bg-black/80 backdrop-blur-sm rounded-lg shadow-xl z-50 border border-${themeColor}-500/30 min-w-[200px]`}>
                      <div className="text-xs text-white/90 mb-2 font-medium">Select Highlight Color</div>
                      <div className="flex space-x-3 justify-center">
                        {highlightColors.map(color => (
                          <button
                            key={color.name}
                            className={`w-8 h-8 rounded-full transition-transform ${currentHighlightColor === color.name ? `ring-2 ring-${themeColor}-400 scale-110` : 'hover:scale-105'}`}
                            style={{ backgroundColor: color.color }}
                            onClick={() => setCurrentHighlightColor(color.name)}
                            title={color.name.charAt(0).toUpperCase() + color.name.slice(1)}
                          />
                        ))}
                      </div>
                      <div className="mt-3 flex justify-between">
                        <button 
                          className="text-xs text-white/70 hover:text-white"
                          onClick={() => setShowColorPicker(false)}
                        >
                          Close
                        </button>
                        <button 
                          className={`text-xs text-${themeColor}-400 hover:text-${themeColor}-300 font-medium`}
                          onClick={applyHighlight}
                        >
                          Apply to Selection
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                {highlights.length > 0 && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`p-2.5 rounded-full bg-red-600/30 text-red-300 hover:bg-red-600/50 shadow-lg shadow-red-900/20 backdrop-blur-sm border border-red-500/20`}
                    onClick={clearHighlights}
                    title="Clear all highlights"
                  >
                    <HiOutlineX className="w-4 h-4" />
                  </motion.button>
                )}
              </>
            ) : (
              <>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`p-2.5 rounded-full bg-green-600/30 text-green-300 hover:bg-green-600/50 shadow-lg shadow-green-900/20 backdrop-blur-sm border border-green-500/20`}
                  onClick={handleSave}
                  title="Save changes"
                >
                  <HiSave className="w-4 h-4" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`p-2.5 rounded-full bg-red-600/30 text-red-300 hover:bg-red-600/50 shadow-lg shadow-red-900/20 backdrop-blur-sm border border-red-500/20`}
                  onClick={handleCancel}
                  title="Cancel editing"
                >
                  <HiOutlineX className="w-4 h-4" />
                </motion.button>
              </>
            )}
          </div>
        </motion.div>
      )}
      
      <motion.div 
        className={`w-full rounded-xl shadow-xl ${isEditing ? 'bg-gray-900/40 border-2 border-dashed border-gray-600 p-6' : 'book-container'}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2, type: "spring", stiffness: 100 }}
        whileHover={{ boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)" }}
      >
        {isEditing ? (
          <textarea
            ref={textAreaRef}
            value={editedSummary}
            onChange={(e) => setEditedSummary(e.target.value)}
            className="w-full h-[600px] bg-transparent text-white focus:outline-none resize-none font-medium leading-relaxed p-4 rounded-lg"
            style={{ caretColor: `var(--color-${themeColor}-500)` }}
          />
        ) : (
          <motion.div 
            className="prose prose-invert max-w-none h-[600px] overflow-y-auto custom-scrollbar book-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            {summary ? (
              <motion.div 
                className="markdown-content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                dangerouslySetInnerHTML={{ 
                  __html: `<div class="markdown-body" lang="${metadata?.language || 'en'}" style="font-family: ${getLanguageFont(metadata?.language || 'en')}; direction: ${metadata?.language === 'ar' ? 'rtl' : 'ltr'};">
                    <style>
                      .markdown-body[lang="hi"] { font-family: 'Noto Sans Devanagari', sans-serif; }
                      .markdown-body ul { list-style-type: disc; padding-left: 2em; margin: 1em 0; }
                      .markdown-body ul li { margin-bottom: 0.5em; }
                      .book-container {
                        position: relative;
                        padding: 2.5rem 3rem;
                        background: linear-gradient(to right, rgba(0,0,0,0.4) 0%, rgba(30,30,30,0.2) 5%, rgba(30,30,30,0.2) 95%, rgba(0,0,0,0.4) 100%);
                        border: none;
                        box-shadow: 0 1px 1px rgba(0,0,0,0.1), 0 10px 30px rgba(0,0,0,0.5);
                      }
                      .book-container::before {
                        content: '';
                        position: absolute;
                        left: 0;
                        top: 0;
                        bottom: 0;
                        width: 4px;
                        background: linear-gradient(to bottom, rgba(var(--color-${themeColor}-500), 0.3), rgba(var(--color-${themeColor}-700), 0.1));
                        box-shadow: 1px 0 3px rgba(0,0,0,0.2);
                        z-index: 1;
                        border-radius: 2px 0 0 2px;
                      }
                      .book-container::after {
                        content: '';
                        position: absolute;
                        right: 0;
                        top: 0;
                        bottom: 0;
                        width: 1px;
                        background: rgba(255,255,255,0.05);
                        box-shadow: -1px 0 2px rgba(0,0,0,0.1);
                        z-index: 1;
                      }
                      .book-content {
                        position: relative;
                        z-index: 2;
                        column-gap: 2.5rem;
                        column-rule: 1px solid rgba(255,255,255,0.05);
                        padding: 0.5rem;
                        background: linear-gradient(to bottom, rgba(0,0,0,0.05), transparent 10%, transparent 90%, rgba(0,0,0,0.05));
                        border-radius: 8px;
                        animation: contentFadeIn 1s ease-out forwards;
                      }
                      @keyframes contentFadeIn {
                        0% { opacity: 0; }
                        50% { opacity: 0.5; }
                        100% { opacity: 1; }
                      }
                      @media (min-width: 1024px) {
                        .book-content {
                          column-count: 1;
                        }
                      }
                      @media (min-width: 1280px) {
                        .book-content {
                          column-count: 1;
                        }
                      }
                      @media (min-width: 1536px) {
                        .book-content {
                          column-count: 2;
                        }
                      }
                      .markdown-body { 
                        font-size: 1rem;
                        line-height: 1.8;
                        color: rgba(255,255,255,0.85);
                      }
                      .markdown-body h1 { 
                        font-family: 'Inter', sans-serif;
                        font-size: 2rem; 
                        margin-top: 1.5rem; 
                        margin-bottom: 1.5rem; 
                        font-weight: 700; 
                        color: white; 
                        border-bottom: 1px solid rgba(255,255,255,0.1); 
                        padding-bottom: 0.75rem; 
                        text-align: center;
                      }
                      .markdown-body h2 { 
                        font-family: 'Inter', sans-serif;
                        font-size: 1.5rem; 
                        margin-top: 2rem; 
                        margin-bottom: 1rem; 
                        font-weight: 600; 
                        color: rgba(255,255,255,0.95);
                        border-bottom: 1px dotted rgba(255,255,255,0.1);
                        padding-bottom: 0.5rem;
                      }
                      .markdown-body h3 { 
                        font-family: 'Inter', sans-serif;
                        font-size: 1.25rem; 
                        margin-top: 1.75rem; 
                        margin-bottom: 0.75rem; 
                        font-weight: 600; 
                        color: rgba(255,255,255,0.9); 
                      }
                      .markdown-body p { 
                        margin-bottom: 1.5rem; 
                        line-height: 1.9; 
                        color: rgba(255,255,255,0.85); 
                        font-size: 1.05rem; 
                        text-align: ${metadata?.language === 'ar' ? 'right' : metadata?.language === 'hi' ? 'left' : 'justify'};
                      }
                      .markdown-body p:first-of-type::first-letter {
                        ${metadata?.language && !['ar', 'hi', 'zh', 'ja'].includes(metadata.language || '') ? `
                          font-size: 3.5rem;
                          font-weight: 700;
                          float: left;
                          line-height: 1;
                          padding-right: 0.5rem;
                          color: ${themeColor};` : ''}
                      }
                      .markdown-body ul, .markdown-body ol { 
                        margin-bottom: 1.5rem; 
                        padding-left: 2rem; 
                      }
                      .markdown-body li { 
                        margin-bottom: 0.75rem; 
                        color: rgba(255,255,255,0.8); 
                        line-height: 1.7; 
                      }
                      .markdown-body blockquote { 
                        border-left: 4px solid rgb(var(--color-${themeColor}-500)); 
                        padding: 1rem 1.5rem; 
                        margin: 2rem 0; 
                        color: rgba(255,255,255,0.8); 
                        background: rgba(var(--color-${themeColor}-900), 0.2); 
                        border-radius: 0 0.5rem 0.5rem 0; 
                        font-style: italic;
                        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                      }
                      .markdown-body blockquote p {
                        margin-bottom: 0.5rem;
                      }
                      .markdown-body blockquote p:last-child {
                        margin-bottom: 0;
                      }
                      .markdown-body code { 
                        background: rgba(255,255,255,0.1); 
                        padding: 0.2rem 0.4rem; 
                        border-radius: 3px; 
                        font-size: 0.9em; 
                        font-family: 'Fira Code', monospace; 
                      }
                      .markdown-body pre { 
                        background: rgba(0,0,0,0.3); 
                        padding: 1.2rem; 
                        border-radius: 0.5rem; 
                        overflow-x: auto; 
                        margin: 1.5rem 0; 
                        border: 1px solid rgba(255,255,255,0.1); 
                      }
                      .markdown-body a { 
                        color: rgb(var(--color-${themeColor}-300)); 
                        text-decoration: underline; 
                        transition: all 0.2s ease; 
                      }
                      .markdown-body a:hover { 
                        color: white; 
                        text-shadow: 0 0 8px rgba(var(--color-${themeColor}-300), 0.5);
                      }
                      .markdown-body hr { 
                        border: none; 
                        height: 1px; 
                        background-color: rgba(255,255,255,0.2); 
                        margin: 2.5rem 0; 
                        position: relative;
                      }
                      .markdown-body hr::after {
                        content: '§';
                        position: absolute;
                        left: 50%;
                        top: 50%;
                        transform: translate(-50%, -50%);
                        background: rgba(30,30,30,0.8);
                        padding: 0 1rem;
                        color: rgb(var(--color-${themeColor}-400));
                        font-size: 1.2rem;
                        text-shadow: 0 0 5px rgba(var(--color-${themeColor}-500), 0.5);
                      }
                      .markdown-body table { 
                        border-collapse: collapse; 
                        width: 100%; 
                        margin: 1.5rem 0; 
                        border-radius: 0.5rem; 
                        overflow: hidden; 
                      }
                      .markdown-body th, .markdown-body td { 
                        border: 1px solid rgba(255,255,255,0.2); 
                        padding: 0.75rem 1rem; 
                      }
                      .markdown-body th { 
                        background: rgba(255,255,255,0.1); 
                        font-weight: 600; 
                        text-align: left; 
                      }
                      .markdown-body tr:nth-child(even) { 
                        background: rgba(255,255,255,0.03); 
                      }
                      .markdown-body strong { 
                        color: white; 
                        font-weight: 700; 
                      }
                      .markdown-body em { 
                        color: rgba(255,255,255,0.9); 
                        font-style: italic; 
                      }
                    </style>
                    ${highlightText(editedSummary)}
                  </div>` 
                }} 
              />
            ) : (
              <motion.div 
                className="text-gray-400 italic p-8 text-center flex flex-col items-center justify-center space-y-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <HiOutlineBookOpen className="w-16 h-16 text-gray-500 mb-2" />
                <p>No summary available yet. Upload a document to generate a summary.</p>
                <div className="text-sm text-gray-500">Supported formats: PDF, Images, and Text</div>
              </motion.div>
            )}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
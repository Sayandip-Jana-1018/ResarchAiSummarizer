import React from 'react';
import { HiDocumentText, HiPhotograph, HiX, HiDownload, HiEye } from 'react-icons/hi';
import { motion } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';

interface FilePreviewProps {
  file: File | null;
  fileType: 'pdf' | 'image' | 'document' | null;
  previewUrl: string | null;
  onReset: () => void;
}

export default function FilePreview({ file, fileType, previewUrl, onReset }: FilePreviewProps) {
  const { themeColor } = useTheme();
  
  if (!file) return null;
  
  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white text-lg font-semibold">File Preview</h3>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onReset}
          className="p-2 rounded-full bg-red-600/20 text-red-400 hover:bg-red-600/30"
          title="Remove file"
        >
          <HiX className="w-4 h-4" />
        </motion.button>
      </div>
      
      <div className={`w-full rounded-xl overflow-hidden bg-gray-900/30 backdrop-blur-sm border border-gray-700`}>
        {/* File Preview Area */}
        <div className="w-full h-64 relative">
          {fileType === 'pdf' && previewUrl ? (
            <div className="w-full h-full flex items-center justify-center bg-gray-800/50">
              <iframe 
                src={previewUrl} 
                className="w-full h-full" 
                title="PDF Preview"
              />
            </div>
          ) : fileType === 'image' && previewUrl ? (
            <div className="w-full h-full flex items-center justify-center bg-gray-800/50">
              <img 
                src={previewUrl} 
                alt="Preview" 
                className="max-w-full max-h-full object-contain"
              />
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-800/50">
              {fileType === 'pdf' ? (
                <HiDocumentText className={`w-16 h-16 text-${themeColor}-500 mb-2`} />
              ) : fileType === 'image' ? (
                <HiPhotograph className={`w-16 h-16 text-${themeColor}-500 mb-2`} />
              ) : (
                <HiDocumentText className={`w-16 h-16 text-${themeColor}-500 mb-2`} />
              )}
              <p className="text-white text-center">
                {fileType === 'document' ? 'Document preview not available' : 'Preview not available'}
              </p>
              {fileType === 'pdf' && (
                <a 
                  href={previewUrl || '#'} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`mt-3 px-4 py-2 rounded-md bg-${themeColor}-600/30 text-${themeColor}-400 flex items-center`}
                >
                  <HiEye className="mr-2" />
                  Open PDF
                </a>
              )}
            </div>
          )}
        </div>
        
        {/* File Info */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex flex-wrap items-center justify-between">
            <div>
              <h4 className="text-white font-medium truncate max-w-xs">{file.name}</h4>
              <p className="text-gray-400 text-sm">
                {formatFileSize(file.size)} • {fileType?.toUpperCase()}
              </p>
            </div>
            
            {previewUrl && (
              <a 
                href={previewUrl} 
                download={file.name}
                className={`px-3 py-1.5 rounded-md bg-${themeColor}-600/30 text-${themeColor}-400 flex items-center text-sm`}
              >
                <HiDownload className="mr-1" />
                Download
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

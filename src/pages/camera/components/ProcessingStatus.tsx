import React from 'react';
import { HiChartBar, HiDocumentText, HiAdjustments, HiPhotograph } from 'react-icons/hi';
import GlassCard from '@/components/ui/GlassCard';

interface ProcessingStatusProps {
  isProcessing: boolean;
  processingProgress: number;
  hasAnalysisResult: boolean;
  themeColor: string;
}

const ProcessingStatus: React.FC<ProcessingStatusProps> = ({
  isProcessing,
  processingProgress,
  hasAnalysisResult,
  themeColor
}) => {
  return (
    <GlassCard className="p-4 flex-grow">
      <div className="flex items-center mb-3">
        <div 
          className="w-9 h-9 rounded-lg flex items-center justify-center mr-3"
          style={{ backgroundColor: `${themeColor}33` }}
        >
          <HiChartBar className="w-5 h-5 text-white" />
        </div>
        <h3 className="text-lg font-medium text-white">Processing Status</h3>
      </div>
      
      <div className="space-y-3">
        <div className="bg-white/10 rounded-lg p-3">
          <h4 className="text-white text-base font-medium mb-2">Document Type</h4>
          <div className="flex items-center">
            <div 
              className="w-9 h-9 rounded-full flex items-center justify-center mr-3"
              style={{ 
                background: hasAnalysisResult 
                  ? `conic-gradient(${themeColor} 100%, ${themeColor}33 0%)` 
                  : `conic-gradient(${themeColor}33 100%, ${themeColor}33 0%)`
              }}
            >
              <div className="w-6 h-6 rounded-full bg-black/40 flex items-center justify-center">
                <HiDocumentText className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="text-white/70 text-sm">
              {hasAnalysisResult ? "Research paper" : "Waiting for capture..."}
            </p>
          </div>
        </div>
        
        <div className="bg-white/10 rounded-lg p-3">
          <h4 className="text-white text-base font-medium mb-2">Text Quality</h4>
          <div className="flex items-center">
            <div 
              className="w-9 h-9 rounded-full flex items-center justify-center mr-3"
              style={{ 
                background: hasAnalysisResult 
                  ? `conic-gradient(${themeColor} ${85}%, ${themeColor}33 0%)` 
                  : `conic-gradient(${themeColor}33 100%, ${themeColor}33 0%)`
              }}
            >
              <div className="w-6 h-6 rounded-full bg-black/40 flex items-center justify-center">
                <HiAdjustments className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="flex-grow">
              <div className="w-full bg-white/10 rounded-full h-2.5">
                <div 
                  className="h-2.5 rounded-full transition-all duration-300"
                  style={{ 
                    width: hasAnalysisResult ? '85%' : '0%',
                    background: `linear-gradient(90deg, ${themeColor}aa 0%, ${themeColor} 100%)`
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white/10 rounded-lg p-3">
          <h4 className="text-white text-base font-medium mb-2">Image Processing</h4>
          <div className="flex items-center">
            <div 
              className="w-9 h-9 rounded-full flex items-center justify-center mr-3"
              style={{ 
                background: isProcessing 
                  ? `conic-gradient(${themeColor} ${processingProgress}%, ${themeColor}33 0%)` 
                  : hasAnalysisResult 
                    ? `conic-gradient(${themeColor} 100%, ${themeColor}33 0%)` 
                    : `conic-gradient(${themeColor}33 100%, ${themeColor}33 0%)`
              }}
            >
              <div className="w-6 h-6 rounded-full bg-black/40 flex items-center justify-center">
                <HiPhotograph className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="flex-grow">
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map((step) => (
                  <div 
                    key={step}
                    className={`h-2 flex-1 rounded-full ${
                      isProcessing && step <= Math.ceil(processingProgress/20) 
                        ? 'bg-green-400' 
                        : hasAnalysisResult && step <= 5
                          ? 'bg-green-400'
                          : 'bg-white/20'
                    }`}
                  ></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
};

export default ProcessingStatus;

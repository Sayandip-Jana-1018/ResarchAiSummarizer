import React from 'react';
import { HiDocumentText, HiCamera, HiClipboardCopy, HiDownload } from 'react-icons/hi';
import GlassCard from '@/components/ui/GlassCard';
import { AnalysisResult } from '../types';

interface AnalysisResultsProps {
  analysisResult: AnalysisResult | null;
  isProcessing: boolean;
  capturedImage: string | null;
  themeColor: string;
  onCopyText: () => void;
  onSaveAnalysis: () => void;
}

const AnalysisResults: React.FC<AnalysisResultsProps> = ({
  analysisResult,
  isProcessing,
  capturedImage,
  themeColor,
  onCopyText,
  onSaveAnalysis
}) => {
  return (
    <GlassCard className="flex flex-col flex-grow">
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div 
              className="w-9 h-9 rounded-lg flex items-center justify-center mr-3"
              style={{ backgroundColor: `${themeColor}33` }}
            >
              <HiDocumentText className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-medium text-white">Analysis Results</h3>
          </div>
          
          {analysisResult && (
            <div className="flex space-x-2">
              <button
                onClick={onCopyText}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
                title="Copy Text"
              >
                <HiClipboardCopy className="w-5 h-5" />
              </button>
              <button
                onClick={onSaveAnalysis}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
                title="Save Analysis"
              >
                <HiDownload className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className="p-4 flex-grow overflow-y-auto max-h-[500px]">
        {analysisResult ? (
          <div className="prose prose-invert prose-sm max-w-none">
            <h2 className="text-xl font-semibold mb-4">Summary</h2>
            <div className="mb-6">
              {analysisResult.analysis.summary.split('\n').map((paragraph, idx) => (
                <p key={idx} className="mb-3 text-white/90 leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
            
            <h3 className="text-lg font-semibold mb-3">Key Points</h3>
            <ul className="mb-6 space-y-2">
              {analysisResult.analysis.key_points.map((point, idx) => (
                <li key={idx} className="text-white/80">
                  {point}
                </li>
              ))}
            </ul>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <h3 className="text-lg font-semibold mb-3">Topics</h3>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.analysis.topics.map((topic, idx) => (
                    <span 
                      key={idx}
                      className="px-3 py-1 rounded-full text-sm"
                      style={{ backgroundColor: `${themeColor}33` }}
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-3">Entities</h3>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.analysis.entities.map((entity, idx) => (
                    <span 
                      key={idx}
                      className="px-3 py-1 rounded-full bg-white/10 text-sm"
                    >
                      {entity}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-3 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center mb-2">
                <span className="text-white/60 text-sm">Sentiment:</span>
                <span 
                  className="ml-2 px-2 py-0.5 rounded text-xs"
                  style={{ 
                    backgroundColor: 
                      analysisResult.analysis.sentiment === 'positive' ? 'rgba(16, 185, 129, 0.2)' :
                      analysisResult.analysis.sentiment === 'negative' ? 'rgba(239, 68, 68, 0.2)' :
                      'rgba(107, 114, 128, 0.2)'
                  }}
                >
                  {analysisResult.analysis.sentiment}
                </span>
              </div>
              <div className="flex items-center">
                <span className="text-white/60 text-sm">Word count:</span>
                <span className="ml-2 text-white/90">{analysisResult.word_count}</span>
              </div>
            </div>
          </div>
        ) : isProcessing ? (
          <div className="h-full flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mb-3"></div>
            <p className="text-white/70 text-base">Analyzing document...</p>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div 
              className="w-14 h-14 rounded-full flex items-center justify-center mb-3 opacity-40"
              style={{ backgroundColor: `${themeColor}33` }}
            >
              <HiCamera className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-lg font-medium text-white/80 mb-2">No Analysis Yet</h3>
            <p className="text-white/50 text-base px-4">
              {capturedImage 
                ? "Click 'Analyze' to process the captured image" 
                : "Capture a document to begin analysis"}
            </p>
          </div>
        )}
      </div>
    </GlassCard>
  );
};

export default AnalysisResults;

import { useState, useRef, useEffect } from 'react';
import { HiCamera, HiX, HiRefresh } from 'react-icons/hi';
import GlassCard from '@/components/ui/GlassCard';

interface CameraFeedProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  stream: MediaStream | null;
  isCameraActive: boolean;
  capturedImage: string | null;
  isProcessing: boolean;
  themeColor: string;
  onCaptureImage: () => void;
  onResetCamera: () => void;
  onToggleCamera: () => void;
  onAnalyze: () => void;
}

const CameraFeed: React.FC<CameraFeedProps> = ({
  videoRef,
  canvasRef,
  stream,
  isCameraActive,
  capturedImage,
  isProcessing,
  themeColor,
  onCaptureImage,
  onResetCamera,
  onToggleCamera,
  onAnalyze
}) => {
  return (
    <GlassCard className="overflow-hidden flex-grow relative h-full">
      {/* Video or Captured Image */}
      <div className="h-full w-full relative">
        {!capturedImage ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${!isCameraActive ? 'opacity-50' : ''}`}
              style={{ height: '100%', width: '100%' }}
            />
            {/* Camera Toggle Button */}
            <button
              onClick={onToggleCamera}
              className="absolute top-4 right-4 p-3 rounded-full transition-all z-10"
              style={{ 
                background: isCameraActive 
                  ? `linear-gradient(135deg, ${themeColor}aa 0%, ${themeColor} 100%)` 
                  : 'rgba(255, 59, 59, 0.8)',
                boxShadow: `0 4px 12px ${isCameraActive ? themeColor+'66' : 'rgba(255, 59, 59, 0.4)'}`
              }}
              title={isCameraActive ? "Turn Camera Off" : "Turn Camera On"}
            >
              {isCameraActive ? (
                <HiCamera className="w-5 h-5 text-white" />
              ) : (
                <HiX className="w-5 h-5 text-white" />
              )}
            </button>
            {/* Camera Status Overlay */}
            {!isCameraActive && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-black/70 px-6 py-4 rounded-lg text-white">
                  <p className="text-lg font-medium">Camera is turned off</p>
                  <p className="text-sm opacity-70">Click the button in the corner to turn it back on</p>
                </div>
              </div>
            )}
          </>
        ) : (
          <img
            src={capturedImage}
            alt="Captured"
            className="w-full h-full object-cover"
            style={{ height: '100%', width: '100%' }}
          />
        )}
        
        {/* Canvas for capturing (hidden) */}
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Capture Button Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-5 flex items-center justify-center bg-gradient-to-t from-black/60 to-transparent">
          {!capturedImage ? (
            <button
              onClick={onCaptureImage}
              className="px-7 py-3 rounded-lg text-white font-medium transition-all flex items-center"
              style={{ 
                background: `linear-gradient(135deg, ${themeColor}aa 0%, ${themeColor} 100%)`,
                boxShadow: `0 4px 20px ${themeColor}66`
              }}
              disabled={!stream}
            >
              <HiCamera className="w-6 h-6 mr-2" />
              Capture Document
            </button>
          ) : (
            <div className="flex space-x-4">
              <button
                onClick={onResetCamera}
                className="px-5 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all flex items-center"
              >
                <HiRefresh className="w-5 h-5 mr-2" />
                Retake
              </button>
              <button
                onClick={onAnalyze}
                className="px-7 py-2.5 rounded-lg text-white font-medium transition-all flex items-center"
                style={{ 
                  background: `linear-gradient(135deg, ${themeColor}aa 0%, ${themeColor} 100%)`,
                  boxShadow: `0 4px 20px ${themeColor}66`
                }}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <HiCamera className="w-5 h-5 mr-2" />
                    Analyze
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
};

export default CameraFeed;

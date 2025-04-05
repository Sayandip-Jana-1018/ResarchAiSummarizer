import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useToast } from '@/components/ui/use-toast';
import GlassCard from '@/components/ui/GlassCard';

// Icons
import { 
  HiCamera, 
  HiCog, 
  HiRefresh, 
  HiPhotograph, 
  HiDocumentText, 
  HiLightBulb, 
  HiAdjustments, 
  HiInformationCircle, 
  HiChartBar,
  HiX,
  HiPlay,
  HiPause,
  HiClipboardCopy,
  HiDownload
} from 'react-icons/hi';
import CameraSettings from './components/CameraSettings';
import AnalysisResults from './components/AnalysisResults';
import CameraFeed from './components/CameraFeed';
import CameraTips from './components/CameraTips';
import ProcessingStatus from './components/ProcessingStatus';
import RecentCaptures from './components/RecentCaptures';

// Define types inline
interface AnalysisResult {
  status: string;
  text: string;
  analysis: {
    summary: string | string[];
    key_points: string[];
    entities: string[];
    sentiment: string;
    topics: string[];
  };
  word_count: number;
}

export default function CameraPage() {
  // Router and context hooks
  const router = useRouter();
  const { user } = useAuth();
  const { themeColor } = useTheme();
  const { toast } = useToast();
  
  // State variables
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(true);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showTips, setShowTips] = useState(true);
  
  // Stats tracking
  const [processingStats, setProcessingStats] = useState<{
    processingTime: number;
    modelUsed: string;
    wordCount: number;
    characterCount: number;
    captureCount: number;
  }>({
    processingTime: 0,
    modelUsed: '',
    wordCount: 0,
    characterCount: 0,
    captureCount: 0
  });
  
  // Real-time analysis state
  const [isRealTimeMode, setIsRealTimeMode] = useState(false);
  const [realTimeInterval, setRealTimeInterval] = useState<NodeJS.Timeout | null>(null);
  const [realTimeDelay, setRealTimeDelay] = useState(2000); // 2 seconds between captures
  
  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  
  // Analysis results state
  const [extractedText, setExtractedText] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('gemini');
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Backend API URL
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // Get available camera devices
  useEffect(() => {
    const getDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        setDevices(videoDevices);
        
        // Select the first device by default
        if (videoDevices.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(videoDevices[0].deviceId);
        }
      } catch (error) {
        console.error('Error getting media devices:', error);
        toast({
          title: "Camera Error",
          description: "Could not access camera devices. Please check permissions.",
          variant: "destructive"
        });
      }
    };
    
    getDevices();
    
    // Initialize stats
    setProcessingStats({
      processingTime: 0,
      modelUsed: selectedModel,
      wordCount: 0,
      characterCount: 0,
      captureCount: 0
    });
    
    // Clean up real-time mode on unmount
    return () => {
      if (realTimeInterval) {
        clearInterval(realTimeInterval);
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [user]);

  // Initialize camera when device is selected
  useEffect(() => {
    if (selectedDeviceId) {
      initializeCamera();
    }
  }, [selectedDeviceId]);

  // Update processing stats when a new analysis is completed
  const updateProcessingStats = (text: string, processingTime?: number, model?: string) => {
    setProcessingStats(prev => ({
      ...prev,
      processingTime: processingTime || prev.processingTime,
      modelUsed: model || selectedModel,
      wordCount: text ? text.split(/\s+/).filter(word => word.length > 0).length : prev.wordCount,
      characterCount: text ? text.length : prev.characterCount,
      captureCount: prev.captureCount + 1
    }));
  };

  // Initialize camera with selected device
  const initializeCamera = async () => {
    try {
      // Stop any existing stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      // Get new stream with selected device
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: selectedDeviceId,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      setStream(newStream);
      
      // Set video source
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      
      // Reset states
      setCapturedImage(null);
      setExtractedText('');
      setAnalysisResult(null);
      setIsCameraActive(true);
      
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Camera Error",
        description: "Could not access the camera. Please check permissions.",
        variant: "destructive"
      });
    }
  };

  // Toggle settings panel
  const toggleSettings = () => {
    setShowSettings(!showSettings);
  };

  // Toggle tips visibility
  const toggleTips = () => {
    setShowTips(!showTips);
  };

  // Toggle camera on/off
  const toggleCamera = () => {
    if (isCameraActive) {
      // Turn off camera
      if (stream) {
        stream.getTracks().forEach(track => {
          track.enabled = false;
          track.stop();
        });
        setStream(null);
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setIsCameraActive(false);
      
      toast({
        title: "Camera turned off",
        description: "Your camera has been turned off for privacy.",
        variant: "default"
      });
    } else {
      // Turn on camera
      initializeCamera();
      
      toast({
        title: "Camera turned on",
        description: "Your camera is now active.",
        variant: "default"
      });
    }
  };

  // Capture image from video feed
  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isCameraActive) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Get image data URL
    const imageDataURL = canvas.toDataURL('image/jpeg');
    setCapturedImage(imageDataURL);
    
    // Process the captured image if not in real-time mode
    if (!isRealTimeMode) {
      processImage(imageDataURL);
    }
  }, [videoRef, canvasRef, isCameraActive, isRealTimeMode]);

  // Process captured image for text extraction and analysis
  const processImage = async (imageData: string) => {
    if (!imageData) return;
    
    setIsProcessing(true);
    setProcessingProgress(10);
    
    try {
      // Start processing timer
      const startTime = performance.now();
      
      // Make API request to extract text and analyze
      setProcessingProgress(30);
      const response = await fetch(`${API_URL}/api/realtime/real-time-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageData,
          model: selectedModel,
          options: {
            length: 'medium',
            style: 'academic',
            focus: 'comprehensive',
            language: 'en'
          }
        })
      });
      
      setProcessingProgress(70);
      
      if (!response.ok) {
        throw new Error(`Error processing image: ${response.statusText}`);
      }
      
      const result = await response.json();
      setProcessingProgress(90);
      
      if (result.status === 'error') {
        throw new Error(result.message || 'Error processing image');
      }
      
      // Calculate processing time
      const endTime = performance.now();
      const processingTime = (endTime - startTime) / 1000; // Convert to seconds
      
      // Update state with results
      setExtractedText(result.text || '');
      setAnalysisResult(result);
      setProcessingProgress(100);
      
      // Update stats with the actual data
      updateProcessingStats(
        result.text || '',
        processingTime,
        selectedModel
      );
      
      // Show success notification
      toast({
        title: "Analysis Complete",
        description: `Processed ${result.word_count || 0} words using ${selectedModel}`,
        variant: "default"
      });
      
      // Complete processing
      setTimeout(() => {
        setIsProcessing(false);
        setProcessingProgress(0);
      }, 500);
      
    } catch (error) {
      console.error('Error processing image:', error);
      toast({
        title: "Processing Error",
        description: error instanceof Error ? error.message : 'Failed to process image',
        variant: "destructive"
      });
      setIsProcessing(false);
      setProcessingProgress(0);
    }
  };

  // Reset camera and captured image
  const resetCamera = () => {
    setCapturedImage(null);
    setAnalysisResult(null);
    setIsProcessing(false);
    setProcessingProgress(0);
    
    // Re-initialize camera if it's not active
    if (!isCameraActive) {
      setIsCameraActive(true);
      initializeCamera();
    }
  };

  // Toggle real-time analysis mode
  const toggleRealTimeMode = () => {
    if (isRealTimeMode) {
      // Turn off real-time mode
      if (realTimeInterval) {
        clearInterval(realTimeInterval);
        setRealTimeInterval(null);
      }
      setIsRealTimeMode(false);
      toast({
        title: "Real-time Mode Disabled",
        description: "Document analysis will now be performed on demand",
        variant: "default"
      });
    } else {
      // Turn on real-time mode
      if (!stream || !isCameraActive) {
        toast({
          title: "Camera Required",
          description: "Please enable your camera first",
          variant: "destructive"
        });
        return;
      }
      
      // Start real-time capture interval
      const interval = setInterval(() => {
        if (!isProcessing && isCameraActive) {
          captureImage();
        }
      }, realTimeDelay);
      
      setRealTimeInterval(interval);
      setIsRealTimeMode(true);
      
      toast({
        title: "Real-time Mode Enabled",
        description: `Analyzing documents every ${realTimeDelay/1000} seconds`,
        variant: "default"
      });
    }
  };

  // Handle camera device change
  const handleDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDeviceId(e.target.value);
  };
  
  // Handle model selection change
  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedModel(e.target.value);
  };
  
  // Handle real-time delay change
  const handleDelayChange = (delay: number) => {
    setRealTimeDelay(delay);
    
    // Update interval if real-time mode is active
    if (isRealTimeMode && realTimeInterval) {
      clearInterval(realTimeInterval);
      const interval = setInterval(() => {
        if (!isProcessing && isCameraActive) {
          captureImage();
        }
      }, delay);
      setRealTimeInterval(interval);
    }
  };
  
  // Copy extracted text to clipboard
  const copyTextToClipboard = () => {
    if (extractedText) {
      navigator.clipboard.writeText(extractedText);
      toast({
        title: "Text Copied",
        description: "Extracted text copied to clipboard",
        variant: "default"
      });
    }
  };
  
  // Save analysis result to database
  const saveAnalysisToDatabase = async () => {
    if (!analysisResult || !user || !capturedImage) return;
    
    try {
      // Upload image to Supabase storage
      const fileName = `${user.id}/${Date.now()}.jpg`;
      const { data, error } = await supabase.storage
        .from('captures')
        .upload(fileName, dataURLtoBlob(capturedImage), {
          contentType: 'image/jpeg'
        });
      
      if (error) throw error;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('captures')
        .getPublicUrl(fileName);
      
      // Save to database
      const { error: dbError } = await supabase
        .from('summaries')
        .insert({
          user_id: user.id,
          title: `Document Analysis ${new Date().toLocaleString()}`,
          summary: analysisResult.analysis.summary,
          extracted_text: extractedText,
          file_url: publicUrl,
          file_type: 'image',
          model: selectedModel,
          word_count: analysisResult.word_count || 0,
          created_at: new Date().toISOString()
        });
      
      if (dbError) throw dbError;
      
      // Show success notification
      toast({
        title: "Analysis Saved",
        description: "Document analysis saved to your stats",
        variant: "default"
      });
      
      // Initialize stats when component mounts
      if (user) {
        setProcessingStats({
          processingTime: 0,
          modelUsed: selectedModel,
          wordCount: 0,
          characterCount: 0,
          captureCount: 0
        });
      }
      
      // Update the stats with the new analysis
      updateProcessingStats(extractedText, processingStats.processingTime, selectedModel);
      
    } catch (error) {
      console.error('Error saving analysis:', error);
      toast({
        title: "Save Error",
        description: "Failed to save analysis",
        variant: "destructive"
      });
    }
  };
  
  // Helper function to convert data URL to Blob
  const dataURLtoBlob = (dataURL: string): Blob => {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new Blob([u8arr], { type: mime });
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen p-4 md:p-8">
        
        {/* Camera Settings Panel - Always visible */}
        <GlassCard className="mb-4 p-0 overflow-hidden">
          <div className="px-4 py-3 flex items-center" style={{ backgroundColor: `${themeColor}70` }}>
            <div className="flex items-center space-x-2">
              <div className="w-1 h-5 rounded-full" style={{ backgroundColor: themeColor }}></div>
              <div className="w-1 h-4 rounded-full" style={{ backgroundColor: `${themeColor}CC` }}></div>
              <div className="w-1 h-3 rounded-full" style={{ backgroundColor: `${themeColor}99` }}></div>
            </div>
            <h3 className="text-base font-medium text-white ml-3">Camera Settings</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-x" style={{ borderColor: `${themeColor}20` }}>
            {/* Camera selection */}
            <div className="p-5">
              <label className="block text-white/90 text-sm mb-3 font-medium">Camera Device</label>
              <div className="relative">
                <select
                  value={selectedDeviceId}
                  onChange={handleDeviceChange}
                  className="w-full appearance-none rounded-lg p-3 text-white focus:outline-none transition-all pr-10"
                  style={{ 
                    WebkitAppearance: 'none',
                    backgroundColor: `${themeColor}90`,
                    borderColor: `${themeColor}60`,
                    borderWidth: '1px',
                    boxShadow: 'inset 0 0 10px rgba(0,0,0,0.9)'
                  }}
                >
                  {devices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Camera ${devices.indexOf(device) + 1}`}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3">
                  <HiChartBar 
                    className="w-4 h-4 rotate-90" 
                    style={{ color: `${themeColor}` }}
                  />
                </div>
              </div>
            </div>
            
            {/* Model selection */}
            <div className="p-5">
              <label className="block text-white/90 text-sm mb-3 font-medium">AI Model</label>
              <div className="relative">
                <select
                  value={selectedModel}
                  onChange={handleModelChange}
                  className="w-full appearance-none rounded-lg p-3 text-white focus:outline-none transition-all pr-10"
                  style={{ 
                    WebkitAppearance: 'none',
                    backgroundColor: `${themeColor}90`,
                    borderColor: `${themeColor}60`,
                    borderWidth: '1px',
                    boxShadow: 'inset 0 0 10px rgba(0,0,0,0.9)'
                  }}
                >
                  <option value="gemini">Google Gemini</option>
                  <option value="openai">OpenAI GPT</option>
                  <option value="claude">Anthropic Claude</option>
                  <option value="mistral">Mistral AI</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3">
                  <HiChartBar 
                    className="w-4 h-4 rotate-90" 
                    style={{ color: `${themeColor}` }}
                  />
                </div>
              </div>
              <p className="text-white/60 text-xs mt-2">Select the AI model for document analysis</p>
            </div>
          </div>
        </GlassCard>
        
        <div className="grid grid-cols-1 h-[650px] lg:grid-cols-12 gap-6">
          {/* Left Column: Stats & Status */}
          <div className="lg:col-span-3 space-y-4 flex flex-col">
            {/* Analysis Stats */}
            <GlassCard className="p-4 flex-grow">
              <div className="flex items-center mb-3">
                <div 
                  className="w-9 h-9 rounded-lg flex items-center justify-center mr-3"
                  style={{ backgroundColor: `${themeColor}33` }}
                >
                  <HiChartBar className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-medium text-white">Analysis Stats</h3>
              </div>
              
              <div className="space-y-3">
                {/* Processing Time */}
                <div className="bg-white/10 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="text-white/80 text-sm">Processing Time</h4>
                    <span className="text-white text-sm font-medium">
                      {processingStats.processingTime > 0 
                        ? `${processingStats.processingTime.toFixed(2)}s` 
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-1.5">
                    <div 
                      className="bg-green-400 h-1.5 rounded-full" 
                      style={{ 
                        width: `${Math.min(processingStats.processingTime * 10, 100)}%`,
                        backgroundColor: themeColor 
                      }}
                    ></div>
                  </div>
                </div>
                
                {/* Model Used */}
                <div className="bg-white/10 rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-white/80 text-sm">Model</h4>
                    <span className="text-white text-sm font-medium capitalize">
                      {processingStats.modelUsed || selectedModel || 'N/A'}
                    </span>
                  </div>
                </div>
                
                {/* Word Count */}
                <div className="bg-white/10 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="text-white/80 text-sm">Word Count</h4>
                    <span className="text-white text-sm font-medium">
                      {processingStats.wordCount > 0 ? processingStats.wordCount : 'N/A'}
                    </span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-1.5">
                    <div 
                      className="bg-green-400 h-1.5 rounded-full" 
                      style={{ 
                        width: `${Math.min(processingStats.wordCount / 5, 100)}%`,
                        backgroundColor: themeColor 
                      }}
                    ></div>
                  </div>
                </div>
                
                {/* Character Count */}
                <div className="bg-white/10 rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-white/80 text-sm">Character Count</h4>
                    <span className="text-white text-sm font-medium">
                      {processingStats.characterCount > 0 ? processingStats.characterCount : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </GlassCard>
            
            {/* Processing Status */}
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
                  <h4 className="text-white text-base font-medium mb-2">Image Processing</h4>
                  <div className="flex items-center">
                    <div 
                      className="w-9 h-9 rounded-full flex items-center justify-center mr-3"
                      style={{ 
                        background: isProcessing 
                          ? `conic-gradient(${themeColor} ${processingProgress}%, ${themeColor}33 0%)` 
                          : analysisResult 
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
                                : analysisResult && step <= 5
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
            
            {/* Camera Tips */}
            {showTips && (
              <GlassCard className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <div 
                      className="w-9 h-9 rounded-lg flex items-center justify-center mr-3"
                      style={{ backgroundColor: `${themeColor}33` }}
                    >
                      <HiLightBulb className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg font-medium text-white">Camera Tips</h3>
                  </div>
                  <button 
                    onClick={toggleTips}
                    className="text-white/50 hover:text-white transition-colors"
                  >
                    <HiX className="w-5 h-5" />
                  </button>
                </div>
                
                <ul className="space-y-1.5 text-white/70 text-sm">
                  <li className="flex items-start">
                    <span className="text-green-400 mr-2">•</span>
                    Hold camera steady for clarity
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-400 mr-2">•</span>
                    Ensure good lighting
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-400 mr-2">•</span>
                    Position document to fill frame
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-400 mr-2">•</span>
                    Avoid shadows and glare
                  </li>
                </ul>
              </GlassCard>
            )}
          </div>
          
          {/* Middle Column: Camera Feed */}
          <div className="lg:col-span-6 flex flex-col h-full">
            <GlassCard className="overflow-hidden flex-grow relative h-full">
              {/* Video or Captured Image */}
              <div className="h-[700px] w-full relative">
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
                      onClick={toggleCamera}
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
                      onClick={captureImage}
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
                        onClick={resetCamera}
                        className="px-5 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all flex items-center"
                      >
                        <HiRefresh className="w-5 h-5 mr-2" />
                        Retake
                      </button>
                      <button
                        onClick={() => processImage(capturedImage!)}
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
          </div>
          
          {/* Right Column: Analysis Results */}
          <div className="lg:col-span-3 flex flex-col space-y-4">
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
                    <h3 className="text-lg font-medium text-white">Summary</h3>
                  </div>
                  
                  {analysisResult && (
                    <div className="flex space-x-2">
                      <button
                        onClick={copyTextToClipboard}
                        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
                        title="Copy Text"
                      >
                        <HiClipboardCopy className="w-5 h-5" />
                      </button>
                      <button
                        onClick={saveAnalysisToDatabase}
                        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
                        title="Save Analysis"
                      >
                        <HiDownload className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="p-4 flex-grow overflow-y-auto max-h-[598px]">
                {analysisResult ? (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <div className="p-5 bg-white/5 rounded-lg border border-white/10 min-h-[150px]">
                      <div className="text-white/90 leading-relaxed text-lg">
                        {(() => {
                          // Function to clean up the summary text
                          const cleanSummary = (text: string): string => {
                            if (!text) return '';
                            
                            // Extract just the content without metadata
                            let cleanedText = text;
                            
                            // Store processing time for stats if available
                            const processingTimeMatch = cleanedText.match(/processing_time:\s*([\d.]+)/);
                            let extractedProcessingTime: number | undefined;
                            let extractedModel: string | undefined;
                            
                            if (processingTimeMatch && processingTimeMatch[1]) {
                              extractedProcessingTime = parseFloat(processingTimeMatch[1]);
                            }
                            
                            // Store model name for stats if available
                            const modelMatch = cleanedText.match(/model:\s*(\w+)/);
                            if (modelMatch && modelMatch[1]) {
                              extractedModel = modelMatch[1];
                            }
                            
                            // Update stats at the end of cleaning
                            if (extractedProcessingTime || extractedModel) {
                              updateProcessingStats(cleanedText, extractedProcessingTime, extractedModel);
                            }
                            
                            // First remove the model info completely
                            cleanedText = cleanedText.replace(/\s*model:\s*\w+\s*processing_time:[\d.]+/g, '');
                            
                            // Remove all metadata and formatting issues
                            cleanedText = cleanedText
                              // Remove summary: prefix
                              .replace(/^\s*summary:\s*/i, '')
                              // Remove Executive Summary prefix
                              .replace(/^\s*Executive\s+Summary:?\s*/i, '')
                              // Remove Summary of prefix
                              .replace(/^\s*Summary\s+of\s+/i, '')
                              // Remove section headers
                              .replace(/\n\s*Poetic\s+Analysis[^\n]*\n/gi, '\n')
                              .replace(/\n\s*Thematic\s+Exploration\s*\n/gi, '\n')
                              .replace(/\n\s*Literary\s+Devices[^\n]*\n/gi, '\n')
                              .replace(/\n\s*Conclusion\s*\n/gi, '\n')
                              // Replace escaped newlines with actual line breaks
                              .replace(/\\n/g, '\n')
                              // Remove escaped backslashes
                              .replace(/\\\\/g, '')
                              // Remove escaped quotes
                              .replace(/\\"/g, '"')
                              // Fix spacing around punctuation
                              .replace(/\s+([.,;:!?])/g, '$1')
                              // Replace multiple spaces with single space
                              .replace(/\s{2,}/g, ' ')
                              // Fix common formatting issues
                              .replace(/\\(?!n)/g, '')
                              // Clean up special characters
                              .replace(/é/g, 'e')
                              // Remove any remaining escape sequences
                              .replace(/\\[a-zA-Z]/g, '')
                              // Fix common formatting issues with asterisks
                              .replace(/\*\*(.*?)\*\*/g, '$1')
                              // Remove any remaining backslashes
                              .replace(/\\/g, '')
                              // Trim whitespace
                              .trim();
                            
                            // Get just the first paragraph for a cleaner display
                            const paragraphs = cleanedText.split(/\n\s*\n/);
                            if (paragraphs.length > 0) {
                              return paragraphs[0].trim();
                            }
                            
                            return cleanedText;
                          };
                          
                          if (typeof analysisResult.analysis.summary === 'string') {
                            // Handle string summary
                            const cleanedText = cleanSummary(analysisResult.analysis.summary);
                            
                            // Get the first paragraph as the main summary
                            const mainSummary = cleanedText.split(/\n\s*\n/)[0];
                            
                            // Return just the main summary paragraph for a cleaner display
                            return <p className="mb-3 text-white/90 leading-relaxed text-lg">{mainSummary}</p>;
                            
                            /* Uncomment this if you want to show all paragraphs instead of just the first one
                            // Split by double newlines to preserve paragraph structure
                            const paragraphs = cleanedText.split(/\n\s*\n/).filter(p => p.trim().length > 0);
                            
                            return paragraphs.map((paragraph: string, idx: number) => {
                              // Check if this is a heading (starts with capital letter and is short)
                              const isHeading = /^[A-Z][\w\s]{1,50}$/.test(paragraph.trim()) && paragraph.length < 50;
                              
                              return isHeading ? (
                                <h3 key={idx} className="text-white font-semibold mt-4 mb-2">{paragraph.trim()}</h3>
                              ) : (
                                <p key={idx} className="mb-3">{paragraph.trim()}</p>
                              );
                            });
                            */
                          } else if (Array.isArray(analysisResult.analysis.summary)) {
                            // Handle array of summary points
                            return analysisResult.analysis.summary.map((paragraph: string, idx: number) => (
                              <p key={idx} className="mb-3">{paragraph}</p>
                            ));
                          } else if (analysisResult.analysis.summary && typeof analysisResult.analysis.summary === 'object') {
                            // Handle object by converting to clean string
                            const objString = JSON.stringify(analysisResult.analysis.summary, null, 2)
                              .replace(/[{}"\,\[\]]/g, '')
                              .replace(/:/g, ': ')
                              .trim();
                            return <p className="mb-3">{objString}</p>;
                          } else {
                            // Fallback for other types
                            return <p className="mb-3">{String(analysisResult.analysis.summary)}</p>;
                          }
                        })()} 
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
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

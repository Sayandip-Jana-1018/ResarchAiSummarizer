import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { HiUpload, HiDocumentText, HiPhotograph, HiClipboardCheck, HiLightBulb, HiInformationCircle, HiX, HiChartBar, HiRefresh, HiSparkles, HiOutlineLightningBolt, HiOutlineChip, HiOutlineBeaker, HiOutlineDocumentText, HiOutlinePencilAlt, HiOutlineLightBulb, HiOutlineTranslate } from 'react-icons/hi';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import GlassCard from '@/components/ui/GlassCard';
import VirtualCoach from '@/components/ui/VirtualCoach';
import { useSubscription } from '@/hooks/useSubscription';
import ModelSelector from '@/components/summarization/ModelSelector';
import SummarizationOptions, { SummarizationOptionsType } from '@/components/summarization/SummarizationOptions';
import SummaryDisplay from '@/components/summarization/SummaryDisplay';
import FilePreview from '@/components/summarization/FilePreview';

// Supported file types
const ACCEPTED_FILE_TYPES = {
  pdf: ['application/pdf'],
  image: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
  document: [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
    'application/msword', // doc
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
    'application/vnd.ms-excel', // xls
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
    'application/vnd.ms-powerpoint', // ppt
    'text/csv', // csv
    'text/plain' // txt
  ]
};

export default function UploadPage() {
  // File state
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<'pdf' | 'image' | 'document' | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Processing state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  
  // Summary state
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryMetadata, setSummaryMetadata] = useState<{
    processingTime: number;
    wordCount: number;
    model: string;
  } | null>(null);
  
  // UI state
  const [showTips, setShowTips] = useState(true);
  const [showFeatures, setShowFeatures] = useState(true);
  
  // Summarization options
  const [selectedModel, setSelectedModel] = useState<string>('gemini');
  const [summarizationOptions, setSummarizationOptions] = useState<SummarizationOptionsType>({
    length: 'medium',
    style: 'paragraph',
    focus: 'comprehensive',
    language: 'en'
  });
  
  // Hooks
  const { user } = useAuth();
  const { themeColor } = useTheme();
  const router = useRouter();
  const { toast } = useToast();
  const { allowedModels, plan, summariesPerDay } = useSubscription();

  // Effect to set the default model based on subscription
  useEffect(() => {
    if (allowedModels.length > 0) {
      // If current selected model is not allowed, switch to the first allowed model
      if (!allowedModels.includes(selectedModel)) {
        setSelectedModel(allowedModels[0]);
      }
    }
  }, [allowedModels, selectedModel]);

  // Effect to hide tips and features when summary is generated
  useEffect(() => {
    if (summary) {
      setShowTips(false);
      setShowFeatures(false);
    }
  }, [summary]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Check file type
    if (ACCEPTED_FILE_TYPES.pdf.includes(selectedFile.type)) {
      setFileType('pdf');
      setFile(selectedFile);
      // Create preview URL
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
    } else if (ACCEPTED_FILE_TYPES.image.some(type => selectedFile.type.includes(type))) {
      setFileType('image');
      setFile(selectedFile);
      // Create preview URL
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
    } else if (ACCEPTED_FILE_TYPES.document.some(type => selectedFile.type.includes(type))) {
      setFileType('document');
      setFile(selectedFile);
      // For documents, we can't always preview them directly
      setPreviewUrl(null);
    } else {
      toast({
        title: "Unsupported file type",
        description: "Please upload a PDF, image (PNG, JPEG, JPG, WEBP), or document (DOCX, DOC, XLSX, XLS, PPTX, PPT, CSV, TXT)",
        variant: "destructive"
      });
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      
      // Check file type
      if (ACCEPTED_FILE_TYPES.pdf.includes(droppedFile.type)) {
        setFileType('pdf');
        setFile(droppedFile);
        // Create preview URL
        const url = URL.createObjectURL(droppedFile);
        setPreviewUrl(url);
      } else if (ACCEPTED_FILE_TYPES.image.some(type => droppedFile.type.includes(type))) {
        setFileType('image');
        setFile(droppedFile);
        // Create preview URL
        const url = URL.createObjectURL(droppedFile);
        setPreviewUrl(url);
      } else if (ACCEPTED_FILE_TYPES.document.some(type => droppedFile.type.includes(type))) {
        setFileType('document');
        setFile(droppedFile);
        // For documents, we can't always preview them directly
        setPreviewUrl(null);
      } else {
        toast({
          title: "Unsupported file type",
          description: "Please upload a PDF, image (PNG, JPEG, JPG, WEBP), or document (DOCX, DOC, XLSX, XLS, PPTX, PPT, CSV, TXT)",
          variant: "destructive"
        });
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleUploadAndSummarize = async () => {
    if (!file || !user) return;
    
    // Hide tips and features immediately when upload button is clicked
    setShowTips(false);
    setShowFeatures(false);
    
    try {
      // Validate model selection based on subscription
      if (!allowedModels.includes(selectedModel)) {
        toast({
          title: "Model not available",
          description: `Your ${plan.toUpperCase()} plan doesn't include access to ${selectedModel.charAt(0).toUpperCase() + selectedModel.slice(1)}. Using ${allowedModels[0].charAt(0).toUpperCase() + allowedModels[0].slice(1)} instead.`,
          variant: "default"
        });
        // Automatically switch to an allowed model instead of blocking the operation
        setSelectedModel(allowedModels[0]);
      }
      
      setIsUploading(true);
      setUploadProgress(0);
      setSummary(null);
      setSummaryMetadata(null);
      
      // Create a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileType === 'pdf' ? 'pdfs' : fileType === 'image' ? 'images' : 'documents'}/${fileName}`;
      
      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from('research-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) throw error;
      
      // Get the public URL
      const { data: publicUrlData } = supabase.storage
        .from('research-documents')
        .getPublicUrl(filePath);
      
      // Start summarization process
      setIsUploading(false);
      setIsSummarizing(true);
      
      // Show upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + 5;
        });
      }, 200);
      
      try {
        // Import the API client dynamically to avoid server-side rendering issues
        const { summarizeDocument } = await import('@/lib/apiClient');
        
        // Call the backend API directly
        const result = await summarizeDocument(
          publicUrlData.publicUrl,
          fileType || 'document', // Ensure fileType is never null
          selectedModel,
          summarizationOptions,
          user.id,
          plan // Pass the user's subscription tier
        );
        
        // Clear progress interval and set to 100%
        clearInterval(progressInterval);
        setUploadProgress(100);
        
        // Update state with summary and metadata
        setSummary(result.summary);
        setSummaryMetadata({
          processingTime: result.processingTime,
          wordCount: result.wordCount,
          model: selectedModel
        });
        setIsSummarizing(false);
        
        // Save summary to database
        await saveSummaryToDatabase(
          publicUrlData.publicUrl, 
          result.summary, 
          selectedModel, 
          result.wordCount, 
          result.processingTime
        );
        
        toast({
          title: "Summarization complete",
          description: `Processed in ${result.processingTime ? result.processingTime.toFixed(1) : '0.0'} seconds using ${selectedModel.charAt(0).toUpperCase() + selectedModel.slice(1)}`,
        });
      } catch (error: any) {
        console.error('Summarization error:', error);
        clearInterval(progressInterval);
        toast({
          title: "Summarization failed",
          description: error.message || "There was an error summarizing your document",
          variant: "destructive"
        });
        setIsSummarizing(false);
      }
      
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "There was an error uploading your file",
        variant: "destructive"
      });
      setIsUploading(false);
      setIsSummarizing(false);
    }
  };

  const saveSummaryToDatabase = async (
    fileUrl: string, 
    summaryText: string, 
    model: string = 'gemini',
    wordCount: number = 0,
    processingTime: number = 0
  ) => {
    if (!user) return;
    
    try {
      console.log('Saving summary to database...');
      const timestamp = new Date().toISOString();
      
      // Extract file name and type from the URL or file object
      const fileName = file?.name || 'Untitled Document';
      const fileNameOnly = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
      const fileExtension = file?.name ? file.name.split('.').pop() : '';
      
      // Create a title for the summary based on the file name
      const title = fileNameOnly || 'Untitled Document';
      
      // Save to the summaries table according to the schema
      const { data: summaryData, error: summaryError } = await supabase
        .from('summaries')
        .insert({
          id: crypto.randomUUID(), // Generate a unique UUID for the summary
          user_id: user.id,
          title: title,
          summary: summaryText,
          original_text: extractedText || '',
          file_path: fileUrl,
          file_name: fileName,
          file_type: fileExtension,
          model: model,
          word_count: wordCount,
          processing_time: processingTime,
          options: JSON.stringify(summarizationOptions), // Store the options used for the summary
          created_at: timestamp,
          updated_at: timestamp
        })
        .select();
      
      if (summaryError) {
        console.error('Error saving summary:', summaryError);
        throw summaryError;
      }
      
      console.log('Summary saved successfully:', summaryData);
      
      toast({
        title: "Summary saved",
        description: "Your summary has been saved to your history",
      });
      
    } catch (error: any) {
      console.error('Database error:', error);
      toast({
        title: "Error saving summary",
        description: error.message || "There was an error saving your summary",
        variant: "destructive"
      });
    }
  };

  const handleViewSummaries = () => {
    router.push('/summaries');
  };

  const resetForm = () => {
    setFile(null);
    setFileType(null);
    setSummary(null);
    setUploadProgress(0);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleTips = () => {
    setShowTips(!showTips);
  };

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-end items-start mb-6">
          
          <div className="flex items-center space-x-3 mt-4 md:mt-0">
            {/* Subscription badge */}
            <div className={`px-3 py-1 rounded-full ${plan === 'basic' ? 'bg-gray-700 text-gray-300' : plan === 'silver' ? 'bg-gray-500/30 text-gray-300' : 'bg-yellow-600/30 text-yellow-400'} text-sm font-medium flex items-center`}>
              <HiSparkles className="mr-1" />
              {plan.charAt(0).toUpperCase() + plan.slice(1)} Plan
            </div>
            
            <button
              onClick={toggleTips}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
              title={showTips ? "Hide Tips" : "Show Tips"}
            >
              <HiLightBulb className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Upload Section */}
          <div className="lg:col-span-8 space-y-6">
            <GlassCard>
              <div className="p-6">
                <div className="flex items-center mb-6">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center mr-3"
                    style={{ backgroundColor: `${themeColor}33` }}
                  >
                    <HiUpload className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-xl font-semibold text-white">Upload Document</h2>
                </div>
                
                {/* Upload area */}
                <div
                  className={`
                    border-2 border-dashed rounded-xl p-10 text-center
                    transition-all duration-200 ease-in-out
                    ${file ? 'border-green-400/50 bg-green-400/5' : 'border-white/20 hover:border-white/40'}
                  `}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                >
                  {file ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center">
                        {fileType === 'pdf' ? (
                          <HiDocumentText className="w-20 h-20 text-red-400" />
                        ) : fileType === 'image' ? (
                          <HiPhotograph className="w-20 h-20 text-blue-400" />
                        ) : (
                          <HiDocumentText className="w-20 h-20 text-purple-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-white/80 text-sm mb-1">
                          {fileType === 'pdf' ? 'PDF Document' : fileType === 'image' ? 'Image File' : 'Document File'}
                        </p>
                        <p className="text-white font-medium">{file.name}</p>
                        <p className="text-white/60 text-sm">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6 py-4">
                      <div className="flex justify-center">
                        <div 
                          className="w-24 h-24 rounded-full flex items-center justify-center opacity-60"
                          style={{ backgroundColor: `${themeColor}33` }}
                        >
                          <HiUpload className="w-12 h-12 text-white" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-white font-medium text-xl">Drag & drop your file here</p>
                        <p className="text-white/50 text-base">
                          Supported formats: PDF, PNG, JPEG, JPG, WEBP, DOCX, DOC, XLSX, XLS, PPTX, PPT, CSV, TXT
                        </p>
                      </div>
                      <div>
                        <label 
                          htmlFor="file-upload"
                          className="px-6 py-3 rounded-lg text-white font-medium transition-all inline-block cursor-pointer"
                          style={{ 
                            background: `linear-gradient(135deg, ${themeColor}aa 0%, ${themeColor} 100%)`,
                            boxShadow: `0 4px 20px ${themeColor}66`
                          }}
                        >
                          Browse Files
                        </label>
                        <input
                          id="file-upload"
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.csv,.txt"
                          className="hidden"
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                {/* File Preview */}
                {previewUrl && (
                  <div className="mt-4 border border-white/10 rounded-lg overflow-hidden bg-black/30">
                    {fileType === 'pdf' ? (
                      <iframe 
                        src={previewUrl} 
                        className="w-full h-64 md:h-80" 
                        title="PDF Preview"
                      />
                    ) : fileType === 'image' ? (
                      <div className="flex justify-center p-4">
                        <img 
                          src={previewUrl} 
                          alt="Document Preview" 
                          className="max-h-64 md:max-h-80 object-contain"
                        />
                      </div>
                    ) : null}
                  </div>
                )}
                
                {/* Upload Progress */}
                {(isUploading || isSummarizing) && (
                  <div className="w-full bg-white/10 rounded-full h-3 mt-6">
                    <div 
                      className="h-3 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${uploadProgress}%`,
                        background: `linear-gradient(90deg, ${themeColor}aa 0%, ${themeColor} 100%)`
                      }}
                    ></div>
                  </div>
                )}
                
                {/* Upload and Change File Buttons */}
                <div className="flex justify-center space-x-4 mt-8 mb-6">
                  <button
                    onClick={resetForm}
                    className="px-5 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
                    disabled={isUploading || isSummarizing}
                  >
                    <HiRefresh className="w-4 h-4 mr-2 inline" />
                    Change File
                  </button>
                  <button
                    onClick={handleUploadAndSummarize}
                    className="px-5 py-2.5 rounded-lg text-white font-medium transition-all flex items-center"
                    style={{ 
                      background: `linear-gradient(135deg, ${themeColor}aa 0%, ${themeColor} 100%)`,
                      boxShadow: `0 4px 20px ${themeColor}66`
                    }}
                    disabled={isUploading || isSummarizing}
                  >
                    {isUploading || isSummarizing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {isUploading ? 'Uploading...' : 'Summarizing...'}
                      </>
                    ) : (
                      <>
                        <HiClipboardCheck className="w-4 h-4 mr-2" />
                        Summarize
                      </>
                    )}
                  </button>
                </div>
              </div>
            </GlassCard>
            
            {/* Summary Section */}
            <GlassCard>
              <div className="p-6 min-h-[200px] h-auto">
                <div className="flex items-center mb-6">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center mr-3"
                    style={{ backgroundColor: `${themeColor}33` }}
                  >
                    <HiDocumentText className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-xl font-semibold text-white">Research Summary</h2>
                </div>
                
                {summary ? (
                  <SummaryDisplay 
                    summary={summary} 
                    metadata={summaryMetadata} 
                    onEdit={setSummary}
                    extractedText={extractedText}
                  />
                ) : (
                  <div className="bg-white/5 rounded-xl p-10 text-center border border-white/10">
                    <div className="flex justify-center mb-6">
                      <div 
                        className="w-20 h-20 rounded-full flex items-center justify-center opacity-40"
                        style={{ backgroundColor: `${themeColor}33` }}
                      >
                        <HiDocumentText className="w-10 h-10 text-white" />
                      </div>
                    </div>
                    <h3 className="text-xl font-medium text-white/80 mb-3">No Summary Yet</h3>
                    <p className="text-white/60 text-base">
                      Upload a document to generate an AI-powered summary of the research content.
                    </p>
                  </div>
                )}
                
                {/* View All Summaries button removed for a more streamlined interface */}
              </div>
            </GlassCard>
          </div>
          
          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Enhanced Summarization Options */}
            {file && !isUploading && !isSummarizing && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <SummarizationOptions 
                  options={summarizationOptions} 
                  onChange={setSummarizationOptions} 
                />
              </motion.div>
            )}
            
            {/* AI Model Selection */}
            {file && !isUploading && !isSummarizing && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <ModelSelector 
                  allowedModels={allowedModels} 
                  selectedModel={selectedModel} 
                  onSelectModel={setSelectedModel} 
                />
              </motion.div>
            )}
            
            {/* Virtual Coach */}
            <GlassCard className="p-6">
              <div className="flex items-center mb-4">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center mr-3"
                  style={{ backgroundColor: `${themeColor}33` }}
                >
                  <HiInformationCircle className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-medium text-white">Research Assistant</h3>
              </div>
              
              <div className="relative h-[200px] mb-6 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center justify-center">
                  <VirtualCoach 
                    modelUrl="/models/virtual_coach.glb" 
                    className="h-full w-full"
                  />
                </div>
                <div 
                  className="absolute inset-0 rounded-xl -z-10"
                  style={{ 
                    background: `radial-gradient(circle, ${themeColor}33 0%, transparent 70%)`,
                    opacity: 0.6
                  }}
                />
              </div>
              
              <div 
                className="bg-white/10 rounded-lg p-4 border border-white/10"
                style={{
                  boxShadow: `0 4px 20px rgba(0,0,0,0.2)`
                }}
              >
                <p className="text-white/90 text-sm leading-relaxed">
                  "I can help analyze your research documents. Upload a PDF, image, or document to get a comprehensive summary of the key findings, methodology, and conclusions."
                </p>
              </div>
            </GlassCard>
            
            {/* Upload Tips - Hidden when summary is generated */}
            {showTips && !summary && (
              <GlassCard className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center mr-3"
                      style={{ backgroundColor: `${themeColor}33` }}
                    >
                      <HiLightBulb className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg font-medium text-white">Upload Tips</h3>
                  </div>
                  <button 
                    onClick={toggleTips}
                    className="text-white/50 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
                  >
                    <HiX className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <motion.div 
                    className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/10"
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <h4 className="text-white font-medium mb-2 flex items-center">
                      <HiDocumentText className="w-5 h-5 mr-2 text-red-400" />
                      PDF Documents
                    </h4>
                    <p className="text-white/70 text-sm leading-relaxed">
                      For best results with PDF files, ensure they are searchable (not scanned images) and contain clear text formatting.
                    </p>
                  </motion.div>
                  
                  <motion.div 
                    className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/10"
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <h4 className="text-white font-medium mb-2 flex items-center">
                      <HiPhotograph className="w-5 h-5 mr-2 text-blue-400" />
                      Image Quality
                    </h4>
                    <p className="text-white/70 text-sm leading-relaxed">
                      When uploading images of documents, ensure good lighting, minimal glare, and that text is clearly visible and not blurry.
                    </p>
                  </motion.div>
                  
                  <motion.div 
                    className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/10"
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <h4 className="text-white font-medium mb-2 flex items-center">
                      <HiChartBar className="w-5 h-5 mr-2 text-green-400" />
                      File Size
                    </h4>
                    <p className="text-white/70 text-sm leading-relaxed">
                      For optimal processing speed, keep file sizes under 10MB. Larger files may take longer to process.
                    </p>
                  </motion.div>
                </div>
              </GlassCard>
            )}
            
            {/* Features - Hidden when summary is generated */}
            {showFeatures && !summary && (
              <GlassCard className="p-6">
              <div className="flex items-center mb-6">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center mr-3"
                  style={{ backgroundColor: `${themeColor}33` }}
                >
                  <HiChartBar className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-medium text-white">Features</h3>
              </div>
              
              <div className="space-y-4">
                <motion.div 
                  className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/10 transition-all"
                  whileHover={{ y: -5, boxShadow: `0 10px 30px -5px rgba(0,0,0,0.3)` }}
                >
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center mr-4 bg-blue-500/20">
                      <HiDocumentText className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h4 className="text-white text-base font-medium">PDF Analysis</h4>
                      <p className="text-white/60 text-sm mt-1">Extract insights from research papers</p>
                    </div>
                  </div>
                </motion.div>
                
                <motion.div 
                  className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/10 transition-all"
                  whileHover={{ y: -5, boxShadow: `0 10px 30px -5px rgba(0,0,0,0.3)` }}
                >
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center mr-4 bg-purple-500/20">
                      <HiPhotograph className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <h4 className="text-white text-base font-medium">Image Processing</h4>
                      <p className="text-white/60 text-sm mt-1">Analyze text from document images</p>
                    </div>
                  </div>
                </motion.div>
                
                <motion.div 
                  className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/10 transition-all"
                  whileHover={{ y: -5, boxShadow: `0 10px 30px -5px rgba(0,0,0,0.3)` }}
                >
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center mr-4 bg-green-500/20">
                      <HiClipboardCheck className="w-6 h-6 text-green-400" />
                    </div>
                    <div>
                      <h4 className="text-white text-base font-medium">Smart Summarization</h4>
                      <p className="text-white/60 text-sm mt-1">AI-powered research insights</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </GlassCard>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

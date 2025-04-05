import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { 
  HiChevronDown, 
  HiDocumentText, 
  HiPhotograph, 
  HiQuestionMarkCircle, 
  HiLightBulb,
  HiChartBar,
  HiX,
  HiInformationCircle,
  HiBookOpen,
  HiClock,
  HiUser,
  HiSparkles,
  HiPaperAirplane,
  HiExclamation,
  HiUpload,
  HiChat,
  HiLink,
  HiPaperClip,
  HiArrowRight,
  HiDocument,
  HiLockClosed,
  HiOutlineStar,
  HiOutlineChip,
  HiOutlineLightningBolt,
  HiOutlineChatAlt,
  HiOutlineCog,
  HiCheck,
  HiOutlineCheck,
  HiShieldCheck
} from 'react-icons/hi';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import GlassCard from '@/components/ui/GlassCard';
import VirtualCoach from '@/components/ui/VirtualCoach';
import { useSubscription } from '@/hooks/useSubscription';

// Type for summary data
interface Summary {
  id: string;
  user_id: string;
  file_url: string;
  file_type: 'pdf' | 'image';
  summary: string;
  created_at: string;
  title?: string;
}

// Type for message data
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  model?: string; // Optional model field to track which AI model was used
}

// Type for FAQ data
interface FAQ {
  question: string;
  answer: string;
}

// Helper function to truncate text
const truncateText = (text: string, maxLength: number): string => {
  if (!text) return '';
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

// Helper function for context-aware responses
const generateFallbackResponse = (documentSummary: string, documentTitle: string, question: string): string => {
  // Analyze the question to determine the type of response needed
  const questionLower = question.toLowerCase();
  
  // Default heading and intro
  let heading = "Document Information";
  let intro = `Based on the document "${documentTitle}", here's what I found about your question:`;
  
  // Determine response type based on question content
  if (questionLower.includes('summarize') || questionLower.includes('summary') || questionLower.includes('overview')) {
    heading = "Document Summary";
    intro = `Here's a summary of "${documentTitle}":`;
  } else if (questionLower.includes('key point') || questionLower.includes('main point') || questionLower.includes('highlight')) {
    heading = "Key Points";
    intro = `The key points from "${documentTitle}" are:`;
  } else if (questionLower.includes('methodology') || questionLower.includes('method') || questionLower.includes('approach')) {
    heading = "Research Methodology";
    intro = `Regarding the methodology used in "${documentTitle}":`;
  } else if (questionLower.includes('result') || questionLower.includes('finding') || questionLower.includes('discover')) {
    heading = "Research Findings";
    intro = `The main findings from "${documentTitle}" include:`;
  } else if (questionLower.includes('conclusion') || questionLower.includes('implication')) {
    heading = "Conclusions";
    intro = `The conclusions drawn in "${documentTitle}" are:`;
  } else if (questionLower.includes('explain') || questionLower.includes('elaborate')) {
    heading = "Detailed Explanation";
    intro = `Here's a detailed explanation regarding your question about "${documentTitle}":`;
  } else if (questionLower.includes('compare') || questionLower.includes('contrast') || questionLower.includes('difference')) {
    heading = "Comparative Analysis";
    intro = `Comparing elements within "${documentTitle}":`;
  }
  
  return `# ${heading}

${intro}

${documentSummary}

This response is based on the document summary. You can ask follow-up questions for more specific information.`;
};

export default function QAPage() {
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [selectedSummary, setSelectedSummary] = useState<Summary | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSummaryDropdown, setShowSummaryDropdown] = useState(false);
  const [showFAQs, setShowFAQs] = useState(true);
  const [showDocumentSelector, setShowDocumentSelector] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('openai');
  const [isLoading, setIsLoading] = useState(true);
  const [processedDocuments, setProcessedDocuments] = useState<string[]>([]); // Track documents processed for RAG
  const [recentQuestions, setRecentQuestions] = useState<string[]>([
    "What is the main methodology used in this research?",
    "What are the key findings of this study?",
    "What limitations does this research have?"
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { themeColor } = useTheme();
  const router = useRouter();
  const { toast } = useToast();
  const { allowedModels, plan, summariesPerDay } = useSubscription();

  // Sample FAQs
  const faqs: FAQ[] = [
    {
      question: "How to ask effective questions?",
      answer: "Be specific and focus on one aspect at a time. For example, ask about methodology, results, or limitations separately."
    },
    {
      question: "What type of questions work best?",
      answer: "Questions about research methodology, findings, limitations, and implications typically yield the most detailed responses."
    },
    {
      question: "Can I ask follow-up questions?",
      answer: "Yes! Follow-up questions help clarify specific points and can lead to more detailed insights about the research."
    }
  ];

  useEffect(() => {
    if (user) {
      fetchSummaries();
    }
  }, [user]);

  useEffect(() => {
    // Scroll to bottom of messages
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchSummaries = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('summaries')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Add titles if they don't exist
      const summariesWithTitles = data.map((summary: Summary) => {
        if (!summary.title) {
          const date = new Date(summary.created_at).toLocaleDateString();
          summary.title = `${summary.file_type === 'pdf' ? 'PDF' : 'Image'} Summary - ${date}`;
        }
        return summary;
      });
      
      setSummaries(summariesWithTitles);
      
      // Select the first summary by default if available
      if (summariesWithTitles.length > 0 && !selectedSummary) {
        setSelectedSummary(summariesWithTitles[0]);
        
        // Add initial system message
        setMessages([
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: `I've loaded "${summariesWithTitles[0].title}". Ask me any questions about this research document!`,
            timestamp: new Date()
          }
        ]);
      }
    } catch (error: any) {
      console.error('Error fetching summaries:', error);
      toast({
        title: "Error fetching summaries",
        description: error.message || "There was an error loading your summaries",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isProcessing) return;

    const inputValue = inputMessage.trim();
    setInputMessage('');
    setIsProcessing(true);
    
    // Track which model is actually used
    let modelUsed = selectedModel;

    // Add user message to chat
    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue, // Use inputValue instead of inputMessage
      role: 'user',
      timestamp: new Date(), // Use Date object, not string
    };

    setMessages((prev) => [...prev, userMessage]);

    try {
      // Check if a document is selected
      if (!selectedSummary) {
        // No document selected, use a generic response
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            content: 'Please select a document first to provide context for your questions.',
            role: 'assistant',
            timestamp: new Date(), // Use Date object, not string
          } as Message, // Type assertion to ensure compatibility
        ]);
        setIsProcessing(false); // Use setIsProcessing instead of setIsLoading
        return;
      }

      // Get document ID
      const documentId = selectedSummary.id;
      
      // Check if document has been processed for RAG
      const isProcessed = processedDocuments.includes(documentId);
      
      let response = '';
      
      // Process document for RAG if not already processed
      if (!isProcessed) {
        try {
          console.log(`Processing document ${documentId} for RAG`);
          
          const processResponse = await fetch('/api/rag/process-document', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              document_id: documentId,
              document_text: selectedSummary.summary,
              chunk_size: 500,
              chunk_overlap: 100
            })
          });
          
          if (processResponse.ok) {
            // Mark document as processed
            setProcessedDocuments(prev => [...prev, documentId]);
            console.log('Document processed successfully for RAG');
          } else {
            console.warn('Failed to process document for RAG, will try to answer anyway');
          }
        } catch (error) {
          console.error('Error processing document for RAG:', error);
          // Continue with the request even if processing fails
        }
      }
      
      // Prepare conversation history for context
      const conversationHistory = messages
        .slice(-6) // Use last 6 messages for context
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));
      
      // Use RAG API for answering
      try {
        console.log('Calling RAG answer API with:', {
          question: inputValue,
          document_id: documentId,
          model: selectedModel
        });
        
        const ragResponse = await fetch('/api/rag/answer-question', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            question: inputValue,
            document_id: documentId,
            model: selectedModel,
            conversation_history: conversationHistory
          })
        });
        
        if (ragResponse.ok) {
          const data = await ragResponse.json();
          console.log('RAG API response data:', data);
          
          if (data.answer) {
            response = data.answer;
            console.log('Using RAG-generated answer:', response);
            
            // Check if a different model was used than what was selected
            if (data.model_used && data.model_used !== selectedModel) {
              console.log(`Selected model: ${selectedModel}, but using: ${data.model_used}`);
              modelUsed = data.model_used; // Update the model used
              toast({
                title: `Using ${data.model_used.charAt(0).toUpperCase() + data.model_used.slice(1)}`,
                description: `Your selected model wasn't available. Using ${data.model_used} instead.`,
                variant: "default"
              });
            }
            
            // If it's a fallback response from the backend, show a notification
            if (data.fallback) {
              toast({
                title: "Limited context available",
                description: data.message || "Using available document content for response.",
                variant: "default"
              });
            }
          } else if (data.status === "error") {
            // Handle error from the API, but don't throw - just use it as the response
            console.warn('Error from RAG API:', data.error);
            
            if (data.error && data.error.includes("No relevant content found")) {
              response = "I couldn't find relevant information about that in the document. Could you rephrase your question or ask about a different topic covered in the document?";
              
              toast({
                title: "No relevant content found",
                description: "The question might be outside the scope of this document.",
                variant: "destructive"
              });
            } else {
              response = `I encountered an issue while processing your question: ${data.error || "Unknown error"}. Please try again or select a different model.`;
              
              toast({
                title: "Error processing question",
                description: data.error || "Unknown error occurred",
                variant: "destructive"
              });
            }
          } else {
            // Fallback for any other unexpected response format
            console.error('Unexpected RAG API response format:', data);
            response = "I encountered an unexpected issue. Please try again or select a different model.";
            
            toast({
              title: "Unexpected response",
              description: "The system returned an unexpected response format.",
              variant: "destructive"
            });
          }
        } else {
          const errorText = await ragResponse.text();
          console.error(`RAG API error (${ragResponse.status}):`, errorText);
          throw new Error(`RAG API failed: ${errorText}`);
        }
      } catch (error) {
        console.error('Error using RAG API:', error);
        
        // Show error to user
        toast({
          title: "Error generating response",
          description: error instanceof Error ? error.message : "Failed to generate a response using RAG.",
          variant: "destructive"
        });
        
        // Add error message to chat
        response = "I'm sorry, I encountered an error while trying to answer your question. Please try again or ask a different question.";
      }
      
      // Add AI response to chat
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response,
        role: 'assistant',
        timestamp: new Date(),
        model: modelUsed // Use the model that was actually used
      };
      
      setMessages((prev) => [...prev, aiMessage]);
      
    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      toast({
        title: "Error",
        description: "There was an error processing your request. Please try again.",
        variant: "destructive"
      });
      
      // Add error message to chat
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      } as Message]); // Type assertion to ensure compatibility
    } finally {
      setIsProcessing(false);
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSelectSummary = (summary: Summary) => {
    setSelectedSummary(summary);
    setShowSummaryDropdown(false);
    
    // Reset conversation with new context
    setMessages([
      {
        id: Date.now().toString(),
        role: 'assistant',
        content: formatMessageContent(`I've loaded "${summary.title}". Ask me any questions about this research document!`),
        timestamp: new Date()
      }
    ]);
  };

  const formatMessageContent = (content: string) => {
    // Process headings (# Heading 1, ## Heading 2, ### Heading 3)
    let formatted = content
      .replace(/^# (.*)$/gm, '<h1 class="text-lg font-bold mb-3 text-white/90 border-b border-white/10 pb-1">$1</h1>')
      .replace(/^## (.*)$/gm, '<h2 class="text-base font-semibold mb-2 text-white/90">$1</h2>')
      .replace(/^### (.*)$/gm, '<h3 class="text-sm font-semibold mb-2 text-white/90">$1</h3>');
    
    // Process paragraphs
    formatted = formatted.replace(/^(?!<h[1-3]|<ul|<ol|<li|<blockquote)(.+)$/gm, '<p class="text-sm mb-3">$1</p>');
    
    // Bold text
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-purple-300">$1</strong>');
    
    // Italic text
    formatted = formatted.replace(/\*(.*?)\*/g, '<em class="text-blue-300 not-italic">$1</em>');
    
    // Unordered lists
    formatted = formatted.replace(/^\* (.*)$/gm, '<li class="mb-1">$1</li>');
    formatted = formatted.replace(/(?:^<li.*>.*<\/li>$\n?)+/gm, (match) => {
      return `<ul class="list-disc pl-4 mb-3">${match}</ul>`;
    });
    
    // Ordered lists
    formatted = formatted.replace(/^\d+\. (.*)$/gm, '<li class="mb-1">$1</li>');
    formatted = formatted.replace(/(?:^<li.*>.*<\/li>$\n?)+/gm, (match) => {
      return `<ol class="list-decimal pl-4 mb-3">${match}</ol>`;
    });
    
    // Code blocks
    formatted = formatted.replace(/`([^`]+)`/g, '<code class="bg-black/30 rounded px-1 py-0.5 text-xs">$1</code>');
    
    // Blockquotes
    formatted = formatted.replace(/^> (.*)$/gm, '<blockquote class="border-l-2 border-purple-400/50 pl-3 italic text-white/70 my-2">$1</blockquote>');
    
    // Horizontal rules
    formatted = formatted.replace(/^---$/gm, '<hr class="border-white/10 my-3" />');
    
    // Fix any remaining newlines
    formatted = formatted.replace(/\n/g, '<br>');
    
    return formatted;
  };

  const handleUseRecentQuestion = (question: string) => {
    setInputMessage(question);
  };

  const toggleFAQs = () => {
    setShowFAQs(!showFAQs);
  };

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Content - Left Column */}
          <div className="lg:col-span-8 space-y-6">
            {/* Document Selection Card */}
            <GlassCard className="relative overflow-hidden">
              {/* Header */}
              <div className="p-3 border-b border-white/10 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md bg-black/30">
                <div className="flex items-center">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center mr-3"
                    style={{ 
                      background: `linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)`,
                      boxShadow: `0 4px 10px rgba(124, 58, 237, 0.3)`
                    }}
                  >
                    <HiDocumentText className="w-4 h-4 text-white" />
                  </div>
                  <h2 className="text-lg font-medium text-white">Select Document</h2>
                </div>
              </div>
              
              {/* Document Grid - Always Visible */}
              <div className="p-3 bg-black/40 backdrop-blur-md max-h-[232px] overflow-y-auto custom-scrollbar">
                {isLoading ? (
                  <div className="flex flex-col items-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
                    <p className="text-white/70 text-sm">Loading your documents...</p>
                  </div>
                ) : summaries.length > 0 ? (
                  <>
                                      {/* Upload New Document - Centered */}
                                      <div className="flex justify-center mt-3 mb-6">
                      <motion.button
                        whileHover={{ y: -3, scale: 1.02 }}
                        transition={{ type: "spring", stiffness: 300 }}
                        onClick={() => router.push('/upload')}
                        className="cursor-pointer rounded-full px-4 py-2 border border-dashed border-white/20 bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center"
                      >
                        <HiUpload className="w-4 h-4 text-white/50 mr-2" />
                        <span className="text-white/70 text-sm font-medium">Upload New Document</span>
                      </motion.button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {summaries.map((summary) => (
                        <motion.div
                          key={summary.id}
                          whileHover={{ y: -3, scale: 1.02 }}
                          transition={{ type: "spring", stiffness: 300 }}
                          onClick={() => handleSelectSummary(summary)}
                          className={`cursor-pointer rounded-xl p-3 border transition-all ${selectedSummary?.id === summary.id 
                            ? 'bg-white/20 border-white/30 shadow-lg' 
                            : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                        >
                          <div className="flex items-start">
                            <div className="mr-3 mt-1">
                              {summary.file_type === 'pdf' ? (
                                <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                                  <HiDocumentText className="w-4 h-4 text-red-400" />
                                </div>
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                  <HiPhotograph className="w-4 h-4 text-purple-400" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-white font-medium text-xs mb-0.5 truncate">
                                {summary.title || 'Untitled Document'}
                              </h3>
                              <p className="text-white/60 text-xs">
                                {summary.file_type.toUpperCase()}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center mb-3">
                      <HiDocumentText className="w-6 h-6 text-purple-400/70" />
                    </div>
                    <h3 className="text-white font-medium mb-2 text-sm">Start by uploading a document</h3>
                    <button
                      onClick={() => router.push('/upload')}
                      className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium text-sm hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg shadow-purple-500/20"
                    >
                      <HiUpload className="w-4 h-4 mr-2" />
                      Upload a Document
                    </button>
                  </div>
                )}
              </div>
              

            </GlassCard>
            
            {/* Chat Interface */}
            <GlassCard className="overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b border-white/10 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md bg-black/30">
                <div className="flex items-center">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center mr-3"
                    style={{ 
                      background: `linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)`,
                      boxShadow: `0 4px 10px rgba(59, 130, 246, 0.3)`
                    }}
                  >
                    <HiChat className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-medium text-white">AI Assistant</h2>
                    {selectedSummary && (
                      <p className="text-white/50 text-xs">
                        Chatting with: {truncateText(selectedSummary.title || 'Untitled Document', 30)}
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Model Selector */}
                <div className="relative">
                  <button 
                    className="flex items-center space-x-1 bg-white/10 hover:bg-white/20 rounded-full px-3 py-1.5 text-white/80 text-xs transition-colors"
                    onClick={() => setShowSummaryDropdown(!showSummaryDropdown)}
                  >
                    <span className="hidden sm:inline">Model:</span>
                    <span className="font-medium">{selectedModel.charAt(0).toUpperCase() + selectedModel.slice(1)}</span>
                    <HiChevronDown className={`w-3 h-3 transition-transform ${showSummaryDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {showSummaryDropdown && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-64 bg-black/80 backdrop-blur-lg rounded-lg shadow-lg border border-white/10 z-20 overflow-hidden"
                    >
                      <div className="p-3 border-b border-white/10">
                        <h3 className="text-white text-sm font-medium">Select AI Model</h3>
                        <p className="text-white/50 text-xs mt-1">Your plan: {plan || 'Basic'}</p>
                      </div>
                      
                      <div className="py-2">
                        {/* Bronze Tier */}
                        <div className="px-3 py-1">
                          <div className="flex items-center text-amber-400 text-xs font-medium mb-1.5">
                            <HiOutlineStar className="w-3.5 h-3.5 mr-1" />
                            <span>BRONZE TIER</span>
                          </div>
                          
                          <button
                            onClick={() => setSelectedModel('gemini')}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm ${selectedModel === 'gemini' ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10'}`}
                          >
                            <div className="flex items-center">
                              <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center mr-2">
                                <HiSparkles className="w-3.5 h-3.5 text-blue-400" />
                              </div>
                              <span>Gemini</span>
                            </div>
                            {selectedModel === 'gemini' && <HiCheck className="w-4 h-4 text-blue-400" />}
                          </button>
                        </div>
                        
                        {/* Silver Tier */}
                        <div className="px-3 py-1 mt-1">
                          <div className="flex items-center text-gray-400 text-xs font-medium mb-1.5">
                            <HiOutlineStar className="w-3.5 h-3.5 mr-1" />
                            <span>SILVER TIER</span>
                          </div>
                          
                          <button
                            onClick={() => plan && ['silver', 'gold'].includes(plan.toLowerCase()) ? setSelectedModel('gpt-3.5') : null}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm ${selectedModel === 'gpt-3.5' ? 'bg-white/20 text-white' : (!plan || !['silver', 'gold'].includes(plan.toLowerCase()) ? 'text-white/30 cursor-not-allowed' : 'text-white/70 hover:bg-white/10')}`}
                          >
                            <div className="flex items-center">
                              <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center mr-2">
                                <HiOutlineChatAlt className="w-3.5 h-3.5 text-green-400" />
                              </div>
                              <span>GPT-3.5</span>
                            </div>
                            {!plan || !['silver', 'gold'].includes(plan.toLowerCase()) ? (
                              <HiLockClosed className="w-3.5 h-3.5 text-white/30" />
                            ) : selectedModel === 'gpt-3.5' ? (
                              <HiCheck className="w-4 h-4 text-green-400" />
                            ) : null}
                          </button>
                          
                          <button
                            onClick={() => plan && ['silver', 'gold'].includes(plan.toLowerCase()) ? setSelectedModel('mistral') : null}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm ${selectedModel === 'mistral' ? 'bg-white/20 text-white' : (!plan || !['silver', 'gold'].includes(plan.toLowerCase()) ? 'text-white/30 cursor-not-allowed' : 'text-white/70 hover:bg-white/10')}`}
                          >
                            <div className="flex items-center">
                              <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center mr-2">
                                <HiOutlineLightningBolt className="w-3.5 h-3.5 text-purple-400" />
                              </div>
                              <span>Mistral</span>
                            </div>
                            {!plan || !['silver', 'gold'].includes(plan.toLowerCase()) ? (
                              <HiLockClosed className="w-3.5 h-3.5 text-white/30" />
                            ) : selectedModel === 'mistral' ? (
                              <HiCheck className="w-4 h-4 text-purple-400" />
                            ) : null}
                          </button>
                        </div>
                        
                        {/* Gold Tier */}
                        <div className="px-3 py-1 mt-1">
                          <div className="flex items-center text-yellow-400 text-xs font-medium mb-1.5">
                            <HiOutlineStar className="w-3.5 h-3.5 mr-1" />
                            <span>GOLD TIER</span>
                          </div>
                          
                          <button
                            onClick={() => plan && plan.toLowerCase() === 'gold' ? setSelectedModel('claude') : null}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm ${selectedModel === 'claude' ? 'bg-white/20 text-white' : (!plan || plan.toLowerCase() !== 'gold' ? 'text-white/30 cursor-not-allowed' : 'text-white/70 hover:bg-white/10')}`}
                          >
                            <div className="flex items-center">
                              <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center mr-2">
                                <HiOutlineChip className="w-3.5 h-3.5 text-amber-400" />
                              </div>
                              <span>Claude</span>
                            </div>
                            {!plan || plan.toLowerCase() !== 'gold' ? (
                              <HiLockClosed className="w-3.5 h-3.5 text-white/30" />
                            ) : selectedModel === 'claude' ? (
                              <HiCheck className="w-4 h-4 text-amber-400" />
                            ) : null}
                          </button>
                        </div>
                        
                        <div className="px-3 pt-2 pb-1 mt-1 border-t border-white/10">
                          <button
                            onClick={() => router.push('/premium')}
                            className="w-full text-center text-xs text-white/60 hover:text-white/90 transition-colors"
                          >
                            Upgrade for more models →
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
              
              {/* Message Area */}
              <div className="flex-1 p-4 overflow-y-auto h-[443px] max-h-[500px] custom-scrollbar">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mb-4">
                      <HiChat className="w-8 h-8 text-purple-400" />
                    </div>
                    <h3 className="text-white font-medium mb-2">Start a conversation</h3>
                    <p className="text-white/60 text-sm max-w-md mb-4">
                      {selectedSummary ? 
                        "Ask questions about your document to get detailed insights." : 
                        "Select a document first to start asking questions."}
                    </p>
                    
                    {selectedSummary && (
                      <div className="grid grid-cols-1 gap-2 w-full max-w-md">
                        {recentQuestions.map((question, index) => (
                          <button
                            key={index}
                            onClick={() => handleUseRecentQuestion(question)}
                            className="text-left px-4 py-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-sm transition-colors border border-white/10"
                          >
                            {question}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6 px-2">
                    {messages.map((message) => (
                      <div 
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div 
                          className={`max-w-[85%] rounded-2xl p-4 ${message.role === 'user' 
                            ? 'bg-gradient-to-br from-blue-500/30 to-purple-500/30 border border-white/10 rounded-tr-none shadow-lg shadow-purple-500/5' 
                            : 'bg-white/10 border border-white/10 rounded-tl-none shadow-lg shadow-blue-500/5'}`}
                        >
                          <div className="flex items-start">
                            {message.role === 'assistant' && (
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0 mr-3 mt-0.5">
                                <HiSparkles className="w-4 h-4 text-white" />
                              </div>
                            )}
                            <div className="flex-1">
                              <div 
                                className="prose prose-invert max-w-none text-sm markdown-content"
                                dangerouslySetInnerHTML={{ __html: formatMessageContent(message.content) }}
                              />
                              <div className="mt-2 text-right">
                                <span className="text-white/40 text-xs">
                                  {message.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                              </div>
                            </div>
                            {message.role === 'user' && (
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center flex-shrink-0 ml-3 mt-0.5">
                                <HiUser className="w-4 h-4 text-white" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {isProcessing && (
                      <div className="flex justify-start">
                        <div className="max-w-[85%] rounded-2xl p-4 bg-white/10 border border-white/10 rounded-tl-none shadow-lg shadow-blue-500/5">
                          <div className="flex items-center space-x-3">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                              <HiSparkles className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex space-x-1.5">
                              <div className="w-2.5 h-2.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                              <div className="w-2.5 h-2.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                              <div className="w-2.5 h-2.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
              
              {/* Input Area */}
              <div className="p-2 border-t border-white/10 backdrop-blur-md bg-black/30">
                <div className="flex items-center space-x-2 p-4">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={selectedSummary ? "Ask a question about your document..." : "Select a document first..."}
                    className="flex-1 bg-white/5 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-white/20 placeholder-white/40"
                    disabled={isProcessing || !selectedSummary}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={isProcessing || !inputMessage.trim() || !selectedSummary}
                    className={`rounded-xl p-3 ${isProcessing ? 'bg-white/10 cursor-not-allowed' : 'bg-white/10 hover:bg-white/20'} transition-colors`}
                    style={{ color: themeColor }}
                  >
                    <HiPaperAirplane className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </GlassCard>
          </div>
          
          {/* Sidebar - Right Column */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Q&A Tips */}
            <GlassCard className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center mr-3"
                    style={{ 
                      background: `linear-gradient(135deg, #F59E0B 0%, #D97706 100%)`,
                      boxShadow: `0 4px 10px rgba(245, 158, 11, 0.3)`
                    }}
                  >
                    <HiSparkles className="w-4 h-4 text-white" />
                  </div>
                  <h2 className="text-lg font-medium text-white">Q&A Tips</h2>
                </div>
                <button className="text-white/50 hover:text-white/80 transition-colors">
                  <HiX className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="flex items-start">
                    <div 
                      className="w-6 h-6 rounded-full flex items-center justify-center mr-3 flex-shrink-0 mt-0.5"
                      style={{ 
                        background: `linear-gradient(135deg, #F59E0B 0%, #D97706 100%)`,
                      }}
                    >
                      <span className="text-xs font-bold text-white">1</span>
                    </div>
                    <div>
                      <h3 className="text-white font-medium text-sm mb-1">How to ask effective questions?</h3>
                      <p className="text-white/70 text-xs leading-relaxed">
                        Be specific and focus on one aspect at a time. For example, ask about methodology, results, or limitations separately.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="flex items-start">
                    <div 
                      className="w-6 h-6 rounded-full flex items-center justify-center mr-3 flex-shrink-0 mt-0.5"
                      style={{ 
                        background: `linear-gradient(135deg, #F59E0B 0%, #D97706 100%)`,
                      }}
                    >
                      <span className="text-xs font-bold text-white">2</span>
                    </div>
                    <div>
                      <h3 className="text-white font-medium text-sm mb-1">What type of questions work best?</h3>
                      <p className="text-white/70 text-xs leading-relaxed">
                        Questions about research methodology, findings, limitations, and implications typically yield the most detailed responses.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="flex items-start">
                    <div 
                      className="w-6 h-6 rounded-full flex items-center justify-center mr-3 flex-shrink-0 mt-0.5"
                      style={{ 
                        background: `linear-gradient(135deg, #F59E0B 0%, #D97706 100%)`,
                      }}
                    >
                      <span className="text-xs font-bold text-white">3</span>
                    </div>
                    <div>
                      <h3 className="text-white font-medium text-sm mb-1">Can I ask follow-up questions?</h3>
                      <p className="text-white/70 text-xs leading-relaxed">
                        Yes! Follow-up questions help clarify specific points and can lead to more detailed insights about the research.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
            
            {/* Document Stats */}
            <GlassCard className="p-4 h-[510px] flex flex-col">
              <div className="flex items-center justify-center mb-4">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center mr-3"
                  style={{ 
                    background: `linear-gradient(135deg, #10B981 0%, #059669 100%)`,
                    boxShadow: `0 4px 10px rgba(16, 185, 129, 0.3)`
                  }}
                >
                  <HiChartBar className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-lg font-medium text-white">Document Stats</h2>
              </div>
              
              {selectedSummary ? (
                <div className="space-y-4 flex-1 flex flex-col items-center">
                  {/* Document Type */}
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10 w-full">
                    <div className="flex flex-col items-center text-center">
                      <div className="mb-3">
                        {selectedSummary.file_type === 'pdf' ? (
                          <div className="w-14 h-14 rounded-lg bg-red-500/20 flex items-center justify-center">
                            <HiDocumentText className="w-7 h-7 text-red-400" />
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-purple-500/20 flex items-center justify-center">
                            <HiPhotograph className="w-7 h-7 text-purple-400" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="text-white text-base font-medium mb-1">{selectedSummary.title || 'Untitled Document'}</h3>
                        <p className="text-white/70 text-sm mb-1">{selectedSummary.file_type.toUpperCase()} Document</p>
                        <p className="text-white/50 text-xs">
                          Added on {new Date(selectedSummary.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Document Info */}
                  <div className="grid grid-cols-2 gap-3 w-full">
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <div className="flex flex-col items-center text-center">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mb-2">
                          <HiClock className="w-5 h-5 text-blue-400" />
                        </div>
                        <p className="text-white/60 text-xs mb-1">Created</p>
                        <p className="text-white text-sm font-medium">
                          {new Date(selectedSummary.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <div className="flex flex-col items-center text-center">
                        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center mb-2">
                          <HiChat className="w-5 h-5 text-purple-400" />
                        </div>
                        <p className="text-white/60 text-xs mb-1">Messages</p>
                        <p className="text-white text-sm font-medium">
                          {messages.filter(m => m.role === 'user').length}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* AI Model */}
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10 w-full">
                    <h3 className="text-white text-xs font-medium mb-3 uppercase opacity-70 text-center">Selected AI Model</h3>
                    <div className="flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center mr-3">
                        {selectedModel === 'gemini' && (
                          <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <HiSparkles className="w-6 h-6 text-blue-400" />
                          </div>
                        )}
                        {selectedModel === 'gpt-3.5' && (
                          <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                            <HiOutlineChatAlt className="w-6 h-6 text-green-400" />
                          </div>
                        )}
                        {selectedModel === 'mistral' && (
                          <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                            <HiOutlineLightningBolt className="w-6 h-6 text-purple-400" />
                          </div>
                        )}
                        {selectedModel === 'claude' && (
                          <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                            <HiOutlineChip className="w-6 h-6 text-amber-400" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="text-white text-base font-medium">{selectedModel.charAt(0).toUpperCase() + selectedModel.slice(1)}</h3>
                        <p className="text-white/60 text-sm">
                          {selectedModel === 'gemini' && 'Google AI'}
                          {selectedModel === 'gpt-3.5' && 'OpenAI'}
                          {selectedModel === 'mistral' && 'Mistral AI'}
                          {selectedModel === 'claude' && 'Anthropic'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center min-h-[360px] text-center">
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                    style={{ 
                      background: `radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, transparent 70%)`,
                    }}
                  >
                    <HiDocument className="w-6 h-6 text-white/30" />
                  </div>
                  <p className="text-white/70 text-sm mb-1">Select a document to view stats</p>
                </div>
              )}
            </GlassCard>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

import React from 'react';
import { HiSparkles, HiLightningBolt, HiBeaker, HiChip } from 'react-icons/hi';
import { useTheme } from '@/context/ThemeContext';
import { motion } from 'framer-motion';
import { useSubscription } from '@/hooks/useSubscription';

interface ModelSelectorProps {
  selectedModel: string;
  onSelectModel: (model: string) => void;
  allowedModels: string[];
}

interface ModelOption {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  premium: boolean;
}

export default function ModelSelector({ selectedModel, onSelectModel, allowedModels }: ModelSelectorProps) {
  const { themeColor } = useTheme();
  const { plan } = useSubscription();

  // Define models with their premium status based on the subscription plan
  const getModelPremiumStatus = (modelId: string, plan: string): boolean => {
    if (modelId === 'gemini') return false; // Gemini is available to all plans
    if (modelId === 'openai' || modelId === 'mistral') {
      return plan === 'basic'; // Premium for basic users only
    }
    if (modelId === 'claude') {
      return plan !== 'gold'; // Only available for gold users
    }
    return true; // Default to premium
  };

  const models: ModelOption[] = [
    {
      id: 'gemini',
      name: 'Google Gemini',
      description: 'Balanced model with good performance across various tasks',
      icon: <HiSparkles className="w-5 h-5 text-blue-500" />,
      premium: getModelPremiumStatus('gemini', plan)
    },
    {
      id: 'openai',
      name: 'OpenAI GPT',
      description: 'Excellent at detailed analysis and comprehensive summaries',
      icon: <HiChip className="w-5 h-5 text-green-500" />,
      premium: getModelPremiumStatus('openai', plan)
    },
    {
      id: 'mistral',
      name: 'Mistral AI',
      description: 'Specialized in scientific and technical content',
      icon: <HiBeaker className="w-5 h-5 text-purple-500" />,
      premium: getModelPremiumStatus('mistral', plan)
    },
    {
      id: 'claude',
      name: 'Anthropic Claude',
      description: 'Focuses on nuanced understanding and clear explanations',
      icon: <HiLightningBolt className="w-5 h-5 text-amber-500" />,
      premium: getModelPremiumStatus('claude', plan)
    }
  ];

  return (
    <div className="w-full">
      <div className={`bg-gradient-to-br from-${themeColor}-900/90 to-gray-900/90 rounded-2xl shadow-xl border border-${themeColor}-700/30 overflow-hidden mb-6`}>
        {/* Header */}
        <div className={`bg-${themeColor}-800/50 px-6 py-4 flex items-center justify-between border-b border-${themeColor}-700/30`}>
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg bg-${themeColor}-700/50 text-white`}>
              <HiChip className="h-5 w-5" />
            </div>
            <h2 className="text-white font-bold text-lg">AI Model</h2>
          </div>
          <div className={`px-3 py-1 rounded-full bg-${themeColor}-700/40 text-${themeColor}-200 text-xs font-medium`}>
            {plan.toUpperCase()}
          </div>
        </div>
        
        {/* Models Container */}
        <div className="p-5 space-y-4">
      <div className="grid grid-cols-1 gap-4">
        {models.map((model) => {
          const isAllowed = allowedModels.includes(model.id);
          const isSelected = selectedModel === model.id;
          
          return (
            <motion.div
              key={model.id}
              whileHover={{ scale: isAllowed ? 1.03 : 1, y: isAllowed ? -2 : 0 }}
              whileTap={{ scale: isAllowed ? 0.98 : 1 }}
              className={`
                relative rounded-xl p-4 cursor-pointer transition-all duration-200 border backdrop-blur-sm
                ${isSelected 
                  ? `ring-2 ring-${themeColor}-400 bg-${themeColor}-900/40 border-${themeColor}-500/50 shadow-lg shadow-${themeColor}-900/20` 
                  : 'bg-gray-800/40 border-gray-700/50 hover:bg-gray-700/60'}
                ${!isAllowed ? 'opacity-70 cursor-not-allowed' : ''}
              `}
              onClick={() => isAllowed && onSelectModel(model.id)}
            >
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-full ${isSelected ? `bg-${themeColor}-800/50 ring-1 ring-${themeColor}-400/50` : 'bg-gray-800/70'} shadow-inner`}>
                  {model.icon}
                  {isSelected && (
                    <motion.div 
                      className="absolute inset-0 rounded-full" 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <span className="absolute -right-1 -top-1 w-4 h-4 bg-${themeColor}-400 rounded-full flex items-center justify-center shadow-lg">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                        </svg>
                      </span>
                    </motion.div>
                  )}
                </div>
                <div>
                  <h4 className="text-white font-medium flex items-center text-base">
                    {model.name}
                    {model.premium && (
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-300 border border-amber-500/30">
                        Premium
                      </span>
                    )}
                  </h4>
                  <p className="text-gray-300 text-sm mt-1">{model.description}</p>
                </div>
              </div>
              
              {!isAllowed && (
                <div className="absolute inset-0 rounded-xl flex items-center justify-center bg-black/70 backdrop-blur-sm border border-red-500/20">
                  <div className="text-center px-4 py-2 bg-gray-900/80 rounded-lg border border-gray-700/50 shadow-lg">
                    <span className="text-sm font-medium text-white flex items-center justify-center">
                      <HiSparkles className={`mr-1 text-${themeColor}-400 animate-pulse`} />
                      {model.id === 'claude' ? 'Upgrade to Gold' : 'Upgrade to Silver or Gold'}
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
        </div>
      </div>
      
      <div className="text-center mt-3">
        <p className="text-xs text-${themeColor}-300/80">
          <HiSparkles className="inline-block mr-1 h-3 w-3" />
          Using {models.find(m => m.id === selectedModel)?.name} for summarization
        </p>
      </div>
    </div>
  );
}

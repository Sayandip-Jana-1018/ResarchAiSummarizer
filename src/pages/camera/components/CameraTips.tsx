import React from 'react';
import { HiLightBulb, HiX } from 'react-icons/hi';
import GlassCard from '@/components/ui/GlassCard';

interface CameraTipsProps {
  show: boolean;
  themeColor: string;
  onClose: () => void;
}

const CameraTips: React.FC<CameraTipsProps> = ({ show, themeColor, onClose }) => {
  if (!show) return null;
  
  return (
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
          onClick={onClose}
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
  );
};

export default CameraTips;

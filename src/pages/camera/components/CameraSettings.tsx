import React from 'react';
import { HiX } from 'react-icons/hi';
import GlassCard from '@/components/ui/GlassCard';

interface CameraSettingsProps {
  show: boolean;
  devices: MediaDeviceInfo[];
  selectedDeviceId: string;
  selectedModel: string;
  realTimeDelay: number;
  onClose: () => void;
  onDeviceChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onModelChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onDelayChange: (delay: number) => void;
}

const CameraSettings: React.FC<CameraSettingsProps> = ({
  show,
  devices,
  selectedDeviceId,
  selectedModel,
  realTimeDelay,
  onClose,
  onDeviceChange,
  onModelChange,
  onDelayChange
}) => {
  if (!show) return null;

  return (
    <GlassCard className="mb-4 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-white">Camera Settings</h3>
        <button 
          onClick={onClose}
          className="text-white/50 hover:text-white transition-colors"
        >
          <HiX className="w-5 h-5" />
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Camera selection */}
        <div>
          <label className="block text-white/80 text-sm mb-2">Camera Device</label>
          <select
            value={selectedDeviceId}
            onChange={onDeviceChange}
            className="w-full bg-white/10 border border-white/20 rounded-lg p-2 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
          >
            {devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera ${devices.indexOf(device) + 1}`}
              </option>
            ))}
          </select>
        </div>
        
        {/* Model selection */}
        <div>
          <label className="block text-white/80 text-sm mb-2">AI Model</label>
          <select
            value={selectedModel}
            onChange={onModelChange}
            className="w-full bg-white/10 border border-white/20 rounded-lg p-2 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
          >
            <option value="gemini">Google Gemini</option>
            <option value="openai">OpenAI GPT</option>
            <option value="claude">Anthropic Claude</option>
            <option value="mistral">Mistral AI</option>
          </select>
        </div>
        
        {/* Real-time delay setting */}
        <div>
          <label className="block text-white/80 text-sm mb-2">Real-time Capture Interval</label>
          <select
            value={realTimeDelay}
            onChange={(e) => onDelayChange(Number(e.target.value))}
            className="w-full bg-white/10 border border-white/20 rounded-lg p-2 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
          >
            <option value={1000}>1 second</option>
            <option value={2000}>2 seconds</option>
            <option value={3000}>3 seconds</option>
            <option value={5000}>5 seconds</option>
          </select>
        </div>
      </div>
    </GlassCard>
  );
};

export default CameraSettings;

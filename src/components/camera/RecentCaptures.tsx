import React from 'react';
import { HiPhotograph } from 'react-icons/hi';
import GlassCard from '@/components/ui/GlassCard';

interface RecentCapturesProps {
  captures: { url: string; date: Date }[];
  themeColor: string;
}

const RecentCaptures: React.FC<RecentCapturesProps> = ({ captures, themeColor }) => {
  return (
    <GlassCard className="p-4 flex-grow">
      <div className="flex items-center mb-3">
        <div 
          className="w-9 h-9 rounded-lg flex items-center justify-center mr-3"
          style={{ backgroundColor: `${themeColor}33` }}
        >
          <HiPhotograph className="w-5 h-5 text-white" />
        </div>
        <h3 className="text-lg font-medium text-white">Recent Captures</h3>
      </div>
      
      {captures.length > 0 ? (
        <div className="space-y-3">
          {captures.map((capture, index) => (
            <div key={index} className="bg-white/10 rounded-lg overflow-hidden">
              <div className="aspect-video relative">
                <img 
                  src={capture.url} 
                  alt={`Recent capture ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-2 text-center">
                <p className="text-white/70 text-sm">
                  {capture.date.toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-36 text-center">
          <div 
            className="w-14 h-14 rounded-full flex items-center justify-center mb-3 opacity-40"
            style={{ backgroundColor: `${themeColor}33` }}
          >
            <HiPhotograph className="w-7 h-7 text-white" />
          </div>
          <p className="text-white/50 text-base">
            No recent captures
          </p>
        </div>
      )}
    </GlassCard>
  );
};

export default RecentCaptures;

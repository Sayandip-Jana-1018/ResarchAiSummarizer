import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { HiChartBar, HiChartSquareBar, HiDocumentText, HiPencil, HiSearch, HiTag, HiTrash, HiPhotograph, HiCalendar, HiEye, HiChartPie, HiFilter, HiCollection, HiLightningBolt } from 'react-icons/hi';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import GlassCard from '@/components/ui/GlassCard';

// Type for summary data
interface Summary {
  id: string;
  user_id: string;
  file_url: string;
  file_type: 'pdf' | 'image' | 'document';
  summary: string;
  created_at: string;
  title?: string;
  word_count?: number;
  category?: string;
}

// Demo data for charts
const demoActivityData = [
  { date: 'Jan 1', count: 2 },
  { date: 'Jan 8', count: 5 },
  { date: 'Jan 15', count: 3 },
  { date: 'Jan 22', count: 7 },
  { date: 'Jan 29', count: 4 },
  { date: 'Feb 5', count: 6 },
  { date: 'Feb 12', count: 8 },
  { date: 'Feb 19', count: 5 },
  { date: 'Feb 26', count: 9 },
  { date: 'Mar 5', count: 7 },
  { date: 'Mar 12', count: 10 },
  { date: 'Mar 19', count: 8 },
  { date: 'Mar 26', count: 12 },
];

const demoTypeData = [
  { name: 'PDF', value: 45 },
  { name: 'Image', value: 30 },
  { name: 'Document', value: 25 },
];

const demoCategories = [
  { name: 'Physics', value: 35 },
  { name: 'Biology', value: 25 },
  { name: 'Chemistry', value: 20 },
  { name: 'Computer Science', value: 15 },
  { name: 'Mathematics', value: 5 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function SummariesPage() {
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSummary, setSelectedSummary] = useState<Summary | null>(null);
  const [timeRange, setTimeRange] = useState<'hour' | 'day' | 'week'>('day');
  const [activityData, setActivityData] = useState(demoActivityData);
  const [hourlyActivityData, setHourlyActivityData] = useState<Array<{hour: string, count: number}>>([]);
  const [dailyActivityData, setDailyActivityData] = useState<Array<{date: string, count: number}>>([]);
  const [weeklyActivityData, setWeeklyActivityData] = useState<Array<{week: string, count: number}>>([]);
  const [typeDistribution, setTypeDistribution] = useState(demoTypeData);
  const [categoryDistribution, setCategoryDistribution] = useState(demoCategories);
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [statsData, setStatsData] = useState({
    totalSummaries: 0,
    avgWordCount: 0,
    mostFrequentType: '',
    summariesThisMonth: 0
  });
  const { user } = useAuth();
  const { themeColor } = useTheme();
  const router = useRouter();
  const { toast } = useToast();

  // Create random activity data
  const createRandomActivityData = () => {
    return Array(13).fill(0).map((_, i) => ({
      date: `${i % 2 === 0 ? 'Jan' : 'Feb'} ${i + 1}`,
      count: 2 + Math.floor(Math.random() * 9) // 2-10
    }));
  };
  
  // Create random hourly activity data
  const createRandomHourlyData = () => {
    return Array(24).fill(0).map((_, i) => ({
      hour: `${(23-i).toString().padStart(2, '0')}:00`,
      count: Math.floor(Math.random() * 5) // 0-4
    }));
  };
  
  // Create random daily activity data
  const createRandomDailyData = () => {
    const dailyData = [];
    const now = new Date();
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      dailyData.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count: Math.floor(Math.random() * 6) + 1 // 1-6
      });
    }
    
    return dailyData;
  };
  
  // Create random weekly activity data
  const createRandomWeeklyData = () => {
    return Array(12).fill(0).map((_, i) => ({
      week: `Week ${i+1}`,
      count: Math.floor(Math.random() * 15) + 5 // 5-19
    }));
  };

  // Create random type distribution
  const createRandomTypeData = () => {
    const total = 100;
    const pdf = 30 + Math.floor(Math.random() * 30); // 30-60
    const image = 20 + Math.floor(Math.random() * 30); // 20-50
    const document = total - pdf - image;
    
    return [
      { name: 'PDF', value: pdf },
      { name: 'Image', value: image },
      { name: 'Document', value: document }
    ];
  };

  // Create random category distribution
  const createRandomCategoryData = () => {
    return [
      { name: 'Physics', value: 15 + Math.floor(Math.random() * 25) }, // 15-40
      { name: 'Biology', value: 10 + Math.floor(Math.random() * 20) }, // 10-30
      { name: 'Chemistry', value: 5 + Math.floor(Math.random() * 20) }, // 5-25
      { name: 'Computer Science', value: 5 + Math.floor(Math.random() * 15) }, // 5-20
      { name: 'Mathematics', value: 2 + Math.floor(Math.random() * 8) }, // 2-10
    ];
  };

  // Create rich demo summaries data with randomization
  const createDemoSummaries = (): Summary[] => {
    const demoSummaries: Summary[] = [];
    const categories = ['Physics', 'Biology', 'Chemistry', 'Computer Science', 'Mathematics', 'Medicine', 'Engineering'];
    const titles = [
      'Quantum Computing Fundamentals',
      'CRISPR Gene Editing Technology',
      'Advanced Materials Science',
      'Neural Networks and Deep Learning',
      'Climate Change Impact Analysis',
      'Renewable Energy Solutions',
      'Artificial Intelligence Ethics',
      'Blockchain Technology Applications',
      'Nanotechnology in Medicine',
      'Space Exploration Advancements',
      'Sustainable Agriculture Practices',
      'Cybersecurity Threat Analysis'
    ];
    
    // Randomize the number of summaries (8-15)
    const numSummaries = 8 + Math.floor(Math.random() * 8);
    
    // Generate demo summaries
    for (let i = 0; i < numSummaries; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i * (2 + Math.floor(Math.random() * 3))); // Random spacing between dates
      
      demoSummaries.push({
        id: `demo-${i}`,
        user_id: user?.id || 'demo-user',
        file_url: '/assets/demo-file.pdf',
        file_type: i % 3 === 0 ? 'image' : i % 3 === 1 ? 'document' : 'pdf',
        summary: `This is a demo summary for ${titles[i % titles.length]}. It contains key findings and analysis of the research paper. The document discusses important concepts, methodologies, and results.`,
        created_at: date.toISOString(),
        title: titles[i % titles.length],
        word_count: 500 + Math.floor(Math.random() * 1500),
        category: categories[i % categories.length]
      });
    }
    
    return demoSummaries;
  };

  // Create rich demo stats data with randomization
  const createDemoStats = () => {
    const totalSummaries = 8 + Math.floor(Math.random() * 8); // 8-15
    return {
      totalSummaries,
      avgWordCount: 800 + Math.floor(Math.random() * 800), // 800-1600
      mostFrequentType: Math.random() > 0.5 ? 'PDF' : 'Image',
      summariesThisMonth: 5 + Math.floor(Math.random() * 6) // 5-10
    };
  };

  // Update activity data based on time range
  const updateActivityDataByTimeRange = (range: 'hour' | 'day' | 'week') => {
    if (range === 'hour') {
      setActivityData(hourlyActivityData.map(item => ({ date: item.hour, count: item.count })));
    } else if (range === 'day') {
      setActivityData(dailyActivityData.map(item => ({ date: item.date, count: item.count })));
    } else {
      setActivityData(weeklyActivityData.map(item => ({ date: item.week, count: item.count })));
    }
  };
  
  // Toggle demo mode and generate new random data
  const toggleDemoMode = (demoMode: boolean) => {
    setIsDemoMode(demoMode);
    if (demoMode) {
      // Generate new random demo data
      const demoSummaries = createDemoSummaries();
      setSummaries(demoSummaries);
      
      // Create random hourly data
      const hourlyData = createRandomHourlyData();
      setHourlyActivityData(hourlyData);
      
      // Create random daily data
      const dailyData = createRandomDailyData();
      setDailyActivityData(dailyData);
      
      // Create random weekly data
      const weeklyData = createRandomWeeklyData();
      setWeeklyActivityData(weeklyData);
      
      // Set activity data based on current timeRange
      updateActivityDataByTimeRange(timeRange);
      
      setTypeDistribution(createRandomTypeData());
      setCategoryDistribution(createRandomCategoryData());
      setStatsData(createDemoStats());
      setIsLoading(false);
    } else {
      // Reset and fetch real data
      setIsLoading(true);
      fetchSummaries();
    }
  };

  useEffect(() => {
    if (user) {
      toggleDemoMode(isDemoMode);
    }
  }, [user]);

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
          summary.title = `${summary.file_type === 'pdf' ? 'PDF' : summary.file_type === 'image' ? 'Image' : 'Document'} Summary - ${date}`;
        }
        // Add demo word count and category for existing summaries
        if (!summary.word_count) {
          summary.word_count = Math.floor(Math.random() * 2000) + 500;
        }
        if (!summary.category) {
          const categories = ['Physics', 'Biology', 'Chemistry', 'Computer Science', 'Mathematics'];
          summary.category = categories[Math.floor(Math.random() * categories.length)];
        }
        return summary;
      });
      
      setSummaries(summariesWithTitles);
      
      // If there are no summaries, we'll use the demo data
      // Otherwise, we would generate real data from the summaries
      if (summariesWithTitles.length > 0) {
        // Generate stats from summaries
        const totalSummaries = summariesWithTitles.length;
        
        // Calculate average word count
        const totalWordCount = summariesWithTitles.reduce((acc, summary) => acc + (summary.word_count || 0), 0);
        const avgWordCount = totalWordCount / totalSummaries || 0;
        
        // Find most frequent file type
        const typeCounts = summariesWithTitles.reduce((acc, summary) => {
          acc[summary.file_type] = (acc[summary.file_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        const mostFrequentType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'PDF';
        
        // Count summaries this month
        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();
        const summariesThisMonth = summariesWithTitles.filter(summary => {
          const date = new Date(summary.created_at);
          return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
        }).length;
        
        setStatsData({
          totalSummaries,
          avgWordCount: Math.round(avgWordCount),
          mostFrequentType: mostFrequentType.charAt(0).toUpperCase() + mostFrequentType.slice(1),
          summariesThisMonth
        });
        
        // Process activity data
        const activityNow = new Date();
        const hourlyData: Record<string, number> = {};
        
        // Initialize last 24 hours with 0 counts
        for (let i = 0; i < 24; i++) {
          const hour = new Date(activityNow);
          hour.setHours(activityNow.getHours() - i);
          const hourKey = hour.getHours().toString().padStart(2, '0') + ':00';
          hourlyData[hourKey] = 0;
        }
        
        // Process daily data
        const dailyData: Record<string, number> = {};
        
        // Initialize last 30 days with 0 counts
        for (let i = 0; i < 30; i++) {
          const day = new Date(activityNow);
          day.setDate(activityNow.getDate() - i);
          const dayKey = day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          dailyData[dayKey] = 0;
        }
        
        // Process weekly data
        const weeklyData: Record<string, number> = {};
        
        // Initialize last 12 weeks with 0 counts
        for (let i = 0; i < 12; i++) {
          const week = new Date(activityNow);
          week.setDate(activityNow.getDate() - (i * 7));
          const weekKey = `Week ${i + 1}`;
          weeklyData[weekKey] = 0;
        }
        
        // Count summaries for each time period
        summariesWithTitles.forEach(summary => {
          const date = new Date(summary.created_at);
          
          // Hourly
          const hourKey = date.getHours().toString().padStart(2, '0') + ':00';
          if (hourlyData[hourKey] !== undefined && 
              date.getTime() > activityNow.getTime() - (24 * 60 * 60 * 1000)) {
            hourlyData[hourKey]++;
          }
          
          // Daily
          const dayKey = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          if (dailyData[dayKey] !== undefined && 
              date.getTime() > activityNow.getTime() - (30 * 24 * 60 * 60 * 1000)) {
            dailyData[dayKey]++;
          }
          
          // Weekly
          const weekDiff = Math.floor((activityNow.getTime() - date.getTime()) / (7 * 24 * 60 * 60 * 1000));
          if (weekDiff < 12) {
            const weekKey = `Week ${weekDiff + 1}`;
            weeklyData[weekKey]++;
          }
        });
        
        // Convert to arrays for charts
        const hourlyActivityArray = Object.entries(hourlyData)
          .map(([hour, count]) => ({ hour, count }))
          .sort((a, b) => a.hour.localeCompare(b.hour));
        setHourlyActivityData(hourlyActivityArray);
          
        const dailyActivityArray = Object.entries(dailyData)
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => {
            // Sort by date (newest first)
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return dateB.getTime() - dateA.getTime();
          });
        setDailyActivityData(dailyActivityArray);
          
        const weeklyActivityArray = Object.entries(weeklyData)
          .map(([week, count]) => ({ week, count }))
          .reverse();
        setWeeklyActivityData(weeklyActivityArray);
          
        // Set the current view based on timeRange
        updateActivityDataByTimeRange(timeRange);
        
        // Generate document type distribution
        const typeCount: Record<string, number> = {
          'PDF': 0,
          'Image': 0,
          'Document': 0
        };
        
        summariesWithTitles.forEach(summary => {
          const type = summary.file_type === 'pdf' ? 'PDF' : 
                      summary.file_type === 'image' ? 'Image' : 'Document';
          typeCount[type]++;
        });
        
        const typeDistributionData = Object.entries(typeCount)
          .map(([name, value]) => ({ name, value }))
          .filter(item => item.value > 0);
        setTypeDistribution(typeDistributionData);
        
        // Generate category distribution
        const categoryCount: Record<string, number> = {};
        
        summariesWithTitles.forEach(summary => {
          if (summary.category) {
            categoryCount[summary.category] = (categoryCount[summary.category] || 0) + 1;
          }
        });
        
        const categoryDistributionData = Object.entries(categoryCount)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5); // Take top 5 categories
        setCategoryDistribution(categoryDistributionData);
      } else {
        // Set demo stats
        setStatsData({
          totalSummaries: 45,
          avgWordCount: 1250,
          mostFrequentType: 'PDF',
          summariesThisMonth: 12
        });
      }
    } catch (error: any) {
      console.error('Error fetching summaries:', error);
      toast({
        title: "Error fetching summaries",
        description: error.message || "There was an error loading your summaries",
        variant: "destructive"
      });
      
      // Set demo stats even on error
      setStatsData({
        totalSummaries: 45,
    
        avgWordCount: 1250,
        mostFrequentType: 'PDF',
        summariesThisMonth: 12
      });
    } finally {
      setIsLoading(false);
    }
  };

  
  const handleViewSummary = (summary: Summary) => {
    setSelectedSummary(summary);
  };
  
  const handleDeleteSummary = async (id: string) => {
    try {
      const { error } = await supabase
        .from('summaries')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Update state
      setSummaries(summaries.filter(summary => summary.id !== id));
      
      // If the deleted summary was selected, clear selection
      if (selectedSummary?.id === id) {
        setSelectedSummary(null);
      }
      
      toast({
        title: "Summary deleted",
        description: "The summary has been deleted successfully",
      });
    } catch (error: any) {
      console.error('Error deleting summary:', error);
      toast({
        title: "Error deleting summary",
        description: error.message || "There was an error deleting the summary",
        variant: "destructive"
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleTimeRangeChange = (range: 'hour' | 'day' | 'week') => {
    setTimeRange(range);
    // Update the activity data based on the selected time range
    updateActivityDataByTimeRange(range);
  };

  const filteredSummaries = summaries.filter(summary => 
    summary.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    summary.summary.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8">
        
        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center mr-3"
                  style={{ backgroundColor: `${themeColor}33` }}
                >
                  <HiChartBar className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-medium text-white">Activity Timeline</h3>
              </div>
              
              <div className="flex space-x-2">
                <button 
                  onClick={() => handleTimeRangeChange('hour')}
                  className={`px-2 py-1 rounded-md text-xs font-medium transition-all ${timeRange === 'hour' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white/90'}`}
                >
                  Hourly
                </button>
                <button 
                  onClick={() => handleTimeRangeChange('day')}
                  className={`px-2 py-1 rounded-md text-xs font-medium transition-all ${timeRange === 'day' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white/90'}`}
                >
                  Daily
                </button>
                <button 
                  onClick={() => handleTimeRangeChange('week')}
                  className={`px-2 py-1 rounded-md text-xs font-medium transition-all ${timeRange === 'week' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white/90'}`}
                >
                  Weekly
                </button>
              </div>
            </div>
            
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="date" 
                    stroke="rgba(255,255,255,0.5)" 
                    tick={{ fill: 'rgba(255,255,255,0.7)' }} 
                  />
                  <YAxis 
                    stroke="rgba(255,255,255,0.5)" 
                    tick={{ fill: 'rgba(255,255,255,0.7)' }} 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(0,0,0,0.8)', 
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px',
                      color: 'white' 
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    name="Summaries" 
                    stroke={themeColor} 
                    strokeWidth={3}
                    dot={{ fill: themeColor, r: 4 }}
                    activeDot={{ r: 6, fill: themeColor }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
          
          <GlassCard className="p-6">
            <div className="flex items-center mb-6">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center mr-3"
                style={{ backgroundColor: `${themeColor}33` }}
              >
                <HiChartPie className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-medium text-white">Document Types</h3>
            </div>
            
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {typeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(0,0,0,0.8)', 
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px',
                      color: 'white' 
                    }} 
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    formatter={(value: string) => <span style={{ color: 'rgba(255,255,255,0.8)' }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Summaries List */}
          <div className="lg:col-span-1">
            <GlassCard className="h-full">
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Your Summaries</h2>
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${themeColor}33` }}
                >
                  <HiFilter className="w-4 h-4 text-white" />
                </div>
              </div>
              
              <div className="p-4 border-b border-white/10">
                <div className="relative">
                  <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50" />
                  <input
                    type="text"
                    placeholder="Search summaries..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/20"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="p-4 h-[650px] overflow-y-auto">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="w-12 h-12 border-t-2 border-b-2 border-white rounded-full animate-spin mb-4"></div>
                    <p className="text-white/70">Loading summaries...</p>
                  </div>
                ) : filteredSummaries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div 
                      className="w-16 h-16 rounded-full flex items-center justify-center mb-4 opacity-40"
                      style={{ backgroundColor: `${themeColor}33` }}
                    >
                      <HiDocumentText className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-lg font-medium text-white/80 mb-2">No Summaries Found</h3>
                    <p className="text-white/50 max-w-md mb-6">
                      {searchTerm ? 'Try a different search term or' : 'You haven\'t created any summaries yet.'} 
                    </p>
                    <button 
                      onClick={() => router.push('/upload')}
                      className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all flex items-center"
                    >
                      <HiDocumentText className="mr-2" />
                      Create New Summary
                    </button>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {filteredSummaries.map((summary) => (
                      <li 
                        key={summary.id}
                        onClick={() => handleViewSummary(summary)}
                        className={`p-3 rounded-lg cursor-pointer transition-all ${
                          selectedSummary?.id === summary.id 
                            ? `bg-white/20 border border-white/30` 
                            : `bg-white/5 border border-white/10 hover:bg-white/10`
                        }`}
                      >
                        <div className="flex items-start">
                          <div 
                            className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 flex-shrink-0 ${
                              selectedSummary?.id === summary.id ? 'opacity-100' : 'opacity-70'
                            }`}
                            style={{ backgroundColor: `${themeColor}33` }}
                          >
                            {summary.file_type === 'pdf' ? (
                              <HiDocumentText className="w-5 h-5 text-white" />
                            ) : summary.file_type === 'image' ? (
                              <HiPhotograph className="w-5 h-5 text-white" />
                            ) : (
                              <HiDocumentText className="w-5 h-5 text-white" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className={`font-medium truncate ${
                              selectedSummary?.id === summary.id ? 'text-white' : 'text-white/80'
                            }`}>
                              {summary.title}
                            </h3>
                            <p className={`text-sm truncate ${
                              selectedSummary?.id === summary.id ? 'text-white/70' : 'text-white/50'
                            }`}>
                              {summary.summary.substring(0, 60)}...
                            </p>
                            <div className="flex items-center mt-1">
                              <HiCalendar className={`w-3 h-3 mr-1 ${
                                selectedSummary?.id === summary.id ? 'text-white/70' : 'text-white/40'
                              }`} />
                              <span className={`text-xs ${
                                selectedSummary?.id === summary.id ? 'text-white/70' : 'text-white/40'
                              }`}>
                                {formatDate(summary.created_at)}
                              </span>
                              {summary.category && (
                                <>
                                  <span className={`mx-1 text-xs ${
                                    selectedSummary?.id === summary.id ? 'text-white/70' : 'text-white/40'
                                  }`}>•</span>
                                  <span className={`text-xs ${
                                    selectedSummary?.id === summary.id ? 'text-white/70' : 'text-white/40'
                                  }`}>
                                    {summary.category}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </GlassCard>
          </div>
          
          {/* Summary Detail */}
          <div className="lg:col-span-2">
            <GlassCard className="h-full">
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">
                  {selectedSummary ? selectedSummary.title : 'Summary Details'}
                </h2>
                {selectedSummary && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => window.open(selectedSummary.file_url, '_blank')}
                      className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
                      title="View Original Document"
                    >
                      <HiEye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteSummary(selectedSummary.id)}
                      className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 transition-all"
                      title="Delete Summary"
                    >
                      <HiTrash className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
              
              <div className="p-6 min-h-[650px] max-h-[650px] overflow-y-auto">
                {selectedSummary ? (
                  <div>
                    {/* Summary metadata */}
                    <div className="flex flex-wrap gap-3 mb-6">
                      <div className="bg-white/10 rounded-full px-3 py-1 text-sm text-white/80 flex items-center">
                        <HiDocumentText className="mr-1 w-4 h-4" />
                        {selectedSummary.file_type.charAt(0).toUpperCase() + selectedSummary.file_type.slice(1)}
                      </div>
                      {selectedSummary.category && (
                        <div className="bg-white/10 rounded-full px-3 py-1 text-sm text-white/80 flex items-center">
                          <HiTag className="mr-1 w-4 h-4" />
                          {selectedSummary.category}
                        </div>
                      )}
                      {selectedSummary.word_count && (
                        <div className="bg-white/10 rounded-full px-3 py-1 text-sm text-white/80 flex items-center">
                          <HiChartBar className="mr-1 w-4 h-4" />
                          {selectedSummary.word_count} words
                        </div>
                      )}
                      <div className="bg-white/10 rounded-full px-3 py-1 text-sm text-white/80 flex items-center">
                        <HiCalendar className="mr-1 w-4 h-4" />
                        {formatDate(selectedSummary.created_at)}
                      </div>
                    </div>
                    
                    {/* Summary content */}
                    <div className="prose prose-invert max-w-none">
                      <div dangerouslySetInnerHTML={{ 
                        __html: selectedSummary.summary.replace(/\n/g, '<br />').replace(/^## (.*$)/gm, '<h2>$1</h2>').replace(/^# (.*$)/gm, '<h1>$1</h1>')
                      }} />
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <div 
                      className="w-16 h-16 rounded-full flex items-center justify-center mb-4 opacity-40"
                      style={{ backgroundColor: `${themeColor}33` }}
                    >
                      <HiDocumentText className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-lg font-medium text-white/80 mb-2">No Summary Selected</h3>
                    <p className="text-white/50 max-w-md">
                      Select a summary from the list to view its details.
                    </p>
                  </div>
                )}
              </div>
            </GlassCard>
          </div>
        </div>
        
        {/* Additional Sections */}
        <div className="grid grid-cols-1 gap-8 mt-8 mb-8">


          {/* Summary Stats */}
          <GlassCard className="p-6">
            <div className="flex items-center mb-6">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center mr-3"
                style={{ backgroundColor: `${themeColor}33` }}
              >
                <HiChartSquareBar className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-medium text-white">Summary Insights</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-xl p-4 flex flex-col justify-center items-center text-center">
                <div className="text-3xl font-bold text-white mb-1">{statsData.totalSummaries}</div>
                <div className="text-white/60 text-sm">Total Summaries</div>
              </div>
              <div className="bg-white/5 rounded-xl p-4 flex flex-col justify-center items-center text-center">
                <div className="text-3xl font-bold text-white mb-1">{statsData.avgWordCount}</div>
                <div className="text-white/60 text-sm">Avg. Word Count</div>
              </div>
              <div className="bg-white/5 rounded-xl p-4 flex flex-col justify-center items-center text-center">
                <div className="text-3xl font-bold text-white mb-1">{statsData.mostFrequentType}</div>
                <div className="text-white/60 text-sm">Most Used Type</div>
              </div>
              <div className="bg-white/5 rounded-xl p-4 flex flex-col justify-center items-center text-center">
                <div className="text-3xl font-bold text-white mb-1">{statsData.summariesThisMonth}</div>
                <div className="text-white/60 text-sm">This Month</div>
              </div>
            </div>
            
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-white/80 text-sm font-medium">Recent Activity</h4>
                <div className="text-white/60 text-xs">Last 7 days</div>
              </div>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyActivityData.slice(0, 7)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis 
                      dataKey="date" 
                      stroke="rgba(255,255,255,0.5)" 
                      tick={{ fill: 'rgba(255,255,255,0.7)' }} 
                    />
                    <YAxis 
                      stroke="rgba(255,255,255,0.5)" 
                      tick={{ fill: 'rgba(255,255,255,0.7)' }} 
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(0,0,0,0.8)', 
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px',
                        color: 'white' 
                      }} 
                      formatter={(value) => [`${value} summaries`, 'Count']}
                    />
                    <Bar 
                      dataKey="count" 
                      name="Summaries" 
                      fill={themeColor} 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </GlassCard>
        </div>



        <div className="flex justify-center mb-8">
          <div className="bg-white/5 rounded-lg p-1 flex">
            <button 
              onClick={() => toggleDemoMode(true)}
              className={`px-6 py-2 rounded-md transition-all ${
                isDemoMode ? 'bg-white/20 text-white font-medium' : 'text-white/60 hover:text-white/90'
              }`}
            >
              Demo Mode
            </button>
            <button 
              onClick={() => toggleDemoMode(false)}
              className={`px-6 py-2 rounded-md transition-all ${
                !isDemoMode ? 'bg-white/20 text-white font-medium' : 'text-white/60 hover:text-white/90'
              }`}
            >
              Real Data
            </button>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

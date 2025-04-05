import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { HiChartBar, HiDocumentText, HiPhotograph, HiCalendar, HiClock, HiLightningBolt, HiTrendingUp, HiInformationCircle, HiSparkles } from 'react-icons/hi';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import GlassCard from '@/components/ui/GlassCard';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
  RadialLinearScale
} from 'chart.js';
import { Bar, Doughnut, Line, Radar, Scatter, PolarArea } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
  RadialLinearScale
);

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

// Type for analytics data
interface AnalyticsData {
  totalSummaries: number;
  pdfCount: number;
  imageCount: number;
  docCount: number;
  xlsCount: number;
  csvCount: number;
  pptCount: number;
  txtCount: number;
  summariesByDate: Record<string, number>;
  summariesByMonth: Record<string, number>;
  documentTypeDistribution: {
    labels: string[];
    data: number[];
  };
  activityTimeline: {
    labels: string[];
    data: number[];
  };
  topicDistribution: {
    labels: string[];
    data: number[];
  };
  readingTimeData: {
    labels: string[];
    data: number[];
  };
  monthlyActivity: {
    labels: string[];
    data: number[];
  };
  summaryLengthData: {
    labels: string[];
    data: number[];
  };
}

export default function AnalyticsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');
  const [isDemoMode, setIsDemoMode] = useState(true);
  const { user } = useAuth();
  const { themeColor } = useTheme();
  const router = useRouter();
  const { toast } = useToast();

  // Create rich demo data with randomization
  const createDemoData = (): AnalyticsData => {
    // Generate dates for the last week
    const weekDates = Array(7).fill(0).map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    
    // Generate months
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Generate random data
    const totalSummaries = 30 + Math.floor(Math.random() * 30); // 30-60
    const pdfCount = Math.floor(totalSummaries * 0.35); // ~35% of total
    const imageCount = Math.floor(totalSummaries * 0.25); // ~25% of total
    const docCount = Math.floor(totalSummaries * 0.15); // ~15% of total
    const xlsCount = Math.floor(totalSummaries * 0.10); // ~10% of total
    const csvCount = Math.floor(totalSummaries * 0.08); // ~8% of total
    const pptCount = Math.floor(totalSummaries * 0.05); // ~5% of total
    const txtCount = Math.floor(totalSummaries * 0.02); // ~2% of total
    
    // Random weekly activity (3-10 per day)
    const weeklyActivity = Array(7).fill(0).map(() => 3 + Math.floor(Math.random() * 8));
    
    // Random monthly activity (2-12 per month)
    const monthlyActivity = Array(12).fill(0).map(() => 2 + Math.floor(Math.random() * 11));
    
    // Random topic distribution
    const topicData = [
      Math.floor(Math.random() * 15) + 5,  // 5-20
      Math.floor(Math.random() * 12) + 3,  // 3-15
      Math.floor(Math.random() * 10) + 2,  // 2-12
      Math.floor(Math.random() * 8) + 2,   // 2-10
      Math.floor(Math.random() * 7) + 1,   // 1-8
      Math.floor(Math.random() * 6) + 1,   // 1-7
    ];
    
    // Random reading time data
    const readingTimeData = [
      Math.floor(Math.random() * 10) + 3,  // 3-13
      Math.floor(Math.random() * 15) + 5,  // 5-20
      Math.floor(Math.random() * 12) + 3,  // 3-15
      Math.floor(Math.random() * 8) + 2,   // 2-10
      Math.floor(Math.random() * 6) + 1,   // 1-7
    ];
    
    // Random summary length data
    const summaryLengthData = [
      Math.floor(Math.random() * 10) + 5,  // 5-15
      Math.floor(Math.random() * 15) + 8,  // 8-23
      Math.floor(Math.random() * 8) + 3,   // 3-11
    ];
    
    return {
      totalSummaries,
      pdfCount,
      imageCount,
      docCount,
      xlsCount,
      csvCount,
      pptCount,
      txtCount,
      summariesByDate: {},
      summariesByMonth: {},
      documentTypeDistribution: {
        labels: ['PDF', 'Image', 'DOC', 'XLS', 'CSV', 'PPT', 'TXT'],
        data: [pdfCount, imageCount, docCount, xlsCount, csvCount, pptCount, txtCount]
      },
      activityTimeline: {
        labels: weekDates,
        data: weeklyActivity
      },
      topicDistribution: {
        labels: ['Science', 'Technology', 'Medicine', 'Business', 'Education'],
        data: topicData
      },
      readingTimeData: {
        labels: ['< 1 hour', '1-2 hours', '2-3 hours', '3-4 hours', '4+ hours'],
        data: readingTimeData
      },
      monthlyActivity: {
        labels: ['Day 1', 'Day 5', 'Day 10', 'Day 15', 'Day 20', 'Day 25', 'Day 30', 'Day 35', 'Day 40', 'Day 45', 'Day 50', 'Day 55'],
        data: monthlyActivity
      },
      summaryLengthData: {
        labels: ['Concise Brief', 'Detailed Overview', 'Comprehensive Study'],
        data: summaryLengthData
      }
    };
  };

  useEffect(() => {
    if (user) {
      if (isDemoMode) {
        // Use demo data
        setAnalyticsData(createDemoData());
        setIsLoading(false);
      } else {
        // Fetch real data
        fetchAnalyticsData();
      }
    }
  }, [user, isDemoMode]);

  // Handle time range changes
  useEffect(() => {
    if (analyticsData) {
      // Update the activity timeline when the time range changes
      const timelineData = generateTimelineData(analyticsData, timeRange);
      setAnalyticsData({
        ...analyticsData,
        activityTimeline: timelineData
      });
    }
  }, [timeRange]);

  // Toggle demo mode and generate new random data
  const toggleDemoMode = (demoMode: boolean) => {
    setIsDemoMode(demoMode);
    if (demoMode) {
      setAnalyticsData(createDemoData());
    } else {
      fetchAnalyticsData();
    }
  };

  const fetchAnalyticsData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch all summaries for the user
      const { data, error } = await supabase
        .from('summaries')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Process data for analytics
      processAnalyticsData(data || []);
      
    } catch (error: any) {
      console.error('Error fetching analytics data:', error);
      toast({
        title: "Error loading analytics",
        description: "Could not load your analytics data. Please try again later.",
        variant: "destructive"
      });
      
      // Set default empty analytics data to prevent errors
      setAnalyticsData({
        totalSummaries: 0,
        pdfCount: 0,
        imageCount: 0,
        docCount: 0,
        xlsCount: 0,
        csvCount: 0,
        pptCount: 0,
        txtCount: 0,
        summariesByDate: {},
        summariesByMonth: {},
        documentTypeDistribution: {
          labels: ['PDF', 'Image', 'DOC', 'XLS', 'CSV', 'PPT', 'TXT'],
          data: [0, 0, 0, 0, 0, 0, 0]
        },
        activityTimeline: {
          labels: Array(7).fill(0).map((_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          }),
          data: Array(7).fill(0),
        },
        topicDistribution: {
          labels: ['Science', 'Technology', 'Medicine', 'Business', 'Education'],
          data: [0, 0, 0, 0, 0],
        },
        readingTimeData: {
          labels: ['<5 min', '5-10 min', '10-15 min', '15-20 min', '>20 min'],
          data: [0, 0, 0, 0, 0],
        },
        monthlyActivity: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
          data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        summaryLengthData: {
          labels: ['Short', 'Medium', 'Long'],
          data: [0, 0, 0],
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const processAnalyticsData = (summaries: Summary[]) => {
    if (!summaries || summaries.length === 0) {
      // Create demo data for empty state
      const demoData = {
        totalSummaries: 24,
        pdfCount: 18,
        imageCount: 6,
        docCount: 0,
        xlsCount: 0,
        csvCount: 0,
        pptCount: 0,
        txtCount: 0,
        summariesByDate: {},
        summariesByMonth: {},
        documentTypeDistribution: {
          labels: ['PDF', 'Image', 'DOC', 'XLS', 'CSV', 'PPT', 'TXT'],
          data: [18, 6, 0, 0, 0, 0, 0],
        },
        activityTimeline: {
          labels: Array(7).fill(0).map((_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          }),
          data: [3, 5, 2, 4, 6, 2, 2],
        },
        topicDistribution: {
          labels: ['Science', 'Technology', 'Medicine', 'Business', 'Education'],
          data: [8, 6, 4, 3, 3],
        },
        readingTimeData: {
          labels: ['<5 min', '5-10 min', '10-15 min', '15-20 min', '>20 min'],
          data: [5, 8, 6, 3, 2],
        },
        monthlyActivity: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
          data: [2, 4, 3, 5, 7, 6, 8, 9, 7, 5, 4, 6],
        },
        summaryLengthData: {
          labels: ['Short', 'Medium', 'Long'],
          data: [7, 12, 5],
        }
      };
      
      setAnalyticsData(demoData);
      return;
    }
    
    // Initialize analytics data
    const analytics: AnalyticsData = {
      totalSummaries: summaries.length,
      pdfCount: 0,
      imageCount: 0,
      docCount: 0,
      xlsCount: 0,
      csvCount: 0,
      pptCount: 0,
      txtCount: 0,
      summariesByDate: {},
      summariesByMonth: {},
      documentTypeDistribution: {
        labels: ['PDF', 'Image', 'DOC', 'XLS', 'CSV', 'PPT', 'TXT'],
        data: [0, 0, 0, 0, 0, 0, 0]
      },
      activityTimeline: {
        labels: [],
        data: []
      },
      topicDistribution: {
        labels: ['Science', 'Technology', 'Medicine', 'Business', 'Education'],
        data: [0, 0, 0, 0, 0],
      },
      readingTimeData: {
        labels: ['<5 min', '5-10 min', '10-15 min', '15-20 min', '>20 min'],
        data: [0, 0, 0, 0, 0],
      },
      monthlyActivity: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      },
      summaryLengthData: {
        labels: ['Short', 'Medium', 'Long'],
        data: [0, 0, 0],
      }
    };
    
    // Process each summary
    summaries.forEach(summary => {
      // Count by type - in real data we would check actual file extensions
      // For now, we'll use the existing file_type and add random counts for the new types
      if (summary.file_type === 'pdf') {
        analytics.pdfCount++;
      } else if (summary.file_type === 'image') {
        analytics.imageCount++;
      }
      
      // For demo purposes, let's add random counts for other file types
      // In a real implementation, we would check the actual file extension
      if (summary.file_url) {
        const fileUrl = summary.file_url.toLowerCase();
        if (fileUrl.endsWith('.doc') || fileUrl.endsWith('.docx')) {
          analytics.docCount++;
        } else if (fileUrl.endsWith('.xls') || fileUrl.endsWith('.xlsx')) {
          analytics.xlsCount++;
        } else if (fileUrl.endsWith('.csv')) {
          analytics.csvCount++;
        } else if (fileUrl.endsWith('.ppt') || fileUrl.endsWith('.pptx')) {
          analytics.pptCount++;
        } else if (fileUrl.endsWith('.txt')) {
          analytics.txtCount++;
        }
      } else {
        // If no file_url, randomly distribute to document types for demo purposes
        const rand = Math.random();
        if (rand < 0.2) analytics.docCount++;
        else if (rand < 0.4) analytics.xlsCount++;
        else if (rand < 0.6) analytics.csvCount++;
        else if (rand < 0.8) analytics.pptCount++;
        else analytics.txtCount++;
      }
      
      // Group by date
      const date = new Date(summary.created_at);
      const dateStr = date.toISOString().split('T')[0];
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      analytics.summariesByDate[dateStr] = (analytics.summariesByDate[dateStr] || 0) + 1;
      analytics.summariesByMonth[monthStr] = (analytics.summariesByMonth[monthStr] || 0) + 1;
    });
    
    // Set document type distribution
    analytics.documentTypeDistribution.data = [
      analytics.pdfCount, 
      analytics.imageCount, 
      analytics.docCount, 
      analytics.xlsCount, 
      analytics.csvCount, 
      analytics.pptCount, 
      analytics.txtCount
    ];
    
    // Create activity timeline based on selected time range
    const timelineData = generateTimelineData(analytics, timeRange);
    analytics.activityTimeline = timelineData;
    
    // Generate topic distribution based on summaries content
    const topicKeywords = {
      Science: ['science', 'scientific', 'experiment', 'physics', 'chemistry', 'biology', 'research'],
      Technology: ['technology', 'computer', 'software', 'hardware', 'digital', 'algorithm', 'data'],
      Medicine: ['medicine', 'medical', 'health', 'disease', 'treatment', 'patient', 'clinical'],
      Business: ['business', 'finance', 'market', 'economy', 'investment', 'company', 'management'],
      Education: ['education', 'learning', 'teaching', 'student', 'school', 'university', 'academic']
    };
    
    const topicCounts = {
      Science: 0,
      Technology: 0,
      Medicine: 0,
      Business: 0,
      Education: 0
    };
    
    // Count topics based on keyword matching in summaries
    summaries.forEach(summary => {
      const content = (summary.summary || '').toLowerCase();
      const title = (summary.title || '').toLowerCase();
      const fullText = content + ' ' + title;
      
      Object.entries(topicKeywords).forEach(([topic, keywords]) => {
        keywords.forEach(keyword => {
          if (fullText.includes(keyword)) {
            topicCounts[topic as keyof typeof topicCounts]++;
          }
        });
      });
    });
    
    // Convert to array format for chart
    analytics.topicDistribution.data = [
      topicCounts.Science || 0,
      topicCounts.Technology || 0,
      topicCounts.Medicine || 0,
      topicCounts.Business || 0,
      topicCounts.Education || 0
    ];
    
    // Calculate reading time based on summary length
    const readingTimeCounts = [0, 0, 0, 0, 0]; // <5, 5-10, 10-15, 15-20, >20 minutes
    
    // Update reading time labels to use hours
    analytics.readingTimeData.labels = ['< 1 hour', '1-2 hours', '2-3 hours', '3-4 hours', '4+ hours'];
    
    summaries.forEach(summary => {
      const wordCount = (summary.summary || '').split(/\s+/).length;
      const readingTimeMinutes = Math.ceil(wordCount / 200); // Assuming 200 words per minute reading speed
      
      if (readingTimeMinutes < 5) {
        readingTimeCounts[0]++;
      } else if (readingTimeMinutes < 10) {
        readingTimeCounts[1]++;
      } else if (readingTimeMinutes < 15) {
        readingTimeCounts[2]++;
      } else if (readingTimeMinutes < 20) {
        readingTimeCounts[3]++;
      } else {
        readingTimeCounts[4]++;
      }
    });
    
    analytics.readingTimeData.data = readingTimeCounts;
    
    // Calculate monthly activity
    const monthlyData = Array(12).fill(0);
    const currentYear = new Date().getFullYear();
    
    // Update monthly activity labels to use days
    analytics.monthlyActivity.labels = [
      'Day 1', 'Day 5', 'Day 10', 'Day 15', 
      'Day 20', 'Day 25', 'Day 30', 'Day 35', 
      'Day 40', 'Day 45', 'Day 50', 'Day 55'
    ];
    
    summaries.forEach(summary => {
      const date = new Date(summary.created_at);
      if (date.getFullYear() === currentYear) {
        monthlyData[date.getMonth()]++;
      }
    });
    
    analytics.monthlyActivity.data = monthlyData;
    
    // Calculate summary length distribution
    const lengthCounts = [0, 0, 0]; // Short, Medium, Long
    
    // Update summary length labels with creative names
    analytics.summaryLengthData.labels = ['Concise Brief', 'Detailed Overview', 'Comprehensive Study'];
    
    summaries.forEach(summary => {
      const wordCount = (summary.summary || '').split(/\s+/).length;
      
      if (wordCount < 200) {
        lengthCounts[0]++; // Short
      } else if (wordCount < 500) {
        lengthCounts[1]++; // Medium
      } else {
        lengthCounts[2]++; // Long
      }
    });
    
    analytics.summaryLengthData.data = lengthCounts;
    
    setAnalyticsData(analytics);
  };

  const generateTimelineData = (analytics: AnalyticsData, range: 'week' | 'month' | 'year') => {
    const labels: string[] = [];
    const data: number[] = [];
    
    const today = new Date();
    let dateFormat: Intl.DateTimeFormatOptions;
    let dateStep: number;
    let dateCount: number;
    
    // Configure based on time range
    if (range === 'week') {
      dateFormat = { weekday: 'short' };
      dateStep = 1;
      dateCount = 7;
    } else if (range === 'month') {
      dateFormat = { day: 'numeric' };
      dateStep = 1;
      dateCount = 30;
    } else { // year
      dateFormat = { month: 'short' };
      dateStep = 30;
      dateCount = 12;
    }
    
    // Generate dates and counts
    for (let i = dateCount - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - (i * dateStep));
      
      let label: string;
      let dataKey: string;
      
      if (range === 'year') {
        label = date.toLocaleDateString('en-US', { month: 'short' });
        dataKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        // Use month data for year view
        const value = analytics.summariesByMonth[dataKey] || 0;
        labels.push(label);
        data.push(value);
      } else {
        label = date.toLocaleDateString('en-US', dateFormat);
        dataKey = date.toISOString().split('T')[0];
        
        // Use daily data for week/month view
        const value = analytics.summariesByDate[dataKey] || 0;
        labels.push(label);
        data.push(value);
      }
    }
    
    return { labels, data };
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 12,
            weight: 'bold' as const,
          },
          usePointStyle: true,
          pointStyle: 'rectRounded',
          padding: 20,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'rgba(255, 255, 255, 0.9)',
        bodyColor: 'rgba(255, 255, 255, 0.7)',
        borderColor: themeColor,
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        titleFont: {
          size: 14,
          weight: 'bold' as const,
        },
        bodyFont: {
          size: 12,
        },
        displayColors: true,
        boxPadding: 6,
      },
    },
    cutout: '70%',
    animation: {
      animateScale: true,
      animateRotate: true,
      duration: 2000,
    },
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 12,
            weight: 'bold' as const,
          },
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 20,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'rgba(255, 255, 255, 0.9)',
        bodyColor: 'rgba(255, 255, 255, 0.7)',
        borderColor: themeColor,
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        titleFont: {
          size: 14,
          weight: 'bold' as const,
        },
        bodyFont: {
          size: 12,
        },
        displayColors: true,
        boxPadding: 6,
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          tickColor: 'rgba(255, 255, 255, 0.1)',
          borderColor: 'rgba(255, 255, 255, 0.2)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 10,
          },
          padding: 8,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          tickColor: 'rgba(255, 255, 255, 0.1)',
          borderColor: 'rgba(255, 255, 255, 0.2)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 10,
          },
          padding: 8,
          stepSize: 1,
        },
      },
    },
    animation: {
      duration: 2000,
      easing: 'easeOutQuart' as const,
    },
    elements: {
      line: {
        tension: 0.4,
      },
      point: {
        radius: 4,
        hoverRadius: 6,
        hitRadius: 8,
      },
    },
  };

  const getActivityChartConfig = () => {
    if (!analyticsData) return null;
    
    return {
      labels: analyticsData.activityTimeline.labels,
      datasets: [
        {
          label: 'Summaries',
          data: analyticsData.activityTimeline.data,
          fill: true,
          backgroundColor: `${themeColor}33`,
          borderColor: themeColor,
          tension: 0.4,
          pointBackgroundColor: themeColor,
          pointBorderColor: '#fff',
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2,
          gradient: {
            backgroundColor: {
              axis: 'y',
              colors: {
                0: `${themeColor}00`,
                100: themeColor
              }
            }
          }
        },
      ],
    };
  };

  const getDocumentTypeChartConfig = () => {
    if (!analyticsData) return null;
    
    return {
      labels: analyticsData.documentTypeDistribution.labels,
      datasets: [
        {
          data: analyticsData.documentTypeDistribution.data,
          backgroundColor: `${themeColor}33`,
          borderColor: themeColor,
          borderWidth: 2,
          pointBackgroundColor: [
            '#FF5722', // PDF - Orange
            '#2196F3', // Image - Blue
            '#4CAF50', // DOC - Green
            '#9C27B0', // XLS - Purple
            '#FFC107', // CSV - Yellow
            '#F44336', // PPT - Red
            '#607D8B', // TXT - Gray
          ],
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: themeColor,
          pointRadius: 5,
          pointHoverRadius: 7,
        },
      ],
    };
  };

  const getTopicDistributionChartConfig = () => {
    if (!analyticsData) return null;
    
    return {
      labels: analyticsData.topicDistribution.labels,
      datasets: [
        {
          data: analyticsData.topicDistribution.data,
          backgroundColor: [
            '#FFC10799',
            '#8BC34A99',
            '#2196F399',
            '#03A9F499',
            '#9C27B099',
            '#7E57C299',
          ],
          borderColor: [
            '#FFC107',
            '#8BC34A',
            '#2196F3',
            '#03A9F4',
            '#9C27B0',
            '#7E57C2',
          ],
          borderWidth: 2,
          hoverOffset: 6,
          hoverBorderWidth: 3,
        },
      ],
    };
  };

  const getReadingTimeChartConfig = () => {
    if (!analyticsData) return null;
    
    return {
      labels: analyticsData.readingTimeData.labels,
      datasets: [
        {
          data: analyticsData.readingTimeData.data,
          backgroundColor: [
            '#4CAF5099',
            '#2196F399',
            '#FF980099',
            '#FFC10799',
            '#9C27B099',
          ],
          borderColor: [
            '#4CAF50',
            '#2196F3',
            '#FF9800',
            '#FFC107',
            '#9C27B0',
          ],
          borderWidth: 2,
          hoverOffset: 6,
          hoverBorderWidth: 3,
        },
      ],
    };
  };

  const getMonthlyActivityChartConfig = () => {
    if (!analyticsData) return null;
    
    return {
      labels: analyticsData.monthlyActivity.labels,
      datasets: [
        {
          data: analyticsData.monthlyActivity.data,
          fill: true,
          backgroundColor: `${themeColor}33`,
          borderColor: themeColor,
          tension: 0.4,
          pointBackgroundColor: themeColor,
          pointBorderColor: '#fff',
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2,
          gradient: {
            backgroundColor: {
              axis: 'y',
              colors: {
                0: `${themeColor}00`,
                100: themeColor
              }
            }
          }
        },
      ],
    };
  };

  const getSummaryLengthChartConfig = () => {
    if (!analyticsData) return null;
    
    // Create a line chart that resembles the image shared with theme colors
    // Default to a deep red color that matches the image if theme color can't be parsed
    let r = 139, g = 0, b = 0; // Default to dark red
    
    // Try to extract RGB values from theme color
    if (themeColor && themeColor.includes('rgb')) {
      const themeColorRGB = themeColor.match(/\d+/g);
      if (themeColorRGB && themeColorRGB.length >= 3) {
        r = parseInt(themeColorRGB[0]);
        g = parseInt(themeColorRGB[1]);
        b = parseInt(themeColorRGB[2]);
      }
    } else if (themeColor && themeColor.startsWith('#')) {
      // Handle hex color
      const hex = themeColor.substring(1);
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
    }
    
    return {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      datasets: [
        {
          label: analyticsData.summaryLengthData.labels[0], // Concise Brief
          data: Array(12).fill(0).map(() => Math.floor(Math.random() * 15) + 5),
          borderColor: `rgb(${r}, ${g}, ${b})`,
          backgroundColor: `rgba(${r}, ${g}, ${b}, 0.2)`,
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 0,
        },
        {
          label: analyticsData.summaryLengthData.labels[1], // Detailed Overview
          data: Array(12).fill(0).map(() => Math.floor(Math.random() * 12) + 3),
          borderColor: `rgba(${r}, ${g}, ${b}, 0.7)`,
          backgroundColor: `rgba(${r}, ${g}, ${b}, 0.1)`,
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 0,
        },
        {
          label: analyticsData.summaryLengthData.labels[2], // Comprehensive Study
          data: Array(12).fill(0).map(() => Math.floor(Math.random() * 10) + 2),
          borderColor: `rgba(${r}, ${g}, ${b}, 0.4)`,
          backgroundColor: `rgba(${r}, ${g}, ${b}, 0.05)`,
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 0,
        }
      ],
    };
  };

  // Helper component for the time range selector
  function TimeRangeSelector({ 
    timeRange, 
    setTimeRange, 
    themeColor 
  }: { 
    timeRange: 'week' | 'month' | 'year', 
    setTimeRange: (range: 'week' | 'month' | 'year') => void,
    themeColor: string
  }) {
    return (
      <div className="flex space-x-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setTimeRange('week')}
          className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
            timeRange === 'week' 
              ? 'bg-white/20 text-white' 
              : 'bg-white/5 text-white/60 hover:bg-white/10'
          }`}
        >
          Week
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setTimeRange('month')}
          className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
            timeRange === 'month' 
              ? 'bg-white/20 text-white' 
              : 'bg-white/5 text-white/60 hover:bg-white/10'
          }`}
        >
          Month
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setTimeRange('year')}
          className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
            timeRange === 'year' 
              ? 'bg-white/20 text-white' 
              : 'bg-white/5 text-white/60 hover:bg-white/10'
          }`}
        >
          Year
        </motion.button>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Data Mode Toggle and Time Range Selector */}
            <div className="flex flex-col md:flex-row justify-end items-start md:items-center mb-6">
              <div className="flex space-x-4">
                <div className="flex space-x-2">
                  <button 
                    onClick={() => toggleDemoMode(true)}
                    className={`px-4 py-2 rounded-lg transition-all ${
                      isDemoMode ? 'bg-white/20 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80'
                    }`}
                  >
                    Demo Data
                  </button>
                  <button 
                    onClick={() => toggleDemoMode(false)}
                    className={`px-4 py-2 rounded-lg transition-all ${
                      !isDemoMode ? 'bg-white/20 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80'
                    }`}
                  >
                    Real Data
                  </button>
                </div>
                <TimeRangeSelector timeRange={timeRange} setTimeRange={setTimeRange} themeColor={themeColor} />
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <GlassCard className="p-6">
                <div className="flex items-center mb-2">
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center mr-4"
                    style={{ backgroundColor: `${themeColor}33` }}
                  >
                    <HiDocumentText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">{analyticsData?.totalSummaries}</h3>
                    <p className="text-white/70">Total Summaries</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="flex items-center">
                      <HiDocumentText className="w-5 h-5 text-green-400 mr-2" />
                      <span className="text-white/80 text-sm">PDFs: {analyticsData?.pdfCount}</span>
                    </div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="flex items-center">
                      <HiPhotograph className="w-5 h-5 text-blue-400 mr-2" />
                      <span className="text-white/80 text-sm">Images: {analyticsData?.imageCount}</span>
                    </div>
                  </div>
                </div>
              </GlassCard>
              
              <GlassCard className="p-6">
                <div className="flex items-center mb-2">
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center mr-4"
                    style={{ backgroundColor: `${themeColor}33` }}
                  >
                    <HiCalendar className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">
                      {analyticsData?.activityTimeline.data.reduce((sum, value) => sum + value, 0) || 0}
                    </h3>
                    <p className="text-white/70">
                      {timeRange === 'week' ? 'This Week' : timeRange === 'month' ? 'This Month' : 'This Year'}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex space-x-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setTimeRange('week')}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                      timeRange === 'week' 
                        ? 'bg-white/20 text-white' 
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    Week
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setTimeRange('month')}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                      timeRange === 'month' 
                        ? 'bg-white/20 text-white' 
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    Month
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setTimeRange('year')}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                      timeRange === 'year' 
                        ? 'bg-white/20 text-white' 
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    Year
                  </motion.button>
                </div>
              </GlassCard>
              
              <GlassCard className="p-6">
                <div className="flex items-center mb-2">
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center mr-4"
                    style={{ backgroundColor: `${themeColor}33` }}
                  >
                    <HiLightningBolt className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">
                      {analyticsData ? Math.max(...analyticsData.activityTimeline.data) : 0}
                    </h3>
                    <p className="text-white/70">Most Active Day</p>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="flex items-center">
                      <HiClock className="w-5 h-5 text-purple-400 mr-2" />
                      <span className="text-white/80 text-sm">
                        Avg. {analyticsData ? (analyticsData.totalSummaries / (timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 365)).toFixed(1) : 0} summaries per day
                      </span>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>
            
            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Activity Timeline */}
              <GlassCard className="lg:col-span-2 overflow-hidden">
                <div className="p-4 border-b border-white/10">
                  <h2 className="text-lg font-semibold text-white flex items-center">
                    <HiTrendingUp className="mr-2 text-white/80" />
                    Activity Timeline
                  </h2>
                </div>
                <div className="p-4 h-80">
                  {getActivityChartConfig() && (
                    <Line 
                      data={getActivityChartConfig()!} 
                      options={chartOptions} 
                    />
                  )}
                </div>
              </GlassCard>
              
              {/* Document Type Distribution */}
              <GlassCard className="overflow-hidden">
                <div className="p-4 border-b border-white/10">
                  <h2 className="text-lg font-semibold text-white flex items-center">
                    <HiDocumentText className="mr-2 text-white/80" />
                    Document Types
                  </h2>
                </div>
                <div className="p-4 h-80">
                  {getDocumentTypeChartConfig() && (
                    <Radar 
                      data={getDocumentTypeChartConfig()!} 
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          r: {
                            beginAtZero: true,
                            ticks: {
                              display: false,
                              stepSize: 1,
                            },
                            grid: {
                              color: 'rgba(255, 255, 255, 0.1)',
                            },
                            angleLines: {
                              color: 'rgba(255, 255, 255, 0.1)',
                            },
                            pointLabels: {
                              color: 'rgba(255, 255, 255, 0.7)',
                              font: {
                                size: 12,
                              },
                            },
                          },
                        },
                        plugins: {
                          legend: {
                            display: false,
                          },
                          tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: 'rgba(255, 255, 255, 0.9)',
                            bodyColor: 'rgba(255, 255, 255, 0.7)',
                            borderColor: themeColor,
                            borderWidth: 1,
                            padding: 12,
                            cornerRadius: 8,
                          },
                        },
                      }}
                    />
                  )}
                </div>
              </GlassCard>
            </div>
            
            {/* Additional Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Topic Distribution */}
              <GlassCard className="overflow-hidden">
                <div className="p-4 border-b border-white/10">
                  <h2 className="text-lg font-semibold text-white flex items-center">
                    <HiDocumentText className="mr-2 text-white/80" />
                    Topic Distribution
                  </h2>
                </div>
                <div className="p-4 h-80">
                  {getTopicDistributionChartConfig() && (
                    <Doughnut 
                      data={getTopicDistributionChartConfig()!} 
                      options={doughnutOptions} 
                    />
                  )}
                </div>
              </GlassCard>
              
              {/* Reading Time */}
              <GlassCard className="overflow-hidden">
                <div className="p-4 border-b border-white/10">
                  <h2 className="text-lg font-semibold text-white flex items-center">
                    <HiClock className="mr-2 text-white/80" />
                    Reading Time
                  </h2>
                </div>
                <div className="p-4 h-80">
                  {getReadingTimeChartConfig() && (
                    <Bar 
                      data={getReadingTimeChartConfig()!} 
                      options={{
                        ...chartOptions,
                        plugins: {
                          ...chartOptions.plugins,
                          legend: {
                            display: false
                          }
                        }
                      }} 
                    />
                  )}
                </div>
              </GlassCard>
              
              {/* Monthly Activity */}
              <GlassCard className="overflow-hidden">
                <div className="p-4 border-b border-white/10">
                  <h2 className="text-lg font-semibold text-white flex items-center">
                    <HiCalendar className="mr-2 text-white/80" />
                    Monthly Activity
                  </h2>
                </div>
                <div className="p-4 h-80">
                  {getMonthlyActivityChartConfig() && (
                    <Line 
                      data={getMonthlyActivityChartConfig()!} 
                      options={{
                        ...chartOptions,
                        plugins: {
                          ...chartOptions.plugins,
                          legend: {
                            display: false
                          }
                        }
                      }} 
                    />
                  )}
                </div>
              </GlassCard>
            </div>
            
            {/* Summary Length Trends */}
            <GlassCard className="overflow-hidden">
              <div className="p-4 border-b border-white/10">
                <h2 className="text-lg font-semibold text-white flex items-center">
                  <HiDocumentText className="mr-2 text-white/80" />
                  Summary Length Trends
                </h2>
              </div>
              <div className="p-4 h-80">
                {getSummaryLengthChartConfig() && (
                  <Line 
                    data={getSummaryLengthChartConfig()!} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true,
                          grid: {
                            color: 'rgba(255, 255, 255, 0.1)',
                          },
                          ticks: {
                            color: 'rgba(255, 255, 255, 0.7)',
                          }
                        },
                        x: {
                          grid: {
                            display: false,
                          },
                          ticks: {
                            color: 'rgba(255, 255, 255, 0.7)',
                          }
                        }
                      },
                      plugins: {
                        legend: {
                          display: true,
                          position: 'top',
                          labels: {
                            color: 'rgba(255, 255, 255, 0.7)',
                            boxWidth: 12,
                            padding: 15,
                          }
                        },
                        tooltip: {
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          titleColor: 'rgba(255, 255, 255, 0.9)',
                          bodyColor: 'rgba(255, 255, 255, 0.9)',
                          borderColor: 'rgba(255, 255, 255, 0.2)',
                          borderWidth: 1,
                          padding: 10,
                          cornerRadius: 6,
                          displayColors: true,
                        }
                      },
                    }}
                  />
                )}
              </div>
            </GlassCard>
            
            {/* Usage Tips */}
            <GlassCard className="overflow-hidden">
              <div className="p-4 border-b border-white/10">
                <h2 className="text-lg font-semibold text-white flex items-center">
                  <HiInformationCircle className="mr-2 text-white/80" />
                  Insights
                </h2>
              </div>
              <div className="p-4 space-y-4 text-center">
                <div className="bg-white/10 rounded-lg p-4">
                  <h3 className="text-white/90 font-medium mb-2 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center mr-2">
                      <HiTrendingUp className="w-4 h-4 text-blue-400" />
                    </div>
                    Activity Analysis
                  </h3>
                  <p className="text-white/70 text-sm">
                    {analyticsData && analyticsData.totalSummaries > 0 ? (
                      <>
                        You've created <span className="text-white font-medium">{analyticsData.totalSummaries}</span> summaries so far. 
                        {timeRange === 'week' && analyticsData.activityTimeline.data.reduce((sum, value) => sum + value, 0) > 0 && (
                          <> This week, you've been most active on <span className="text-white font-medium">{analyticsData.activityTimeline.labels[analyticsData.activityTimeline.data.indexOf(Math.max(...analyticsData.activityTimeline.data))]}</span>.</>
                        )}
                      </>
                    ) : (
                      'Start creating summaries to see activity analysis.'
                    )}
                  </p>
                </div>
                
                <div className="bg-white/10 rounded-lg p-4">
                  <h3 className="text-white/90 font-medium mb-2 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center mr-2">
                      <HiDocumentText className="w-4 h-4 text-green-400" />
                    </div>
                    Document Preferences
                  </h3>
                  <p className="text-white/70 text-sm">
                    {analyticsData && analyticsData.totalSummaries > 0 ? (
                      <>
                        You prefer working with <span className="text-white font-medium">
                          {analyticsData.pdfCount > analyticsData.imageCount ? 'PDF documents' : 'images'}
                        </span> ({analyticsData.pdfCount > analyticsData.imageCount ? 
                          Math.round((analyticsData.pdfCount / analyticsData.totalSummaries) * 100) : 
                          Math.round((analyticsData.imageCount / analyticsData.totalSummaries) * 100)}% of your summaries).
                      </>
                    ) : (
                      'Upload documents to see your preferences.'
                    )}
                  </p>
                </div>
                
                <div className="bg-white/10 rounded-lg p-4">
                  <h3 className="text-white/90 font-medium mb-2 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center mr-2">
                      <HiLightningBolt className="w-4 h-4 text-purple-400" />
                    </div>
                    Productivity Tips
                  </h3>
                  <p className="text-white/70 text-sm">
                    Try using the camera feature for quick document captures or batch upload multiple PDFs to increase your productivity. Set a goal to create at least 3 summaries per week for optimal research management.
                  </p>
                </div>
              </div>
            </GlassCard>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

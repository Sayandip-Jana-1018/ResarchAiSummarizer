import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { 
  HiSparkles, 
  HiCheck, 
  HiOutlineStar, 
  HiOutlineCash, 
  HiOutlineChip,
  HiOutlineLightningBolt,
  HiOutlineShieldCheck,
  HiOutlineRefresh,
  HiOutlineX,
  HiOutlineCheck,
  HiOutlineDocumentText,
  HiOutlineClock,
  HiOutlineChartBar,
  HiOutlineSupport,
  HiOutlineDatabase,
  HiOutlineCog,
  HiOutlineChatAlt,
  HiOutlineSparkles
} from 'react-icons/hi';
import { SUBSCRIPTION_UPDATED_EVENT } from '@/hooks/useSubscription';
import GlassCard from '@/components/ui/GlassCard';

// Plan feature types
interface PlanFeature {
  name: string;
  included: boolean;
  icon?: React.ReactNode;
  description?: string;
}

// Plan types
interface Plan {
  id: string;
  name: string;
  icon: React.ReactNode;
  price: number;
  color: string;
  features: PlanFeature[];
  aiModels: string[];
  buttonText: string;
}

export default function PremiumPage() {
  const { user } = useAuth();
  const { themeColor } = useTheme();
  const router = useRouter();
  const { toast } = useToast();
  const [isYearly, setIsYearly] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true);

  // Define plans
  const plans: Plan[] = [
    {
      id: 'basic', // Maps to 'basic' in database
      name: 'BRONZE',
      icon: <div className="w-16 h-16 rounded-full bg-gradient-to-b from-amber-300 to-amber-600 flex items-center justify-center relative overflow-hidden group-hover:shadow-amber-500/50 group-hover:shadow-lg transition-all duration-500"><div className="absolute inset-0 bg-gradient-to-r from-amber-300/0 via-amber-300/30 to-amber-300/0 animate-shimmer"></div><HiOutlineStar className="w-8 h-8 text-amber-900 relative z-10" /></div>,
      price: isYearly ? 0 : 0,
      color: '#CD7F32', // Bronze
      features: [
        { name: 'Gemini Basic Access', included: true, icon: <HiSparkles className="text-amber-400" />, description: 'Access to Google Gemini Basic AI capabilities' },
        { name: 'GPT-3.5 Integration', included: true, icon: <HiOutlineChatAlt className="text-green-400" />, description: 'Integration with OpenAI GPT-3.5 model' },
        { name: 'Claude 2.5 Support', included: true, icon: <HiOutlineCog className="text-blue-400" />, description: 'Support for Anthropic Claude 2.5 AI' },
        { name: 'Grok 2 Capabilities', included: true, icon: <HiOutlineLightningBolt className="text-purple-400" />, description: 'Access to xAI Grok 2 features' },
        { name: '10 Summaries per day', included: true, icon: <HiOutlineDocumentText className="text-amber-500" />, description: 'Generate up to 10 research summaries daily' },
        { name: 'Standard Processing Speed', included: true, icon: <HiOutlineClock className="text-blue-500" />, description: 'Regular processing times for your summaries' },
        { name: 'Basic Analytics', included: true, icon: <HiOutlineChartBar className="text-green-500" />, description: 'Essential usage statistics and insights' },
        { name: 'Email Support', included: true, icon: <HiOutlineSupport className="text-purple-500" />, description: '24-hour email response time' },
        { name: 'Advanced AI Models', included: false, icon: <HiOutlineDatabase className="text-gray-400" />, description: 'Access to premium AI models' },
        { name: 'Unlimited Summaries', included: false, icon: <HiOutlineDocumentText className="text-gray-400" />, description: 'No daily limit on summary generation' },
        { name: 'Priority Processing', included: false, icon: <HiOutlineLightningBolt className="text-gray-400" />, description: 'Faster processing times for all requests' },
      ],
      aiModels: ['Gemini Basic', 'GPT-3.5', 'Claude 2.5', 'Grok 2'],
      buttonText: 'Start for Free'
    },
    {
      id: 'silver', // Maps to 'silver' in database // Matches database constraint
      name: 'SILVER',
      icon: <div className="w-16 h-16 rounded-full bg-gradient-to-b from-gray-300 to-gray-500 flex items-center justify-center relative overflow-hidden group-hover:shadow-gray-400/50 group-hover:shadow-lg transition-all duration-500"><div className="absolute inset-0 bg-gradient-to-r from-gray-300/0 via-gray-300/30 to-gray-300/0 animate-shimmer"></div><HiOutlineChip className="w-8 h-8 text-gray-800 relative z-10" /></div>,
      price: isYearly ? 4990 : 499,
      color: '#C0C0C0', // Silver
      features: [
        { name: 'Gemini Basic Access', included: true, icon: <HiSparkles className="text-amber-400" />, description: 'Access to Google Gemini Basic AI capabilities' },
        { name: 'GPT-3.5 Integration', included: true, icon: <HiOutlineChatAlt className="text-green-400" />, description: 'Integration with OpenAI GPT-3.5 model' },
        { name: 'Claude 2.5 Support', included: true, icon: <HiOutlineCog className="text-blue-400" />, description: 'Support for Anthropic Claude 2.5 AI' },
        { name: 'Grok 2 Capabilities', included: true, icon: <HiOutlineLightningBolt className="text-purple-400" />, description: 'Access to xAI Grok 2 features' },
        { name: 'Gemini 2.0 Advanced', included: true, icon: <HiSparkles className="text-amber-500" />, description: 'Access to advanced Google Gemini 2.0 capabilities' },
        { name: 'GPT-4 Integration', included: true, icon: <HiOutlineChatAlt className="text-green-500" />, description: 'Full access to OpenAI GPT-4 capabilities' },
        { name: 'Claude 3.5 Haiku', included: true, icon: <HiOutlineCog className="text-blue-500" />, description: 'Support for Anthropic Claude 3.5 Haiku AI' },
        { name: 'Grok 3 Capabilities', included: true, icon: <HiOutlineLightningBolt className="text-purple-500" />, description: 'Access to advanced xAI Grok 3 features' },
        { name: '50 Summaries per day', included: true, icon: <HiOutlineDocumentText className="text-silver-500" />, description: 'Generate up to 50 research summaries daily' },
        { name: 'Fast Processing Speed', included: true, icon: <HiOutlineClock className="text-blue-500" />, description: '3x faster processing times' },
        { name: 'Advanced Analytics', included: true, icon: <HiOutlineChartBar className="text-green-500" />, description: 'Comprehensive usage statistics and insights' },
        { name: 'Priority Email Support', included: true, icon: <HiOutlineSupport className="text-purple-500" />, description: '8-hour email response time' },
        { name: 'Unlimited Summaries', included: false, icon: <HiOutlineDocumentText className="text-gray-400" />, description: 'No daily limit on summary generation' },
        { name: 'Ultra-fast Processing', included: false, icon: <HiOutlineLightningBolt className="text-gray-400" />, description: 'Fastest possible processing times' },
      ],
      aiModels: ['Gemini 2.0', 'GPT-4', 'Claude 3.5 Haiku', 'Grok 3'],
      buttonText: 'Upgrade to Pro'
    },
    {
      id: 'gold', // Maps to 'gold' in database // Matches database constraint
      name: 'GOLD',
      icon: <div className="w-16 h-16 rounded-full bg-gradient-to-b from-yellow-300 to-yellow-600 flex items-center justify-center relative overflow-hidden group-hover:shadow-yellow-500/50 group-hover:shadow-lg transition-all duration-500"><div className="absolute inset-0 bg-gradient-to-r from-yellow-300/0 via-yellow-300/30 to-yellow-300/0 animate-shimmer"></div><HiOutlineCash className="w-8 h-8 text-yellow-900 relative z-10" /></div>,
      price: isYearly ? 9990 : 999,
      color: '#FFD700', 
      features: [
        { name: 'All Silver Features', included: true, icon: <HiOutlineCheck className="text-silver-400" />, description: 'Everything in the Silver plan plus more' },
        { name: 'GPT-4 Turbo', included: true, icon: <HiOutlineChatAlt className="text-yellow-400" />, description: 'Access to OpenAI GPT-4 Turbo model' },
        { name: 'Claude 3.5 Opus', included: true, icon: <HiOutlineCog className="text-blue-500" />, description: 'Premium access to Anthropic Claude 3.5 Opus' },
        { name: 'Gemini Ultra', included: true, icon: <HiSparkles className="text-amber-500" />, description: 'Access to Google Gemini Ultra model' },
        { name: 'Grok 3 Advanced', included: true, icon: <HiOutlineLightningBolt className="text-purple-500" />, description: 'Premium access to xAI Grok 3 Advanced' },
        { name: 'Unlimited Summaries', included: true, icon: <HiOutlineDocumentText className="text-yellow-500" />, description: 'No limits on summary generation' },
        { name: 'Ultra-fast Processing', included: true, icon: <HiOutlineLightningBolt className="text-yellow-500" />, description: 'Fastest processing times for all requests' },
        { name: 'Premium Analytics', included: true, icon: <HiOutlineChartBar className="text-green-500" />, description: 'Enterprise-grade analytics and insights' },
        { name: 'Dedicated Support', included: true, icon: <HiOutlineSupport className="text-purple-500" />, description: '4-hour response time and dedicated support' },
        { name: 'Team Collaboration', included: true, icon: <HiOutlineChatAlt className="text-blue-500" />, description: 'Share and collaborate with team members' },
        { name: 'Custom AI Tuning', included: true, icon: <HiOutlineCog className="text-yellow-500" />, description: 'Customize AI models for your specific needs' },
        { name: 'Optimized Python Libraries', included: true, icon: <HiOutlineCog className="text-blue-500" />, description: 'Access to optimized Python libraries for AI' },
        { name: 'API Access', included: true, icon: <HiOutlineDatabase className="text-green-500" />, description: 'Full API access for integration with your systems' },
      ],
      aiModels: ['GPT-4 Turbo', 'Claude 3.5 Opus', 'Gemini Ultra', 'Grok 3 Advanced'],
      buttonText: 'Get Ultimate'
    }
  ];

  // Function to save subscription data without requiring payment completion
  const saveSubscriptionData = async (userId: string, plan: Plan, yearly: boolean = false) => {
    console.log('Saving subscription data without payment...');
    return createSubscription(userId, plan, 'test_payment_' + Date.now(), yearly);
  };

  // Function to create subscription in database
  const createSubscription = async (userId: string, plan: Plan, paymentId: string = 'test_payment', yearly: boolean = false) => {
    console.log('Creating subscription in database...');
    
    try {
      // First, deactivate any existing active subscriptions
      const { data: existingSubscriptions, error: fetchError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('active', true);

      if (fetchError) {
        console.error('Error fetching existing subscriptions:', fetchError);
        throw fetchError;
      }

      // Deactivate all existing active subscriptions
      if (existingSubscriptions && existingSubscriptions.length > 0) {
        const { error: updateError } = await supabase
          .from('user_subscriptions')
          .update({ active: false, updated_at: new Date().toISOString() })
          .eq('user_id', userId)
          .eq('active', true);

        if (updateError) {
          console.error('Error deactivating existing subscriptions:', updateError);
          throw updateError;
        }
      }

      // Create new subscription data
      const now = new Date().toISOString();
      const endDate = new Date(Date.now() + (yearly ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString();
      
      // Validate plan ID
      let planId = plan.id;
      if (!['basic', 'silver', 'gold'].includes(planId)) {
        console.warn(`Invalid plan ID: ${planId}. Defaulting to 'basic'`);
        planId = 'basic';
      }
      
      // Create new subscription
      const subscriptionData = {
        user_id: userId,
        plan: planId,
        payment_id: paymentId,
        amount: plan.price,
        active: true,
        is_yearly: yearly,
        start_date: now,
        end_date: endDate,
        created_at: now,
        updated_at: now
      };

      // Insert new subscription
      const { data: newSubscription, error: insertError } = await supabase
        .from('user_subscriptions')
        .insert([subscriptionData])
        .select()
        .single();
      
      if (insertError) {
        console.error('Error creating new subscription:', insertError);
        throw insertError;
      }

      // Show success toast
      toast({
        title: "Subscription Updated",
        description: `Your plan has been changed to ${plan.name}!`,
        variant: "default"
      });
      
      // Update UI state
      setCurrentPlan(plan.id);
      setIsProcessing(false);
      
      // Force refresh subscription data across the app
      window.dispatchEvent(new CustomEvent(SUBSCRIPTION_UPDATED_EVENT));
      
      return newSubscription;
    } catch (error: any) {
      console.error('Error managing subscription:', error);
      toast({
        title: "Subscription Error",
        description: error.message || 'Failed to update subscription',
        variant: "destructive"
      });
      setIsProcessing(false);
      return null;
    }
  };

  // Fetch current plan from Supabase
  React.useEffect(() => {
    const fetchCurrentPlan = async () => {
      if (user?.id) {
        setIsLoadingSubscription(true);
        try {
          // Fetch the latest subscription from Supabase
          const { data, error } = await supabase
            .from('user_subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1);
          
          if (error) {
            console.error('Error fetching subscription:', error);
            toast({
              title: 'Error',
              description: 'Failed to fetch your subscription details',
              variant: 'destructive'
            });
          } else if (data && data.length > 0) {
            // Set the current plan from the database
            setCurrentPlan(data[0].plan);
            console.log('Current subscription plan:', data[0].plan);
          } else {
            // No subscription found
            setCurrentPlan(null);
          }
        } catch (error) {
          console.error('Error in subscription fetch:', error);
        } finally {
          setIsLoadingSubscription(false);
        }
      }
    };
    
    fetchCurrentPlan();
  }, [user, toast]);

  // Handle payment for a plan
  const handlePayment = async (planId: string) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to subscribe to a plan",
        variant: "destructive"
      });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Find the selected plan
      const selectedPlan = plans.find(plan => plan.id === planId);
      
      if (!selectedPlan) {
        throw new Error('Invalid plan selected');
      }
      
      // Calculate price in paise (Razorpay uses smallest currency unit)
      const price = selectedPlan.price * 100;
      
      // Skip payment for free plan
      if (price === 0) {
        // Handle free plan subscription directly
        await saveSubscriptionData(user.id, selectedPlan, isYearly);
        toast({
          title: "Free Plan Activated",
          description: "You are now subscribed to the free plan",
          variant: "default"
        });
        return;
      }
      
      // Load Razorpay script
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      document.body.appendChild(script);
      
      script.onload = () => {
        // Create Razorpay options
        const options = {
          key: 'rzp_test_9nTp8gSSLXAvog', 
          amount: price,
          currency: 'INR',
          name: 'AI Research Summarizer',
          description: `${selectedPlan.name} Plan - ${isYearly ? 'Yearly' : 'Monthly'}`,
          image: '/3dlogo.webp',
          prefill: {
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
            email: user.email || '',
            contact: user.user_metadata?.phone || ''
          },
          theme: {
            color: '#3B82F6'
          },
          handler: function(response: any) {
            console.log('Payment successful:', response);
            // Create subscription with actual payment ID
            createSubscription(user.id, selectedPlan, response.razorpay_payment_id, isYearly);
          },
          modal: {  
            ondismiss: function() {
              console.log('Payment modal dismissed');
              saveSubscriptionData(user.id, selectedPlan, isYearly);
            }
          }
        };
        
        // Open Razorpay payment modal
        const razorpay = new (window as any).Razorpay(options);
        razorpay.open();
        
        // Always automatically create subscription after a delay
        // Set a timeout to auto-create subscription if payment not completed
        console.log('Will auto-create subscription if payment not completed');
        const autoSubscribeTimeout = setTimeout(() => {
          if (isProcessing) {
            console.log('Payment not completed after timeout, creating subscription anyway');
            saveSubscriptionData(user.id, selectedPlan, isYearly);
          }
        }, 8000); // 8 seconds timeout
      };
      
      script.onerror = () => {
        console.error('Failed to load Razorpay script');
        toast({
          title: "Payment Gateway Issue",
          description: "Payment gateway failed to load, but your subscription is still being processed.",
          variant: "default"
        });
        saveSubscriptionData(user.id, selectedPlan, isYearly);
        setIsProcessing(false);
      };
    } catch (error: any) {
      console.error('Error in payment process:', error);
      toast({
        title: "Payment Error",
        description: error.message || "There was an error processing your payment",
        variant: "destructive"
      });
      setIsProcessing(false);
    }
  };

  // Card animations
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
        ease: "easeOut"
      }
    })
  };
  
  // Add shimmer animation to tailwind styles
  const shimmerAnimation = {
    '@keyframes shimmer': {
      '0%': { transform: 'translateX(-100%)' },
      '100%': { transform: 'translateX(100%)' }
    },
    '.animate-shimmer': {
      animation: 'shimmer 2s infinite'
    }
  };
  
  // Button text based on plan
  const getButtonText = (planId: string) => {
    if (isProcessing) return 'Processing...';
    if (isLoadingSubscription) return 'Loading...';
    if (user?.id && currentPlan === planId) return 'Purchased Plan';
    if (planId === 'basic') return 'Start for Free';
    return `Upgrade to ${planId === 'silver' ? 'Silver' : 'Gold'}`;
  };

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <motion.h1 
            className="text-4xl md:text-5xl font-bold text-white mb-3 flex items-center justify-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Pricing
          </motion.h1>
          <motion.p 
            className="text-sm md:text-base text-white/70 max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            Created to be with you throughout your entire journey.
          </motion.p>
        </div>

        {/* Billing Toggle */}
        <motion.div 
          className="flex justify-center mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <div className="bg-black/30 p-1 rounded-full flex items-center">
            <button
              onClick={() => setIsYearly(false)}
              className={`px-6 py-1.5 rounded-full text-xs font-medium transition-all ${
                !isYearly ? 'bg-white/20 text-white' : 'text-white/60'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`px-6 py-1.5 rounded-full text-xs font-medium transition-all ${
                isYearly ? 'bg-white/20 text-white' : 'text-white/60'
              }`}
            >
              Annually
            </button>
          </div>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <style jsx global>{`
            @keyframes shimmer {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(100%); }
            }
            .animate-shimmer {
              animation: shimmer 2s infinite;
            }
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            @keyframes spin-reverse {
              from { transform: rotate(360deg); }
              to { transform: rotate(0deg); }
            }
          `}</style>
          
          {/* Order the plans: Bronze, Silver, Gold */}
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              custom={index}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
              whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
              className="relative"
            >
              <div className="relative h-full rounded-xl overflow-hidden group" 
                style={{
                  background: `linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(${plan.id === 'basic' ? '165,42,42' : plan.id === 'silver' ? '169,169,169' : '218,165,32'},0.2) 100%)`,
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: `0 0 20px rgba(${plan.id === 'basic' ? '165,42,42' : plan.id === 'silver' ? '169,169,169' : '218,165,32'},0.1)`,
                  transition: 'all 0.3s ease-in-out',
                }}>
                
                {/* Ambient Light Effect */}
                <div 
                  className="absolute -inset-1 opacity-20 blur-xl transition-all duration-700 ease-in-out group-hover:opacity-40"
                  style={{ 
                    background: `radial-gradient(circle, ${plan.id === 'basic' ? '#CD7F32' : plan.id === 'silver' ? '#C0C0C0' : '#FFD700'}22 10%, transparent 70%)`,
                    zIndex: -1 
                  }}
                />
                
                {/* Moving light effect - always visible and spinning */}
                <div 
                  className="absolute -inset-1 opacity-40 blur-md"
                  style={{ 
                    background: `conic-gradient(from 0deg at 50% 50%, transparent 0%, ${plan.color}80 15%, transparent 30%)`,
                    animation: 'spin 8s linear infinite',
                    zIndex: -1 
                  }}
                />
                
                {/* Additional light beam - opposite direction */}
                <div 
                  className="absolute -inset-1 opacity-30 blur-md"
                  style={{ 
                    background: `conic-gradient(from 180deg at 50% 50%, transparent 0%, ${plan.color}60 10%, transparent 25%)`,
                    animation: 'spin-reverse 12s linear infinite',
                    zIndex: -1 
                  }}
                />
                
                {/* Border glow on hover */}
                <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-in-out" 
                  style={{
                    boxShadow: `inset 0 0 20px 5px rgba(${plan.id === 'basic' ? '165,42,42' : plan.id === 'silver' ? '169,169,169' : '218,165,32'},0.3)`,
                    zIndex: -1
                  }}
                />
                
                {/* Plan Badge - Centered at top */}
                <div className="flex flex-col items-center pt-6 pb-3">
                  {plan.icon}
                  <h3 className="text-lg font-medium text-white mt-3 tracking-wider">{plan.name}</h3>
                  <p className="text-xs text-white/50 mt-1">Membership</p>
                </div>
                
                {/* Plan Content */}
                <div className="px-6 pb-6">
                  <div className="flex justify-center items-end mb-1">
                    <span className="text-sm text-white/60 mr-1">₹</span>
                    <span className="text-5xl font-light text-white">{plan.id === 'basic' ? '0' : plan.id === 'pro' ? '499' : '999'}</span>
                  </div>
                  <p className="text-center text-xs text-white/50 mb-6">billed {isYearly ? 'annually' : 'monthly'}</p>
                  
                  {/* Plan Features - Two Column Layout */}
                  <div className="px-1 pb-4">
                    <h3 className="text-white/90 text-center text-xs font-medium mb-3 border-b border-white/10 pb-1">Plan Highlights</h3>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-3">
                      {plan.features.slice(0, 10).map((feature, i) => (
                        <div key={i} className="group/feature relative">
                          <div className="flex items-start">
                            {feature.included ? (
                              <HiCheck className="w-4 h-4 text-green-400 mr-1.5 flex-shrink-0 mt-0.5" />
                            ) : (
                              <HiOutlineX className="w-4 h-4 text-red-400 mr-1.5 flex-shrink-0 mt-0.5" />
                            )}
                            <div>
                              <span className="text-xs text-white/90 flex items-center">
                                {feature.icon && <span className="mr-1">{feature.icon}</span>}
                                {feature.name}
                              </span>
                              {feature.description && (
                                <div className="absolute z-20 left-0 top-full mt-1 w-48 bg-black/80 backdrop-blur-md rounded-md p-2 text-xs text-white/70 opacity-0 invisible group-hover/feature:opacity-100 group-hover/feature:visible transition-all duration-200 pointer-events-none">
                                  {feature.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Action Button */}
                  <button
                    onClick={() => handlePayment(plan.id)}
                    disabled={isProcessing || (currentPlan === plan.id) || isLoadingSubscription}
                    className="w-full py-2.5 mt-6 rounded-md text-sm font-medium text-white transition-all relative overflow-hidden group/btn"
                    style={{ 
                      background: plan.id === 'basic' ? 'rgba(165,42,42,0.4)' : plan.id === 'silver' ? 'rgba(169,169,169,0.4)' : 'rgba(218,165,32,0.4)',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    {/* Button glow effect */}
                    <div className="absolute inset-0 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" 
                      style={{
                        boxShadow: `0 0 15px 2px rgba(${plan.id === 'basic' ? '165,42,42' : plan.id === 'silver' ? '169,169,169' : '218,165,32'},0.5)`,
                      }}
                    />
                    
                    {/* Shiny effect */}
                    <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-all duration-1000 ease-in-out" />
                    
                    {/* Button text */}
                    <span className="relative z-10">{getButtonText(plan.id)}</span>
                    
                    {isProcessing ? (
                      <div className="flex items-center justify-center">
                        <HiOutlineRefresh className="w-4 h-4 mr-1.5 animate-spin" />
                        Processing...
                      </div>
                    ) : (
                      plan.id === 'basic' ? 'Start for Free' : `Continue with ${plan.name}`
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Features Section */}
        <div className="mt-10">
          <h2 className="text-xl font-bold text-white text-center mb-6">Why Upgrade?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <GlassCard className="p-4">
              <div className="flex flex-col items-center text-center">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                  style={{ backgroundColor: `${themeColor}33` }}
                >
                  <HiOutlineLightningBolt className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-lg font-medium text-white mb-1.5">Advanced AI Models</h3>
                <p className="text-white/70 text-sm">
                  Access cutting-edge AI models like GPT-4, Claude 3.5 Opus, and Gemini Ultra for more accurate and insightful summaries.
                </p>
              </div>
            </GlassCard>
            
            <GlassCard className="p-4">
              <div className="flex flex-col items-center text-center">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                  style={{ backgroundColor: `${themeColor}33` }}
                >
                  <HiOutlineShieldCheck className="w-6 h-6 text-green-400" />
                </div>
                <h3 className="text-lg font-medium text-white mb-1.5">Unlimited Usage</h3>
                <p className="text-white/70 text-sm">
                  Remove daily limits and process as many documents as you need with faster processing speeds and priority access.
                </p>
              </div>
            </GlassCard>
            
            <GlassCard className="p-4">
              <div className="flex flex-col items-center text-center">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                  style={{ backgroundColor: `${themeColor}33` }}
                >
                  <HiOutlineChip className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-lg font-medium text-white mb-1.5">Optimized Libraries</h3>
                <p className="text-white/70 text-sm">
                  Access to optimized Python libraries and custom AI tuning for specialized research domains and advanced analytics.
                </p>
              </div>
            </GlassCard>
          </div>
        </div>
        
        {/* FAQ Section */}
        <div className="mt-10 mb-6">
          <h2 className="text-xl font-bold text-white text-center mb-6">Frequently Asked Questions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GlassCard className="p-4">
              <h3 className="text-base font-medium text-white mb-1.5">Can I switch plans later?</h3>
              <p className="text-white/70 text-sm">
                Yes, you can upgrade or downgrade your plan at any time. Changes will be applied at the start of your next billing cycle.
              </p>
            </GlassCard>
            
            <GlassCard className="p-4">
              <h3 className="text-base font-medium text-white mb-1.5">Is my payment secure?</h3>
              <p className="text-white/70 text-sm">
                Yes, all payments are processed securely through Razorpay, a trusted payment gateway that uses industry-standard encryption.
              </p>
            </GlassCard>
            
            <GlassCard className="p-4">
              <h3 className="text-base font-medium text-white mb-1.5">What payment methods are accepted?</h3>
              <p className="text-white/70 text-sm">
                We accept all major credit/debit cards, UPI, net banking, and wallet payments through our Razorpay integration.
              </p>
            </GlassCard>
            
            <GlassCard className="p-4">
              <h3 className="text-base font-medium text-white mb-1.5">Can I get a refund?</h3>
              <p className="text-white/70 text-sm">
                We offer a 7-day money-back guarantee for all new subscriptions. Contact our support team if you're not satisfied.
              </p>
            </GlassCard>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

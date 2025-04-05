import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';
import { summarizeDocument, SummarizationOptions } from '@/lib/apiClient';

// Define response types
type SuccessResponse = {
  summary: string;
  extractedText: string;
  model: string;
  processingTime: number;
  wordCount: number;
};

type ErrorResponse = {
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileUrl, fileType, model, options, userId } = req.body;

    // Validate required fields
    if (!fileUrl || !fileType || !model) {
      return res.status(400).json({ error: 'Missing required fields: fileUrl, fileType, model' });
    }

    // Validate model type
    const validModels = ['gemini', 'mistral', 'claude', 'openai'];
    if (!validModels.includes(model)) {
      return res.status(400).json({ error: `Invalid model. Must be one of: ${validModels.join(', ')}` });
    }
    
    // Check user subscription if userId is provided
    if (userId) {
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      // Verify user has access to the selected model
      if (subscription) {
        const plan = subscription.plan;
        
        // Check model access based on subscription plan
        if (plan === 'basic' && model !== 'gemini') {
          return res.status(403).json({ error: 'Your current plan only allows access to Gemini. Please upgrade to use other models.' });
        } else if (plan === 'silver' && !['gemini', 'openai'].includes(model)) {
          return res.status(403).json({ error: 'Your current plan only allows access to Gemini and OpenAI. Please upgrade to use other models.' });
        }
        
        // Check daily usage limits
        const today = new Date().toISOString().split('T')[0];
        const { count, error: countError } = await supabase
          .from('summaries')
          .select('id', { count: 'exact' })
          .eq('user_id', userId)
          .gte('created_at', today)
          .lt('created_at', new Date(new Date().setDate(new Date().getDate() + 1)).toISOString());
        
        const dailyLimit = plan === 'basic' ? 5 : plan === 'silver' ? 20 : 50;
        
        if (count !== null && count >= dailyLimit) {
          return res.status(429).json({ error: `You've reached your daily limit of ${dailyLimit} summaries. Please try again tomorrow or upgrade your plan.` });
        }
      }
    }

    // Start the processing timer
    const startTime = Date.now();
    
    // Process summarization options
    const summarizationOptions: SummarizationOptions = {
      length: options?.length as 'short' | 'medium' | 'long' || 'medium',
      style: options?.style as 'academic' | 'casual' | 'technical' | 'simplified' || 'academic',
      focus: options?.focus as 'comprehensive' | 'methodology' | 'results' | 'conclusions' || 'comprehensive',
      language: options?.language || 'english'
    };
    
    // Use the backend API to extract text and generate summary
    const { summary, extractedText, processingTime: aiProcessingTime, wordCount } = await summarizeDocument(
      fileUrl,
      fileType,
      model,
      summarizationOptions,
      userId
    );
    
    // The summarizeWithAI function now handles all the model-specific logic

    // Use the processing time from the backend API
    const processingTime = aiProcessingTime;

    // Store the summary in the database if userId is provided
    if (userId) {
      const { data: summaryData, error: summaryError } = await supabase
        .from('summaries')
        .insert([
          {
            user_id: userId,
            title: options?.title || 'Untitled Summary',
            summary,
            original_text: extractedText,
            file_path: fileUrl,
            file_name: fileUrl.split('/').pop() || 'unknown',
            file_type: fileType,
            model,
            word_count: wordCount,
            processing_time: processingTime,
            options: options || {}
          }
        ])
        .select('id')
        .single();
      
      if (summaryError) {
        console.error('Error storing summary:', summaryError);
        // Continue anyway, don't fail the request
      }
    }
    
    // Return the summary and extracted text
    return res.status(200).json({
      summary,
      extractedText,
      model,
      processingTime,
      wordCount
    });

  } catch (error: any) {
    console.error('API error:', error);
    return res.status(500).json({ error: error.message || 'An error occurred during summarization' });
  }
}

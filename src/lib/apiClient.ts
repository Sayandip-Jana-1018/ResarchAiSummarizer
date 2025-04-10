/**
 * API Client for interacting with the AI Summarizer backend
 */

// Backend API URL
const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:8000';

// Types
export interface SummarizationOptions {
  length?: 'short' | 'medium' | 'long';
  style?: 'paragraph' | 'bullet' | 'academic' | 'casual' | 'technical' | 'simplified';
  focus?: 'comprehensive' | 'methodology' | 'methods' | 'results' | 'conclusions';
  language?: string;
  title?: string;
  subscription_tier?: 'basic' | 'silver' | 'gold';
}

export interface SummarizationResult {
  summary: string;
  extractedText: string;
  model: string;
  processingTime: number;
  wordCount: number;
}

/**
 * Check if the backend API is available
 */
export async function isBackendAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_API_URL}/api/health`);
    return response.ok;
  } catch (error) {
    console.warn('Backend API not available:', error);
    return false;
  }
}

/**
 * Get available AI models
 */
export async function getAvailableModels() {
  try {
    const response = await fetch(`${BACKEND_API_URL}/api/models`);
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }
    const data = await response.json();
    return data.models;
  } catch (error) {
    console.error('Error fetching models:', error);
    return [];
  }
}

/**
 * Summarize a document from a URL
 */
export async function summarizeDocument(
  fileUrl: string,
  fileType: string,
  model: string,
  options: SummarizationOptions,
  userId?: string,
  subscriptionTier?: string
): Promise<SummarizationResult> {
  try {
    // Add subscription tier to options if provided
    if (subscriptionTier) {
      options.subscription_tier = subscriptionTier as 'basic' | 'silver' | 'gold';
    }
    
    const response = await fetch(`${BACKEND_API_URL}/api/summarize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileUrl,
        fileType,
        model,
        options,
        userId
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to summarize document: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error: any) {
    console.error('Error summarizing document:', error);
    throw new Error(error.message || 'Failed to summarize document');
  }
}

/**
 * Upload and summarize a document
 */
export async function uploadAndSummarizeDocument(
  file: File,
  model: string,
  options: SummarizationOptions,
  userId?: string,
  subscriptionTier?: string
): Promise<SummarizationResult> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('model', model);
    
    // Add options to form data
    if (options.length) formData.append('length', options.length);
    if (options.style) formData.append('style', options.style);
    if (options.focus) formData.append('focus', options.focus);
    if (options.language) formData.append('language', options.language);
    if (userId) formData.append('userId', userId);
    if (subscriptionTier) formData.append('subscription_tier', subscriptionTier);
    
    const response = await fetch(`${BACKEND_API_URL}/api/upload-and-summarize`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to upload and summarize document: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error: any) {
    console.error('Error uploading and summarizing document:', error);
    throw new Error(error.message || 'Failed to upload and summarize document');
  }
}

export default {
  isBackendAvailable,
  getAvailableModels,
  summarizeDocument,
  uploadAndSummarizeDocument
};

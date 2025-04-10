import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase with service role key for admin privileges
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password, firstName, lastName, phone } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user exists by querying the profiles table
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('email', email)
      .maybeSingle();
    
    if (existingProfile) {
      return res.status(400).json({ error: 'User already registered with this email' });
    }

    // Create user with admin API
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: `${firstName} ${lastName}`,
        phone
      }
    });

    if (error) {
      console.error('Error creating user:', error);
      return res.status(400).json({ error: error.message || 'Error creating user' });
    }

    if (!data.user) {
      return res.status(400).json({ error: 'Failed to create user' });
    }

    // The user has been created, now let's check if the profile was created by the trigger
    // If not, we'll create it manually
    const { data: profileData, error: profileCheckError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', data.user.id)
      .single();

    if (profileCheckError || !profileData) {
      // Profile doesn't exist, create it manually
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: data.user.id,
          email,
          full_name: `${firstName} ${lastName}`,
          phone,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        console.error('Error creating profile:', profileError);
        // Continue anyway - the user has been created
      }
    }

    // Check if subscription exists
    const { data: subscriptionData, error: subscriptionCheckError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('id')
      .eq('user_id', data.user.id)
      .single();

    if (subscriptionCheckError || !subscriptionData) {
      // Subscription doesn't exist, create it manually
      const { error: subscriptionError } = await supabaseAdmin
        .from('user_subscriptions')
        .insert({
          user_id: data.user.id,
          plan: 'basic',
          active: true,
          expires_at: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString() // 10 years
        });

      if (subscriptionError) {
        console.error('Error creating subscription:', subscriptionError);
        // Continue anyway - the user has been created
      }
    }

    // Return success with user data
    return res.status(200).json({
      user: data.user,
      message: 'User created successfully'
    });
  } catch (error: any) {
    console.error('Server error during signup:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

import AsyncStorage from '@react-native-async-storage/async-storage'
import 'react-native-url-polyfill/auto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// These are public client settings, protected by the database's RLS policies.
// Environment variables can override them for a separate development project.
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://zwwgufeavnxclwhkvclo.supabase.co'
const supabasePublishableKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_ZArXi9t_SK-PaJo9Sapk6g_HKkDj5rE'

export const isSupabaseConfigured =
  /^https:\/\/.+/.test(supabaseUrl) &&
  supabasePublishableKey.length > 10 &&
  !supabasePublishableKey.includes('YOUR_KEY') &&
  !supabaseUrl.includes('YOUR_PROJECT_REF')

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null

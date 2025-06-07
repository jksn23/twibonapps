// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://svwqjsscntgniegkajdb.supabase.co';    // Ganti dengan URL Anda
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2d3Fqc3NjbnRnbmllZ2thamRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyMDQ0MzksImV4cCI6MjA2NDc4MDQzOX0._q7NHPIuvLdTNsaH3aDRbFeDFWLy7myf0elvgOvJxjg'; // Ganti dengan kunci anon Anda

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
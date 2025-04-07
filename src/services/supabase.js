import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rdkvvigjmowtvhxqlrnp.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJka3Z2aWdqbW93dHZoeHFscm5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIxNjkwODQsImV4cCI6MjA1Nzc0NTA4NH0.pFn1faGoWsapclNIjVhnD8A754DMiY7dZL9Ig0lDMQ4'

export const supabase = createClient(supabaseUrl, supabaseKey)

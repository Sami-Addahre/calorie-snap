import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  "https://nhguhsewzppjstclbdcz.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oZ3Voc2V3enBwanN0Y2xiZGN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwODU5NjAsImV4cCI6MjA5NjY2MTk2MH0.dg68fztFgHfAjSrvysDRVTy-2Oh7FW3hG7JAPrn9BpU"
);

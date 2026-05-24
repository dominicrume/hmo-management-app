import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = createClient();
  
  // Clear the session on the server side
  await supabase.auth.signOut();
  
  // Return success. The @supabase/ssr server client will automatically 
  // clear the cookies in the response headers.
  return NextResponse.json({ success: true }, { status: 200 });
}

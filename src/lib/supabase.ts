
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("กรุณาตั้งค่า Supabase ในไฟล์ .env.local");
}

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);

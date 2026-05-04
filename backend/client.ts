import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();
export function createSupabaseClient() {
      return createClient(
            "https://btnqeiyqdntjzcskkerd.supabase.co",
            "sb_publishable_NAZqZaa-1UNzdfY26K9kNQ_cAwooFsm",
            {
                  auth: {
                        autoRefreshToken: false,
                        persistSession: false,
                  },
            },
      );
}

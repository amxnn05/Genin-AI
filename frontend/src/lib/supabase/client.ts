import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    "https://btnqeiyqdntjzcskkerd.supabase.co",
    "sb_publishable_NAZqZaa-1UNzdfY26K9kNQ_cAwooFsm",
  );
}

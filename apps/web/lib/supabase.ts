"use client";

import { createClient } from "@supabase/supabase-js";

import { appConfig } from "./config";

export const supabase = createClient(appConfig.supabaseUrl, appConfig.supabaseAnonKey, {
  auth: { persistSession: true }
});


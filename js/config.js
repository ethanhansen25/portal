/* Oakframe Media OS — runtime configuration.
   The publishable key is designed to be exposed in the browser; Row Level
   Security in the database (supabase/migrations/0002_rls.sql) is what actually
   enforces who can see and change what. Never place the service_role key here. */
window.OM_CONFIG = {
  supabaseUrl: "https://scfvwyfcnsyauruutuat.supabase.co",
  supabaseKey: "sb_publishable_dp5hfrM7c5StyczxyQizWg_Cfiu6_rT",
};

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    })
);

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const email = (process.argv[2] || "").toLowerCase();
const newPass = process.argv[3] || "";

let page = 1;
let user = null;
while (true) {
  const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) {
    console.log("ERR_LIST " + error.message);
    process.exit(1);
  }
  user = data.users.find((u) => (u.email || "").toLowerCase() === email);
  if (user || data.users.length < 1000) break;
  page++;
}

if (!user) {
  console.log("NO_USER " + email);
  process.exit(0);
}

if (newPass) {
  const { error } = await sb.auth.admin.updateUserById(user.id, { password: newPass });
  console.log(error ? "ERR_UPDATE " + error.message : "RESET_OK " + user.email);
} else {
  console.log("FOUND " + user.email + " confirmed=" + !!user.email_confirmed_at + " created=" + user.created_at);
}

import { authOptions } from "./src/lib/auth";
async function main() {
  const provider = authOptions.providers?.[0] as any;
  const authorize = provider?.authorize;
  const admin = await authorize(
    { email: "admin@polavaram.ap.gov.in", password: process.env.SEED_ADMIN_PASSWORD || "ChangeMe@2026" },
    { headers: { "user-agent": "script", "x-forwarded-for": "10.0.0.11" } }
  );
  const officer = await authorize(
    { email: "officer.vrpuram@polavaram.ap.gov.in", password: process.env.SEED_OFFICER_PASSWORD || "ChangeMe@2026" },
    { headers: { "user-agent": "script", "x-forwarded-for": "10.0.0.12" } }
  );
  console.log(JSON.stringify({ admin, officer }, null, 2));
}
main().catch((err) => { console.error(err); process.exit(1); });

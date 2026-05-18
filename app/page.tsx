import { fetchDeals, sweepStaleDeals } from "@/lib/actions/deals"
import { getMyProfile } from "@/lib/actions/profile"
import { createClient } from "@/lib/supabase/server"
import HomeClient from "./home-client"

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  await sweepStaleDeals()

  const [{ deals = [] }, { profile }] = await Promise.all([
    fetchDeals(),
    getMyProfile(),
  ])

  return <HomeClient initialDeals={deals} profile={profile} userId={user?.id ?? null} />
}

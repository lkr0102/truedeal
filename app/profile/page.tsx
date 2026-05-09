import { getMyProfile } from "@/lib/actions/profile"
import { fetchDeals } from "@/lib/actions/deals"
import { createClient } from "@/lib/supabase/server"
import ProfileClient from "./profile-client"

export const dynamic = "force-dynamic"

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ profile }, { deals = [] }] = await Promise.all([
    getMyProfile(),
    fetchDeals(),
  ])

  return <ProfileClient profile={profile} deals={deals} userId={user?.id ?? null} />
}

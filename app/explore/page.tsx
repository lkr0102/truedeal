import { getMyProfile, getLeaderboard } from "@/lib/actions/profile"
import { createClient } from "@/lib/supabase/server"
import ExploreClient from "./explore-client"

export const dynamic = "force-dynamic"

export default async function ExplorePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ profile }, { users: hofUsers }] = await Promise.all([
    getMyProfile(),
    getLeaderboard(50),
  ])

  let totalCheckins = 0
  if (user) {
    const { count } = await (supabase.from("daily_checkins") as any)
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
    totalCheckins = count ?? 0
  }

  return (
    <ExploreClient
      profile={profile}
      totalCheckins={totalCheckins}
      hofUsers={hofUsers}
      userId={user?.id ?? null}
    />
  )
}

import { getMyProfile, getHallOfFame } from "@/lib/actions/profile"
import { createClient } from "@/lib/supabase/server"
import ExploreClient from "./explore-client"

export default async function ExplorePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ profile }, { profiles: hofProfiles = [] }] = await Promise.all([
    getMyProfile(),
    getHallOfFame(20),
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
      hofProfiles={hofProfiles as any}
      userId={user?.id ?? null}
    />
  )
}

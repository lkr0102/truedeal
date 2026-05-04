import { redirect } from "next/navigation"

export default async function DealResultRedirect({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/deal/${id}/result`)
}

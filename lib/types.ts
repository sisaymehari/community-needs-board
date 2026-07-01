export type Need = {
  id: string
  category: string
  description: string
  is_urgent: boolean
  created_at: string
  organisations: { name: string; location: string } | null
}

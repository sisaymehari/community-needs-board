export type Need = {
  id: string
  organisation_id: string
  category: string
  description: string
  is_urgent: boolean
  created_at: string
  organisations: { name: string; location: string } | null
}

export type Organisation = {
  id: string
  name: string
  location: string
  email: string
  created_at: string
}

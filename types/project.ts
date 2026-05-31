export interface Project {
  id: string
  title: string
  type: 'clip' | 'music' | 'other'
  artist_id: string
  description: string | null
  status: 'draft' | 'in_progress' | 'done'
  created_at: string
}

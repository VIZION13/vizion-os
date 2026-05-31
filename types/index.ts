export interface Song {
  id: string
  title: string
  bpm: number | null
  key: string | null
  prompt: string | null
  created_at: string
}

export interface Task {
  id: string
  title: string
  done: boolean
  created_at: string
}

export interface Memory {
  id: string
  title: string
  content: string
  category: string | null
  created_at: string
}

export interface Clip {
  id: string
  title: string
  storyboard: string | null
  prompt: string | null
  created_at: string
}

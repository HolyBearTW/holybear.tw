export interface FuwariPost {
  title: string
  slug: string
  url: string
  published: Date
  updated?: Date
  tags: string[]
  category: string | null
  image: string
  description: string
  words: number
  minutes: number
  author: string | string[]
}

export interface FuwariProfileLink {
  name: string
  url: string
  icon: 'github' | 'telegram'
}

export interface FuwariProfile {
  name: string
  bio: string
  avatar: string
  links: FuwariProfileLink[]
}

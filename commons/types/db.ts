// Database entity interfaces
// Add entity types as tables are created

export interface Utente {
  id: string
  clerk_id: string
  email: string
  nome: string
  cognome: string
  avatar_url: string | null
  created_at: string
  updated_at: string
}

// src/supabase/client.js
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = "https://smqqhoqvsmfzmbtvvyyt.supabase.co"
const SUPABASE_KEY  = "sb_publishable_EUjtyBrK7pingBbr4yTKIw_G2CHEghD"

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Helper : récupérer l'utilisateur connecté
export const getUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Helper : récupérer la ferme de l'utilisateur
export const getFerme = async () => {
  const user = await getUser()
  if (!user) return null
  const { data } = await supabase
    .from('fermes')
    .select('*')
    .eq('user_id', user.id)
    .single()
  return data
}

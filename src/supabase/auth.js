// src/supabase/auth.js
// Remplace les setTimeout de simulation dans AuthPage
import { supabase } from './client'

export const authAPI = {

  // Inscription email
  signUp: async (email, password, nom) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: nom } }
    })
    if (error) throw error

    // Créer la ferme vide pour ce nouvel utilisateur
    if (data.user) {
      await supabase.from('fermes').insert([{
        user_id: data.user.id,
        nom: `Ferme de ${nom}`,
      }])
    }
    return { user: data.user, isNew: true }
  },

  // Connexion email
  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email, password
    })
    if (error) throw error
    return { user: data.user, isNew: false }
  },

  // Connexion Google
  signInGoogle: async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    })
    if (error) throw error
  },

  // Inscription / connexion téléphone (OTP)
  signInPhone: async (phone) => {
    const { error } = await supabase.auth.signInWithOtp({ phone })
    if (error) throw error
  },

  // Vérifier le code OTP
  verifyOTP: async (phone, token) => {
    const { data, error } = await supabase.auth.verifyOtp({
      phone, token, type: 'sms'
    })
    if (error) throw error
    return { user: data.user }
  },

  // Mot de passe oublié
  resetPassword: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })
    if (error) throw error
  },

  // Changer le mot de passe
  updatePassword: async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  },

  // Déconnexion
  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  // Écouter les changements d'état auth
  onAuthChange: (callback) => {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session?.user || null)
    })
  }
}

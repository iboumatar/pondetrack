// src/supabase/api.js
// Toutes les fonctions de données — remplacent les useState locaux
import { supabase, getFerme } from './client'

// ── PONTE ────────────────────────────────────────────────────────────────────
export const ponteAPI = {

  // Récupérer toutes les pontes (30 derniers jours)
  getRecentes: async (poulaillierId) => {
    const { data, error } = await supabase
      .from('ponte')
      .select('*')
      .eq('poulailler_id', poulaillierId)
      .order('date_ponte', { ascending: false })
      .limit(30)
    if (error) throw error
    return data
  },

  // Saisir une ponte
  add: async ({ poulaillierId, fermeId, lotId, date, plateaux, oeufReste, tauxPonte }) => {
    const { data, error } = await supabase
      .from('ponte')
      .upsert([{           // upsert = insert ou update si même jour
        poulailler_id: poulaillierId,
        ferme_id:      fermeId,
        lot_id:        lotId,
        date_ponte:    date,
        plateaux,
        oeufs_reste:   oeufReste,
        taux_ponte:    tauxPonte,
      }], { onConflict: 'poulailler_id,date_ponte' })
      .select()
    if (error) throw error
    return data[0]
  },

  // Ponte mensuelle (via vue)
  getMensuelle: async (fermeId) => {
    const { data, error } = await supabase
      .from('ponte_mensuelle')
      .select('*')
      .eq('ferme_id', fermeId)
      .order('mois', { ascending: false })
      .limit(12)
    if (error) throw error
    return data
  },

  // Ponte du jour pour tous les poulaillers
  getAujourdhui: async (fermeId) => {
    const today = new Date().toISOString().slice(0, 10)
    const { data, error } = await supabase
      .from('ponte')
      .select('*, poulaillers(code, nom, couleur)')
      .eq('ferme_id', fermeId)
      .eq('date_ponte', today)
    if (error) throw error
    return data
  },
}

// ── STOCK ALIMENT ─────────────────────────────────────────────────────────────
export const alimentAPI = {

  // Stock actuel (via vue)
  getStock: async (fermeId) => {
    const { data, error } = await supabase
      .from('stock_aliment_actuel')
      .select('stock_kg')
      .eq('ferme_id', fermeId)
      .single()
    if (error) throw error
    return data?.stock_kg || 0
  },

  // Ajouter une livraison
  livraison: async (fermeId, sacs, date) => {
    const kg = sacs * 50
    const { data, error } = await supabase
      .from('stock_aliment')
      .insert([{
        ferme_id: fermeId,
        date_mvt: date,
        type_mvt: 'livraison',
        sacs,
        kg_total: kg,
        note: `Livraison ${sacs} sacs`
      }])
      .select()
    if (error) throw error
    return data[0]
  },

  // Enregistrer consommation
  consommation: async (fermeId, kgA, kgB, date) => {
    const total = kgA + kgB
    const { data, error } = await supabase
      .from('stock_aliment')
      .insert([{
        ferme_id: fermeId,
        date_mvt: date,
        type_mvt: 'consommation',
        kg_total: total,
        note: `Conso A: ${kgA}kg · B: ${kgB}kg`
      }])
      .select()
    if (error) throw error
    return data[0]
  },

  // Historique mouvements
  getHistorique: async (fermeId) => {
    const { data, error } = await supabase
      .from('stock_aliment')
      .select('*')
      .eq('ferme_id', fermeId)
      .order('date_mvt', { ascending: false })
      .limit(50)
    if (error) throw error
    return data
  },
}

// ── VENTES ───────────────────────────────────────────────────────────────────
export const ventesAPI = {

  getAll: async (fermeId) => {
    const { data, error } = await supabase
      .from('ventes')
      .select('*')
      .eq('ferme_id', fermeId)
      .order('date_vente', { ascending: false })
    if (error) throw error
    return data
  },

  add: async (fermeId, vente) => {
    const { data, error } = await supabase
      .from('ventes')
      .insert([{
        ferme_id:       fermeId,
        date_vente:     vente.date,
        date_ponte_ref: vente.ponteDate || vente.date,
        plateaux:       vente.plateaux,
        prix_unitaire:  vente.prixUnitaire,
        note:           vente.note,
        statut:         vente.statut,
        montant_recu:   vente.montantRecu || 0,
        date_echeance:  vente.dateEcheance || null,
        date_paiement:  vente.statut === 'paye' ? vente.date : null,
      }])
      .select()
    if (error) throw error
    return data[0]
  },

  // Marquer une vente comme payée
  marquerPaye: async (id) => {
    const { data, error } = await supabase
      .from('ventes')
      .update({
        statut: 'paye',
        date_paiement: new Date().toISOString().slice(0, 10),
        montant_recu: null,
      })
      .eq('id', id)
      .select()
    if (error) throw error
    return data[0]
  },

  // Bilan mensuel (via vue)
  getBilanMensuel: async (fermeId) => {
    const { data, error } = await supabase
      .from('bilan_mensuel_production')
      .select('*')
      .eq('ferme_id', fermeId)
      .order('mois', { ascending: false })
      .limit(12)
    if (error) throw error
    return data
  },
}

// ── DÉPENSES ─────────────────────────────────────────────────────────────────
export const depensesAPI = {

  getAll: async (fermeId) => {
    const { data, error } = await supabase
      .from('depenses')
      .select('*')
      .eq('ferme_id', fermeId)
      .order('date_dep', { ascending: false })
    if (error) throw error
    return data
  },

  add: async (fermeId, depense) => {
    const { data, error } = await supabase
      .from('depenses')
      .insert([{
        ferme_id:  fermeId,
        date_dep:  depense.date,
        categorie: depense.cat,
        montant:   depense.montant,
        note:      depense.note,
      }])
      .select()
    if (error) throw error
    return data[0]
  },
}

// ── EFFECTIF ─────────────────────────────────────────────────────────────────
export const effectifAPI = {

  // Récupérer effectif actuel (via vue)
  getActuel: async (poulaillierId) => {
    const { data, error } = await supabase
      .from('effectif_actuel')
      .select('*')
      .eq('poulailler_id', poulaillierId)
      .single()
    if (error) throw error
    return data
  },

  // Enregistrer mortalité
  addMortalite: async (fermeId, poulaillierId, lotId, date, nombre, cause) => {
    const { data, error } = await supabase
      .from('mortalite')
      .insert([{
        ferme_id:      fermeId,
        poulailler_id: poulaillierId,
        lot_id:        lotId,
        date_mort:     date,
        nombre,
        cause,
      }])
      .select()
    if (error) throw error
    return data[0]
  },

  getMortalites: async (poulaillierId) => {
    const { data, error } = await supabase
      .from('mortalite')
      .select('*')
      .eq('poulailler_id', poulaillierId)
      .order('date_mort', { ascending: false })
    if (error) throw error
    return data
  },
}

// ── PROPHYLAXIE ───────────────────────────────────────────────────────────────
export const prophylaxieAPI = {

  getAll: async (fermeId) => {
    const { data, error } = await supabase
      .from('prophylaxie')
      .select('*')
      .eq('ferme_id', fermeId)
      .order('date_prevue', { ascending: true })
    if (error) throw error
    return data
  },

  // Alertes urgentes (via vue)
  getAlertes: async (fermeId) => {
    const { data, error } = await supabase
      .from('alertes_prophylaxie')
      .select('*')
      .eq('ferme_id', fermeId)
    if (error) throw error
    return data
  },

  marquerFait: async (id) => {
    const { data, error } = await supabase
      .from('prophylaxie')
      .update({
        fait:      true,
        date_fait: new Date().toISOString().slice(0, 10),
      })
      .eq('id', id)
      .select()
    if (error) throw error
    return data[0]
  },

  add: async (fermeId, lotId, acte) => {
    const { data, error } = await supabase
      .from('prophylaxie')
      .insert([{ ferme_id: fermeId, lot_id: lotId, ...acte }])
      .select()
    if (error) throw error
    return data[0]
  },
}

// ── ALVÉOLES ─────────────────────────────────────────────────────────────────
export const alveolesAPI = {

  getStock: async (fermeId) => {
    const { data, error } = await supabase
      .from('stock_alveoles')
      .select('alveoles, type_mvt')
      .eq('ferme_id', fermeId)
    if (error) throw error
    return data.reduce((sum, row) => {
      return sum + (row.type_mvt === 'entree' ? row.alveoles : -row.alveoles)
    }, 0)
  },

  addEntree: async (fermeId, paquets) => {
    const { data, error } = await supabase
      .from('stock_alveoles')
      .insert([{
        ferme_id: fermeId,
        date_mvt: new Date().toISOString().slice(0, 10),
        type_mvt: 'entree',
        paquets,
        alveoles: paquets * 50,
        note: `Réappro ${paquets} paquets`,
      }])
      .select()
    if (error) throw error
    return data[0]
  },

  sortieAuto: async (fermeId, plateaux) => {
    const { data, error } = await supabase
      .from('stock_alveoles')
      .insert([{
        ferme_id: fermeId,
        date_mvt: new Date().toISOString().slice(0, 10),
        type_mvt: 'sortie_auto',
        paquets:  0,
        alveoles: plateaux,
        note:     `Sortie auto ponte ${plateaux} alvéoles`,
      }])
      .select()
    if (error) throw error
    return data[0]
  },
}

// ── PROFIL UTILISATEUR ────────────────────────────────────────────────────────
export const profilAPI = {

  get: async (userId) => {
    const { data, error } = await supabase
      .from('profils')
      .select('*')
      .eq('id', userId)
      .single()
    if (error) throw error
    return data
  },

  update: async (userId, updates) => {
    const { data, error } = await supabase
      .from('profils')
      .update(updates)
      .eq('id', userId)
      .select()
    if (error) throw error
    return data[0]
  },

  // Supprimer le compte
  deleteAccount: async () => {
    // En prod: appel à une Edge Function Supabase
    // car auth.admin.deleteUser nécessite la service_role key (côté serveur)
    const { error } = await supabase.rpc('delete_user_account')
    if (error) throw error
  },
}

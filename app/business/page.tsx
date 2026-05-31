'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Briefcase, Sparkles, Copy, Check, FileText, Receipt, Plus, Trash2, Users2 } from 'lucide-react'

type DocType = 'facture' | 'contrat' | 'devis'
type Tab = 'generate' | 'crm'

interface Client {
  id: string
  title: string
  content: string
  category: string | null
  created_at: string
}

export default function BusinessPage() {
  const [tab, setTab] = useState<Tab>('generate')
  const [docType, setDocType] = useState<DocType>('facture')
  const [client, setClient] = useState('')
  const [details, setDetails] = useState('')
  const [montant, setMontant] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // CRM
  const [clients, setClients] = useState<Client[]>([])
  const [newClient, setNewClient] = useState('')
  const [newClientDetail, setNewClientDetail] = useState('')
  const [addingClient, setAddingClient] = useState(false)
  const [showClientForm, setShowClientForm] = useState(false)

  useEffect(() => { loadClients() }, [])

  async function loadClients() {
    const { data } = await supabase
      .from('memories')
      .select('*')
      .eq('category', 'Business')
      .order('created_at', { ascending: false })
    setClients(data ?? [])
  }

  const DOC_TYPES = [
    { id: 'facture' as DocType, label: 'Facture', icon: Receipt },
    { id: 'contrat' as DocType, label: 'Contrat', icon: FileText },
    { id: 'devis' as DocType, label: 'Devis', icon: FileText },
  ]

  const invoiceNumber = `F-${Date.now().toString().slice(-6)}`
  const quoteNumber = `D-${Date.now().toString().slice(-6)}`
  const today = new Date().toLocaleDateString('fr-FR')

  const prompts: Record<DocType, string> = {
    facture: `Génère une facture professionnelle complète pour un studio de production musicale et audiovisuelle.

INFORMATIONS :
- Émetteur : VIZION Studio
- Client : ${client}
- Numéro : ${invoiceNumber}
- Date : ${today}
- Prestation : ${details}
- Montant HT : ${montant ? montant + '€' : 'à définir'}
- TVA : 20%
- Montant TTC : ${montant ? Math.round(parseInt(montant) * 1.2) + '€' : 'à définir'}

Inclus : mentions légales françaises obligatoires, conditions de paiement (30 jours), coordonnées bancaires fictives pour l'exemple, numéro SIRET fictif. Format texte structuré prêt à copier.`,

    contrat: `Génère un contrat de prestation de services artistiques complet entre un studio de production et un client.

PARTIES :
- Prestataire : VIZION Studio (studio de production)
- Client / Artiste : ${client}
- Date : ${today}
- Objet : ${details}
- Rémunération : ${montant ? montant + '€' : 'à définir'}

Inclus : articles numérotés, cession de droits, exclusivité, modalités de paiement, résiliation, loi applicable française, signatures. Format contrat complet.`,

    devis: `Génère un devis professionnel détaillé pour un studio de production musicale et audiovisuelle.

INFORMATIONS :
- Émetteur : VIZION Studio
- Destinataire : ${client}
- Numéro : ${quoteNumber}
- Date : ${today}
- Validité : 30 jours
- Prestations : ${details}
- Budget estimé : ${montant ? montant + '€ HT' : 'à définir'}

Inclus : tableau de prestations détaillé avec prix unitaires, sous-total HT, TVA 20%, total TTC, conditions générales. Format devis professionnel.`
  }

  async function generate() {
    if (!client || !details) return
    setLoading(true)
    setResult('')
    setSaved(false)

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        module: 'business',
        messages: [{ role: 'user', content: prompts[docType] }]
      })
    })

    const reader = res.body?.getReader()
    const decoder = new TextDecoder()
    while (reader) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value)
      const lines = chunk.split('\n').filter((l: string) => l.startsWith('data: '))
      for (const line of lines) {
        const data = line.replace('data: ', '')
        if (data === '[DONE]') break
        try {
          const text = JSON.parse(data).text
          setResult(prev => prev + text)
        } catch {}
      }
    }
    setLoading(false)
  }

  function copy() {
    navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function saveDoc() {
    if (!result) return
    setSaving(true)
    await supabase.from('memories').insert({
      title: `${docType.toUpperCase()} — ${client} — ${today}`,
      content: result,
      category: 'Business',
    })
    setSaved(true)
    setSaving(false)
    await loadClients()
  }

  async function addClient() {
    if (!newClient.trim()) return
    setAddingClient(true)
    const { data, error } = await supabase.from('memories').insert({
      title: newClient.trim(),
      content: newClientDetail || `Client ajouté le ${today}`,
      category: 'Business',
    }).select().single()
    if (!error && data) {
      setClients([data, ...clients])
      setNewClient('')
      setNewClientDetail('')
      setShowClientForm(false)
    }
    setAddingClient(false)
  }

  async function removeClient(id: string) {
    await supabase.from('memories').delete().eq('id', id)
    setClients(clients.filter(c => c.id !== id))
  }

  return (
    <div className="min-h-screen px-4 md:px-8 py-8 md:py-12">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-600 to-orange-500 flex items-center justify-center">
            <Briefcase size={20} className="text-white" />
          </div>
          <h1 className="font-display font-black text-3xl text-white">BUSINESS</h1>
        </div>
        <p className="text-white/40 text-sm">Contrats, factures, devis & CRM</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'generate', label: '📄 Générateur' },
          { id: 'crm', label: `👥 CRM (${clients.length})` },
        ].map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id as Tab)}
            className={`px-5 py-2.5 rounded-2xl text-sm font-medium transition-all ${tab === id ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300' : 'bg-white/5 border border-white/10 text-white/50 hover:text-white/80'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* GENERATOR TAB */}
      {tab === 'generate' && (
        <div>
          <div className="glass-card rounded-3xl border border-white/8 p-6 mb-6">
            {/* Doc type selector */}
            <div className="flex gap-2 mb-6">
              {DOC_TYPES.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => { setDocType(id); setResult(''); setSaved(false) }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all ${docType === id ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300' : 'bg-white/5 border border-white/10 text-white/50 hover:text-white/80'}`}>
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">
                  {docType === 'contrat' ? 'Artiste / Client' : 'Client'} *
                </label>
                <input value={client} onChange={e => setClient(e.target.value)}
                  placeholder="Nom, société..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-amber-500/50 transition-colors" />
              </div>
              <div>
                <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">Montant HT (€)</label>
                <input value={montant} onChange={e => setMontant(e.target.value)} type="number" placeholder="ex: 2500"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-amber-500/50 transition-colors" />
              </div>
            </div>

            <div className="mb-4">
              <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">
                {docType === 'facture' ? 'Prestation' : docType === 'contrat' ? 'Objet du contrat' : 'Détail prestations'} *
              </label>
              <textarea value={details} onChange={e => setDetails(e.target.value)} rows={4}
                placeholder={
                  docType === 'facture' ? 'ex: Réalisation clip vidéo "SOLITAIRE" — Tournage 1 jour + Montage + Color grading'
                  : docType === 'contrat' ? 'ex: Cession de droits clip "SOLITAIRE", exploitation 2 ans, tous supports numériques'
                  : 'ex: Tournage clip 1 journée, montage 5 jours, livraison master + teaser réseaux sociaux'
                }
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-amber-500/50 transition-colors resize-none" />
            </div>

            {montant && (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl px-4 py-3 mb-4 flex items-center gap-4 text-sm">
                <span className="text-white/50">HT: <span className="text-white font-medium">{parseInt(montant).toLocaleString('fr-FR')}€</span></span>
                <span className="text-white/50">TVA 20%: <span className="text-white font-medium">{Math.round(parseInt(montant) * 0.2).toLocaleString('fr-FR')}€</span></span>
                <span className="text-amber-400 font-semibold">TTC: {Math.round(parseInt(montant) * 1.2).toLocaleString('fr-FR')}€</span>
              </div>
            )}

            <button onClick={generate} disabled={loading || !client || !details}
              className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-orange-500 text-white font-semibold px-6 py-3 rounded-2xl disabled:opacity-40 hover:opacity-90 transition-opacity">
              <Sparkles size={16} />
              {loading ? 'Génération...' : `Générer la ${docType}`}
            </button>
          </div>

          {/* Result */}
          {(result || loading) && (
            <div className="glass-card rounded-3xl border border-amber-500/20 p-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <p className="text-amber-400 text-xs uppercase tracking-wider font-medium">
                  {docType.charAt(0).toUpperCase() + docType.slice(1)} — {client}
                </p>
                <div className="flex items-center gap-3">
                  {result && !saved && (
                    <button onClick={saveDoc} disabled={saving}
                      className="flex items-center gap-1.5 text-xs bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded-xl hover:bg-emerald-500/30 transition-colors">
                      {saving ? 'Sauvegarde...' : '💾 Sauvegarder'}
                    </button>
                  )}
                  {saved && <span className="text-emerald-400 text-xs">✓ Sauvegardé</span>}
                  {result && (
                    <button onClick={copy} className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors">
                      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      {copied ? 'Copié !' : 'Copier'}
                    </button>
                  )}
                </div>
              </div>
              {loading && !result && (
                <div className="flex items-center gap-2 text-white/40 text-sm mb-3">
                  <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  Rédaction en cours...
                </div>
              )}
              <pre className="text-white/80 text-sm whitespace-pre-wrap font-sans leading-relaxed">
                {result}
                {loading && <span className="inline-block w-1 h-4 bg-amber-400 ml-1 animate-pulse" />}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* CRM TAB */}
      {tab === 'crm' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <p className="text-white/40 text-sm">{clients.length} client{clients.length > 1 ? 's' : ''} dans la base</p>
            <button onClick={() => setShowClientForm(!showClientForm)}
              className="flex items-center gap-2 bg-amber-500/20 border border-amber-500/30 text-amber-400 font-medium px-4 py-2.5 rounded-2xl hover:bg-amber-500/30 transition-colors">
              <Plus size={16} />
              Ajouter
            </button>
          </div>

          {showClientForm && (
            <div className="glass-card rounded-3xl border border-amber-500/20 p-6 mb-6">
              <h2 className="text-white font-semibold mb-4">Nouveau client</h2>
              <div className="mb-4">
                <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">Nom / Société *</label>
                <input value={newClient} onChange={e => setNewClient(e.target.value)} placeholder="ex: Niska / 93 Empire"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-amber-500/50 transition-colors" />
              </div>
              <div className="mb-4">
                <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">Infos (contact, projets, notes)</label>
                <textarea value={newClientDetail} onChange={e => setNewClientDetail(e.target.value)} rows={3}
                  placeholder="email, téléphone, projets en cours, notes..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-amber-500/50 transition-colors resize-none" />
              </div>
              <div className="flex gap-3">
                <button onClick={addClient} disabled={!newClient.trim() || addingClient}
                  className="bg-amber-600 text-white font-semibold px-6 py-2.5 rounded-2xl disabled:opacity-40 hover:bg-amber-500 transition-colors">
                  {addingClient ? 'Ajout...' : 'Ajouter'}
                </button>
                <button onClick={() => setShowClientForm(false)} className="text-white/40 hover:text-white/70 px-4 py-2.5 transition-colors">Annuler</button>
              </div>
            </div>
          )}

          {clients.length === 0 && !showClientForm && (
            <div className="glass rounded-3xl border border-white/8 p-12 text-center">
              <Users2 size={40} className="text-white/20 mx-auto mb-4" />
              <p className="text-white/40">Aucun client dans le CRM</p>
            </div>
          )}

          <div className="space-y-3">
            {clients.map(c => (
              <div key={c.id} className="glass rounded-2xl border border-white/8 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-orange-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold">{c.title[0].toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-white font-medium">{c.title}</p>
                      <p className="text-white/40 text-xs mt-0.5 line-clamp-2">{c.content}</p>
                      <p className="text-white/20 text-xs mt-1">{new Date(c.created_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                  </div>
                  <button onClick={() => removeClient(c.id)} className="text-white/20 hover:text-red-400 transition-colors ml-2 flex-shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

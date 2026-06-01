'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Briefcase, Sparkles, Copy, Check, FileText, Receipt, Plus, Trash2, Users2, Eye, X } from 'lucide-react'

type DocType = 'facture' | 'contrat' | 'devis'
type Tab = 'generate' | 'documents' | 'contacts'

interface Document {
  id: string
  type: string
  client: string
  montant: number | null
  content: string
  status: string
  created_at: string
}

interface Contact {
  id: string
  name: string
  role: string | null
  email: string | null
  phone: string | null
  instagram: string | null
  notes: string | null
  created_at: string
}

const STATUS_COLORS: Record<string, string> = {
  'draft':  'text-white/40 bg-white/5 border-white/10',
  'envoyé': 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  'payé':   'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  'signé':  'text-sky-400 bg-sky-500/10 border-sky-500/20',
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

  // Documents
  const [documents, setDocuments] = useState<Document[]>([])
  const [viewDoc, setViewDoc] = useState<Document | null>(null)

  // Contacts
  const [contacts, setContacts] = useState<Contact[]>([])
  const [showContactForm, setShowContactForm] = useState(false)
  const [cName, setCName] = useState('')
  const [cRole, setCRole] = useState('')
  const [cEmail, setCEmail] = useState('')
  const [cPhone, setCPhone] = useState('')
  const [cInsta, setCInsta] = useState('')
  const [cNotes, setCNotes] = useState('')
  const [savingContact, setSavingContact] = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [d, c] = await Promise.all([
      supabase.from('documents').select('*').order('created_at', { ascending: false }),
      supabase.from('contacts').select('*').order('created_at', { ascending: false }),
    ])
    setDocuments(d.data ?? [])
    setContacts(c.data ?? [])
  }

  const today = new Date().toLocaleDateString('fr-FR')
  const invoiceNum = `F-${Date.now().toString().slice(-6)}`
  const quoteNum = `D-${Date.now().toString().slice(-6)}`

  const prompts: Record<DocType, string> = {
    facture: `Génère une facture professionnelle complète pour un studio de production musicale.
Émetteur : VIZION Studio | Client : ${client} | N° : ${invoiceNum} | Date : ${today}
Prestation : ${details} | Montant HT : ${montant || '?'}€ | TVA 20% | TTC : ${montant ? Math.round(parseFloat(montant)*1.2) : '?'}€
Inclus mentions légales françaises, conditions de paiement 30j, coordonnées bancaires fictives, SIRET fictif.`,

    contrat: `Génère un contrat de prestation artistique complet.
Prestataire : VIZION Studio | Client/Artiste : ${client} | Date : ${today}
Objet : ${details} | Rémunération : ${montant || '?'}€
Articles numérotés, cession de droits, modalités paiement, résiliation, loi française, espaces signatures.`,

    devis: `Génère un devis professionnel pour un studio de production.
Émetteur : VIZION Studio | Destinataire : ${client} | N° : ${quoteNum} | Date : ${today} | Validité : 30j
Prestations : ${details} | Budget HT : ${montant || '?'}€ | TVA 20% | TTC : ${montant ? Math.round(parseFloat(montant)*1.2) : '?'}€
Tableau de prestations détaillé avec conditions générales.`
  }

  async function generate() {
    if (!client || !details) return
    setLoading(true); setResult(''); setSaved(false)
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ module: 'business', messages: [{ role: 'user', content: prompts[docType] }] })
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
        try { const t = JSON.parse(data).text; setResult(prev => prev + t) } catch {}
      }
    }
    setLoading(false)
  }

  async function saveDoc() {
    if (!result) return
    setSaving(true)
    const { data, error } = await supabase.from('documents').insert({
      type: docType,
      client,
      montant: montant ? parseFloat(montant) : null,
      content: result,
      status: 'draft',
    }).select().single()
    if (!error && data) {
      setDocuments([data, ...documents])
      setSaved(true)
    }
    setSaving(false)
  }

  async function updateDocStatus(id: string, status: string) {
    await supabase.from('documents').update({ status }).eq('id', id)
    setDocuments(documents.map(d => d.id === id ? { ...d, status } : d))
  }

  async function removeDoc(id: string) {
    await supabase.from('documents').delete().eq('id', id)
    setDocuments(documents.filter(d => d.id !== id))
  }

  async function saveContact() {
    if (!cName) return
    setSavingContact(true)
    const { data, error } = await supabase.from('contacts').insert({
      name: cName, role: cRole || null, email: cEmail || null,
      phone: cPhone || null, instagram: cInsta || null, notes: cNotes || null,
    }).select().single()
    if (!error && data) {
      setContacts([data, ...contacts])
      setShowContactForm(false)
      setCName(''); setCRole(''); setCEmail(''); setCPhone(''); setCInsta(''); setCNotes('')
    }
    setSavingContact(false)
  }

  async function removeContact(id: string) {
    await supabase.from('contacts').delete().eq('id', id)
    setContacts(contacts.filter(c => c.id !== id))
  }

  const ROLES = ['Artiste', 'Label', 'Booking', 'Presse', 'Réalisateur', 'Autre']

  return (
    <div className="min-h-screen px-4 md:px-8 py-8 md:py-12 overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-600 to-orange-500 flex items-center justify-center flex-shrink-0">
            <Briefcase size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-display font-black text-2xl md:text-3xl text-white">BUSINESS</h1>
            <p className="text-white/40 text-xs">{documents.length} doc{documents.length > 1 ? 's' : ''} — {contacts.length} contact{contacts.length > 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { id: 'generate', label: '✍️ Générer' },
          { id: 'documents', label: `📄 Documents (${documents.length})` },
          { id: 'contacts', label: `👥 CRM (${contacts.length})` },
        ].map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id as Tab)}
            className={`px-4 py-2 rounded-2xl text-sm font-medium transition-all ${tab === id ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300' : 'bg-white/5 border border-white/10 text-white/50 hover:text-white/80'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* GENERATE */}
      {tab === 'generate' && (
        <div>
          <div className="glass-card rounded-3xl border border-white/8 p-5 mb-5">
            <div className="flex gap-2 mb-5 flex-wrap">
              {(['facture', 'contrat', 'devis'] as DocType[]).map(t => (
                <button key={t} onClick={() => { setDocType(t); setResult(''); setSaved(false) }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-medium transition-all ${docType === t ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300' : 'bg-white/5 border border-white/10 text-white/50'}`}>
                  {t === 'facture' ? <Receipt size={13} /> : <FileText size={13} />}
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">Client *</label>
                <input value={client} onChange={e => setClient(e.target.value)} placeholder="Nom, société..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-amber-500/50 transition-colors" />
              </div>
              <div>
                <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">Montant HT (€)</label>
                <input value={montant} onChange={e => setMontant(e.target.value)} type="number" placeholder="ex: 2500"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-amber-500/50 transition-colors" />
              </div>
            </div>
            {montant && (
              <div className="flex gap-4 text-sm bg-amber-500/5 border border-amber-500/15 rounded-2xl px-4 py-2.5 mb-3">
                <span className="text-white/50">HT: <span className="text-white">{parseFloat(montant).toLocaleString('fr-FR')}€</span></span>
                <span className="text-white/50">TVA: <span className="text-white">{Math.round(parseFloat(montant)*0.2).toLocaleString('fr-FR')}€</span></span>
                <span className="text-amber-400 font-semibold">TTC: {Math.round(parseFloat(montant)*1.2).toLocaleString('fr-FR')}€</span>
              </div>
            )}
            <div className="mb-4">
              <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">Prestation *</label>
              <textarea value={details} onChange={e => setDetails(e.target.value)} rows={3}
                placeholder="ex: Réalisation clip vidéo — tournage + montage + color grading"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-amber-500/50 transition-colors resize-none" />
            </div>
            <button onClick={generate} disabled={loading || !client || !details}
              className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-orange-500 text-white font-semibold px-6 py-3 rounded-2xl disabled:opacity-40 hover:opacity-90 transition-opacity">
              <Sparkles size={16} />
              {loading ? 'Génération...' : `Générer la ${docType}`}
            </button>
          </div>

          {(result || loading) && (
            <div className="glass-card rounded-3xl border border-amber-500/20 p-5">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <p className="text-amber-400 text-xs uppercase tracking-wider font-medium">{docType} — {client}</p>
                <div className="flex items-center gap-2">
                  {result && !saved && (
                    <button onClick={saveDoc} disabled={saving}
                      className="flex items-center gap-1.5 text-xs bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded-xl">
                      {saving ? 'Sauvegarde...' : '💾 Sauvegarder'}
                    </button>
                  )}
                  {saved && <span className="text-emerald-400 text-xs">✓ Sauvegardé</span>}
                  {result && (
                    <button onClick={() => { navigator.clipboard.writeText(result); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                      className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors">
                      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      {copied ? 'Copié !' : 'Copier'}
                    </button>
                  )}
                </div>
              </div>
              {loading && !result && (
                <div className="flex items-center gap-2 text-white/40 text-sm mb-3">
                  <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  Rédaction...
                </div>
              )}
              <pre className="text-white/80 text-sm whitespace-pre-wrap font-sans leading-relaxed">
                {result}{loading && <span className="inline-block w-1 h-4 bg-amber-400 ml-1 animate-pulse" />}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* DOCUMENTS */}
      {tab === 'documents' && (
        <div>
          {documents.length === 0 && (
            <div className="glass rounded-3xl border border-white/8 p-12 text-center">
              <FileText size={40} className="text-white/20 mx-auto mb-4" />
              <p className="text-white/40">Aucun document — génère ta première facture</p>
            </div>
          )}
          <div className="space-y-3">
            {documents.map(doc => (
              <div key={doc.id} className="glass rounded-2xl border border-white/8 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-amber-400 text-xs bg-amber-500/10 px-2 py-0.5 rounded-lg uppercase font-medium">{doc.type}</span>
                      <select value={doc.status} onChange={e => updateDocStatus(doc.id, e.target.value)}
                        className={`text-xs px-2 py-0.5 rounded-lg border bg-transparent cursor-pointer ${STATUS_COLORS[doc.status] || STATUS_COLORS.draft}`}>
                        {['draft', 'envoyé', 'payé', 'signé'].map(s => <option key={s} value={s} className="bg-gray-900">{s}</option>)}
                      </select>
                    </div>
                    <p className="text-white font-medium truncate">{doc.client}</p>
                    <div className="flex gap-3 mt-1">
                      {doc.montant && <span className="text-white/40 text-xs">{doc.montant.toLocaleString('fr-FR')}€ HT</span>}
                      <span className="text-white/25 text-xs">{new Date(doc.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => setViewDoc(doc)} className="text-white/30 hover:text-white/60 transition-colors"><Eye size={15} /></button>
                    <button onClick={() => removeDoc(doc.id)} className="text-white/20 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CONTACTS CRM */}
      {tab === 'contacts' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-white/40 text-sm">{contacts.length} contact{contacts.length > 1 ? 's' : ''}</p>
            <button onClick={() => setShowContactForm(!showContactForm)}
              className="flex items-center gap-2 bg-amber-500/20 border border-amber-500/30 text-amber-400 font-medium px-3 py-2 rounded-2xl text-sm">
              <Plus size={14} /> Ajouter
            </button>
          </div>

          {showContactForm && (
            <div className="glass-card rounded-3xl border border-amber-500/20 p-5 mb-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">Nom *</label>
                  <input value={cName} onChange={e => setCName(e.target.value)} placeholder="ex: DJ Snake"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">Rôle</label>
                  <div className="flex flex-wrap gap-1.5">
                    {ROLES.map(r => (
                      <button key={r} onClick={() => setCRole(r)}
                        className={`px-2.5 py-1 rounded-lg text-xs transition-all ${cRole === r ? 'bg-amber-500/30 border border-amber-500/50 text-amber-300' : 'bg-white/5 border border-white/10 text-white/40'}`}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">Email</label>
                  <input value={cEmail} onChange={e => setCEmail(e.target.value)} placeholder="email@..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-3 py-2.5 text-white placeholder-white/20 focus:outline-none transition-colors text-sm" />
                </div>
                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">Téléphone</label>
                  <input value={cPhone} onChange={e => setCPhone(e.target.value)} placeholder="+33..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-3 py-2.5 text-white placeholder-white/20 focus:outline-none transition-colors text-sm" />
                </div>
                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">Instagram</label>
                  <input value={cInsta} onChange={e => setCInsta(e.target.value)} placeholder="@handle"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-3 py-2.5 text-white placeholder-white/20 focus:outline-none transition-colors text-sm" />
                </div>
              </div>
              <div className="mb-4">
                <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">Notes</label>
                <textarea value={cNotes} onChange={e => setCNotes(e.target.value)} rows={2} placeholder="Notes..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none transition-colors resize-none text-sm" />
              </div>
              <div className="flex gap-3">
                <button onClick={saveContact} disabled={!cName || savingContact}
                  className="bg-amber-600 text-white font-semibold px-5 py-2.5 rounded-2xl disabled:opacity-40 text-sm">
                  {savingContact ? 'Sauvegarde...' : 'Ajouter'}
                </button>
                <button onClick={() => setShowContactForm(false)} className="text-white/40 text-sm px-4">Annuler</button>
              </div>
            </div>
          )}

          {contacts.length === 0 && !showContactForm && (
            <div className="glass rounded-3xl border border-white/8 p-12 text-center">
              <Users2 size={40} className="text-white/20 mx-auto mb-4" />
              <p className="text-white/40">Aucun contact</p>
            </div>
          )}

          <div className="space-y-3">
            {contacts.map(c => (
              <div key={c.id} className="glass rounded-2xl border border-white/8 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-orange-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-sm">{c.name[0].toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-medium truncate">{c.name}</p>
                      <div className="flex gap-2 flex-wrap mt-0.5">
                        {c.role && <span className="text-amber-400 text-xs bg-amber-500/10 px-2 py-0.5 rounded-lg">{c.role}</span>}
                        {c.email && <span className="text-white/40 text-xs truncate">{c.email}</span>}
                        {c.instagram && <span className="text-white/40 text-xs">{c.instagram}</span>}
                      </div>
                      {c.phone && <p className="text-white/30 text-xs mt-0.5">{c.phone}</p>}
                      {c.notes && <p className="text-white/30 text-xs mt-1 line-clamp-1">{c.notes}</p>}
                    </div>
                  </div>
                  <button onClick={() => removeContact(c.id)} className="text-white/20 hover:text-red-400 transition-colors ml-2 flex-shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Document viewer modal */}
      {viewDoc && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}>
          <div className="glass-strong rounded-3xl border border-white/10 w-full md:max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-white/8">
              <div>
                <p className="text-white font-semibold">{viewDoc.type.toUpperCase()} — {viewDoc.client}</p>
                <p className="text-white/40 text-xs">{new Date(viewDoc.created_at).toLocaleDateString('fr-FR')}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { navigator.clipboard.writeText(viewDoc.content); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                  className="text-white/40 hover:text-white transition-colors text-xs flex items-center gap-1">
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>
                <button onClick={() => setViewDoc(null)} className="text-white/40 hover:text-white transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto p-4 flex-1">
              <pre className="text-white/80 text-sm whitespace-pre-wrap font-sans leading-relaxed">{viewDoc.content}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

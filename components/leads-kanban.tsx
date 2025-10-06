"use client"

import { useState, useEffect } from "react"
import { Search, Plus, MoreHorizontal, Calendar, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LeadModal } from "@/components/lead-modal"
import { FunilManager } from "@/components/funil-manager"
import { useToast } from "@/hooks/use-toast"
import { consultarLeads, atualizarEstagioLead, type Lead } from "@/lib/leads-service"
import type { Funil, EstagioFunil } from "@/lib/funis-service"

const TAG_COLORS: Record<string, string> = {
  'Ads Production': 'bg-blue-100 text-blue-700',
  'Landing Page': 'bg-red-100 text-red-700',
  'Dashboard': 'bg-green-100 text-green-700',
  'UX Design': 'bg-pink-100 text-pink-700',
  'Video Production': 'bg-amber-100 text-amber-700',
  'Typeface': 'bg-cyan-100 text-cyan-700',
  'Web Design': 'bg-purple-100 text-purple-700'
}

export default function LeadsKanban() {
  const [searchTerm, setSearchTerm] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null)
  const [selectedFunil, setSelectedFunil] = useState<Funil | null>(null)
  const [estagios, setEstagios] = useState<EstagioFunil[]>([])
  const { toast } = useToast()

  useEffect(() => {
    loadLeads()
  }, [])

  useEffect(() => {
    if (selectedFunil) {
      loadEstagios()
    }
  }, [selectedFunil])

  const loadEstagios = async () => {
    if (!selectedFunil) return
    try {
      const response = await fetch(`/api/funis/estagios?codFunil=${selectedFunil.CODFUNIL}`)
      if (!response.ok) throw new Error('Falha ao carregar estágios')
      const data = await response.json()
      setEstagios(data)
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const loadLeads = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/leads', {
        headers: { 'Cache-Control': 'no-cache' }
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Falha ao carregar leads')
      }
      
      const data = await response.json()
      setLeads(data)
    } catch (error: any) {
      console.error("Erro ao carregar leads:", error)
      toast({
        title: "Erro",
        description: error.message || "Falha ao carregar leads. Atualizando página...",
        variant: "destructive",
      })
      // Tentar novamente após 2 segundos
      setTimeout(() => loadLeads(), 2000)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreate = () => {
    setSelectedLead(null)
    setIsModalOpen(true)
  }

  const handleEdit = (lead: Lead) => {
    setSelectedLead(lead)
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    await loadLeads()
    setIsModalOpen(false)
    toast({
      title: "Sucesso",
      description: selectedLead ? "Lead atualizado com sucesso" : "Lead criado com sucesso",
    })
  }

  const handleDragStart = (lead: Lead) => {
    setDraggedLead(lead)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (codEstagio: string, nomeEstagio: string) => {
    if (!draggedLead || draggedLead.CODESTAGIO === codEstagio) {
      setDraggedLead(null)
      return
    }

    const leadOriginal = draggedLead
    
    // Atualização otimista - atualiza UI imediatamente
    setLeads(prev => prev.map(l => 
      l.CODLEAD === draggedLead.CODLEAD 
        ? { ...l, CODESTAGIO: codEstagio }
        : l
    ))
    setDraggedLead(null)

    try {
      const response = await fetch('/api/leads/atualizar-estagio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codLeed: leadOriginal.CODLEAD, novoEstagio: codEstagio })
      })
      
      if (!response.ok) throw new Error('Falha ao atualizar estágio')
      
      toast({
        title: "Sucesso",
        description: `Lead movido para ${nomeEstagio}`,
      })
    } catch (error: any) {
      // Reverter mudança otimista em caso de erro
      setLeads(prev => prev.map(l => 
        l.CODLEAD === leadOriginal.CODLEAD 
          ? leadOriginal
          : l
      ))
      
      toast({
        title: "Erro",
        description: error.message || "Falha ao atualizar estágio. Tente novamente.",
        variant: "destructive",
      })
    }
  }

  const getLeadsByEstagio = (codEstagio: string) => {
    return leads.filter(lead => {
      const matchesSearch = lead.NOME.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           lead.DESCRICAO.toLowerCase().includes(searchTerm.toLowerCase())
      return lead.CODESTAGIO === codEstagio && matchesSearch
    })
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Funil de Vendas</h1>
        <Button
          onClick={handleCreate}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium uppercase flex items-center gap-2"
          disabled={!selectedFunil}
        >
          <Plus className="w-4 h-4" />
          Add New
        </Button>
      </div>

      {/* Funil Manager */}
      <FunilManager 
        onSelectFunil={(funil) => setSelectedFunil(funil)} 
        selectedFunilId={selectedFunil?.CODFUNIL}
      />

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search deals"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-card"
          />
        </div>
        <Button variant="outline" className="flex items-center gap-2">
          <span>Filter</span>
        </Button>
        <Button variant="outline" className="flex items-center gap-2">
          <span>Sort</span>
        </Button>
        <Button variant="outline" className="flex items-center gap-2">
          <span>Group</span>
        </Button>
      </div>

      {/* Kanban Board */}
      <div className="grid gap-4" style={{ 
        gridTemplateColumns: `repeat(${estagios.length || 1}, minmax(300px, 1fr))` 
      }}>
        {estagios.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            Selecione um funil e configure seus estágios para começar
          </div>
        ) : (
          estagios.map((estagio) => {
            const leadsList = getLeadsByEstagio(estagio.CODESTAGIO)
            const totalValue = leadsList.reduce((sum, lead) => sum + lead.VALOR, 0)

            return (
              <div
                key={estagio.CODESTAGIO}
                className={`bg-muted/30 rounded-lg p-4 min-h-[600px] transition-colors ${
                  draggedLead && draggedLead.CODESTAGIO !== estagio.CODESTAGIO 
                    ? 'ring-2 ring-primary/50 bg-primary/5' 
                    : ''
                }`}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(estagio.CODESTAGIO, estagio.NOME)}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: estagio.COR }}
                    />
                    <h3 className="font-semibold text-foreground">{estagio.NOME}</h3>
                    <span className="text-sm text-muted-foreground">{leadsList.length}</span>
                  </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Cards */}
              <div className="space-y-3">
                {isLoading ? (
                  <>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="bg-card rounded-lg p-4 shadow-sm border border-border animate-pulse">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-muted"></div>
                              <div>
                                <div className="h-4 w-24 bg-muted rounded mb-1"></div>
                                <div className="h-3 w-32 bg-muted rounded"></div>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="h-3 w-full bg-muted rounded"></div>
                            <div className="h-6 w-20 bg-muted rounded"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                ) : leadsList.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    Nenhum lead
                  </div>
                ) : (
                  leadsList.map((lead, index) => (
                    <div
                      key={`${estagio.CODESTAGIO}-${lead.CODLEAD || `temp-${index}`}`}
                      draggable
                      onDragStart={() => handleDragStart(lead)}
                      onDragEnd={() => setDraggedLead(null)}
                      onClick={(e) => {
                        if (!draggedLead) {
                          handleEdit(lead)
                        }
                      }}
                      className={`bg-card rounded-lg p-4 shadow-sm hover:shadow-md transition-all cursor-move border border-border ${
                        draggedLead?.CODLEAD === lead.CODLEAD ? 'opacity-50 scale-95' : ''
                      }`}
                    >
                      <div className="space-y-3">
                        {/* Lead Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-semibold">
                              {lead.NOME.charAt(0)}
                            </div>
                            <div>
                              <h4 className="font-semibold text-sm text-foreground">{lead.NOME}</h4>
                              <p className="text-xs text-muted-foreground">{lead.DESCRICAO}</p>
                            </div>
                          </div>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                            <MoreHorizontal className="w-3 h-3" />
                          </Button>
                        </div>

                        {/* Lead Info */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs">
                            <DollarSign className="w-3 h-3 text-muted-foreground" />
                            <span className="font-semibold text-foreground">{formatCurrency(lead.VALOR)}</span>
                            <span className="text-muted-foreground">•</span>
                            <Calendar className="w-3 h-3 text-muted-foreground" />
                            <span className="text-muted-foreground">{formatDate(lead.DATA_VENCIMENTO)}</span>
                          </div>

                          {/* Tag */}
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-1 rounded-md font-medium ${TAG_COLORS[lead.TIPO_TAG] || 'bg-gray-100 text-gray-700'}`}>
                              {lead.TIPO_TAG}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Column Footer */}
              {leadsList.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="text-sm font-semibold text-foreground">
                    Total: {formatCurrency(totalValue)}
                  </div>
                </div>
              )}
              </div>
            )
          })
        )}
      </div>

      <LeadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        lead={selectedLead}
        onSave={handleSave}
        funilSelecionado={selectedFunil ? { CODFUNIL: selectedFunil.CODFUNIL, estagios } : undefined}
      />
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Plus, Settings, Trash2, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import type { Funil, EstagioFunil } from "@/lib/funis-service"
import { FunilModal } from "./funil-modal"
import { EstagiosModal } from "./estagios-modal"

interface FunilManagerProps {
  onSelectFunil: (funil: Funil) => void
  selectedFunilId?: string
}

export function FunilManager({ onSelectFunil, selectedFunilId }: FunilManagerProps) {
  const [funis, setFunis] = useState<Funil[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFunilModalOpen, setIsFunilModalOpen] = useState(false)
  const [isEstagiosModalOpen, setIsEstagiosModalOpen] = useState(false)
  const [selectedFunil, setSelectedFunil] = useState<Funil | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadFunis()
  }, [])

  const loadFunis = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/funis')
      if (!response.ok) throw new Error('Falha ao carregar funis')
      const data = await response.json()
      setFunis(data)
      
      // Selecionar o primeiro funil automaticamente
      if (data.length > 0 && !selectedFunilId) {
        onSelectFunil(data[0])
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Falha ao carregar funis",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateFunil = () => {
    setSelectedFunil(null)
    setIsFunilModalOpen(true)
  }

  const handleEditFunil = (funil: Funil) => {
    setSelectedFunil(funil)
    setIsFunilModalOpen(true)
  }

  const handleConfigureEstagios = (funil: Funil) => {
    setSelectedFunil(funil)
    setIsEstagiosModalOpen(true)
  }

  const handleFunilSaved = async () => {
    await loadFunis()
    setIsFunilModalOpen(false)
    toast({
      title: "Sucesso",
      description: selectedFunil ? "Funil atualizado!" : "Funil criado!",
    })
  }

  const handleEstagiosSaved = async () => {
    setIsEstagiosModalOpen(false)
    toast({
      title: "Sucesso",
      description: "Estágios atualizados!",
    })
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
        {funis.map((funil) => (
          <div key={funil.CODFUNIL} className="flex items-center gap-1">
            <Button
              variant={selectedFunilId === funil.CODFUNIL ? "default" : "outline"}
              onClick={() => onSelectFunil(funil)}
              className="whitespace-nowrap"
              style={{ 
                backgroundColor: selectedFunilId === funil.CODFUNIL ? funil.COR : 'transparent',
                borderColor: funil.COR,
                color: selectedFunilId === funil.CODFUNIL ? 'white' : funil.COR
              }}
            >
              {funil.NOME}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleConfigureEstagios(funil)}
              className="h-8 w-8 p-0"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleEditFunil(funil)}
              className="h-8 w-8 p-0"
            >
              <Edit className="w-4 h-4" />
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={handleCreateFunil}
          className="whitespace-nowrap"
        >
          <Plus className="w-4 h-4 mr-1" />
          Novo Funil
        </Button>
      </div>

      <FunilModal
        isOpen={isFunilModalOpen}
        onClose={() => setIsFunilModalOpen(false)}
        funil={selectedFunil}
        onSave={handleFunilSaved}
      />

      <EstagiosModal
        isOpen={isEstagiosModalOpen}
        onClose={() => setIsEstagiosModalOpen(false)}
        funil={selectedFunil}
        onSave={handleEstagiosSaved}
      />
    </>
  )
}


"use client"

import { useState, useEffect } from "react"
import { X, Plus, Trash2, GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Funil, EstagioFunil } from "@/lib/funis-service"
import { useToast } from "@/hooks/use-toast"

interface EstagiosModalProps {
  isOpen: boolean
  onClose: () => void
  funil: Funil | null
  onSave: () => void
}

const CORES_PREDEFINIDAS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", 
  "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"
]

export function EstagiosModal({ isOpen, onClose, funil, onSave }: EstagiosModalProps) {
  const [estagios, setEstagios] = useState<EstagioFunil[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (funil && isOpen) {
      loadEstagios()
    }
  }, [funil, isOpen])

  const loadEstagios = async () => {
    if (!funil) return
    setIsLoading(true)
    try {
      const response = await fetch(`/api/funis/estagios?codFunil=${funil.CODFUNIL}`)
      if (!response.ok) throw new Error('Falha ao carregar estágios')
      const data = await response.json()
      setEstagios(data)
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddEstagio = () => {
    const novoEstagio: Partial<EstagioFunil> = {
      CODESTAGIO: `temp-${Date.now()}`,
      CODFUNIL: funil?.CODFUNIL || "",
      NOME: "",
      ORDEM: estagios.length + 1,
      COR: CORES_PREDEFINIDAS[estagios.length % CORES_PREDEFINIDAS.length],
      ATIVO: "S"
    }
    setEstagios([...estagios, novoEstagio as EstagioFunil])
  }

  const handleUpdateEstagio = (index: number, field: keyof EstagioFunil, value: any) => {
    const updated = [...estagios]
    updated[index] = { ...updated[index], [field]: value }
    setEstagios(updated)
  }

  const handleRemoveEstagio = (index: number) => {
    setEstagios(estagios.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!funil) return
    setIsSaving(true)

    try {
      for (const estagio of estagios) {
        const isTemp = estagio.CODESTAGIO.startsWith('temp-')
        await fetch('/api/funis/estagios/salvar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...(isTemp ? {} : { CODESTAGIO: estagio.CODESTAGIO }),
            CODFUNIL: funil.CODFUNIL,
            NOME: estagio.NOME,
            ORDEM: estagio.ORDEM,
            COR: estagio.COR
          })
        })
      }
      onSave()
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Falha ao salvar estágios",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen || !funil) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-card rounded-lg shadow-xl w-full max-w-2xl mx-4 p-6 space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Configurar Estágios</h2>
            <p className="text-sm text-muted-foreground">{funil.NOME}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          {estagios.map((estagio, index) => (
            <div key={estagio.CODESTAGIO} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <GripVertical className="w-5 h-5 text-muted-foreground cursor-move" />
              
              <div className="flex-1 space-y-2">
                <Input
                  value={estagio.NOME}
                  onChange={(e) => handleUpdateEstagio(index, 'NOME', e.target.value)}
                  placeholder="Nome do estágio"
                />
              </div>

              <div className="flex gap-1">
                {CORES_PREDEFINIDAS.map((cor) => (
                  <button
                    key={cor}
                    type="button"
                    onClick={() => handleUpdateEstagio(index, 'COR', cor)}
                    className={`w-8 h-8 rounded border-2 transition-all ${
                      estagio.COR === cor ? 'border-foreground scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: cor }}
                  />
                ))}
              </div>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleRemoveEstagio(index)}
                className="text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>

        <Button
          variant="outline"
          onClick={handleAddEstagio}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Estágio
        </Button>

        <div className="flex gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button onClick={handleSave} className="flex-1" disabled={isSaving}>
            {isSaving ? "Salvando..." : "Salvar Estágios"}
          </Button>
        </div>
      </div>
    </div>
  )
}

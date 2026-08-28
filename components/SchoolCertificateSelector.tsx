"use client"

import { useState } from 'react'
import { SchoolCertificate } from './SchoolCertificate'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Label } from './ui/label'

interface SchoolCertificateSelectorProps {
  student: {
    nom: string
    prenom: string
    dateNaissance: string
    lieuNaissance: string
    classe: string
  }
  schoolName?: string
  directorName?: string
  schoolAddress?: string
  schoolPhone?: string
  city?: string
  schoolYear?: string
}

export function SchoolCertificateSelector(props: SchoolCertificateSelectorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<'classic' | 'modern' | 'elegant'>('classic')

  const templates = [
    {
      id: 'classic',
      name: 'Classique',
      description: 'Style traditionnel avec dégradés bleus',
      preview: '🎓'
    },
    {
      id: 'modern',
      name: 'Moderne',
      description: 'Design épuré avec tons gris et noirs',
      preview: '✨'
    },
    {
      id: 'elegant',
      name: 'Élégant',
      description: 'Style raffiné avec tons dorés et beiges',
      preview: '👑'
    }
  ]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Choisir un modèle de certificat</CardTitle>
          <CardDescription>
            Sélectionnez le style de certificat qui convient le mieux à vos besoins
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-select">Modèle de certificat</Label>
              <Select value={selectedTemplate} onValueChange={(value: 'classic' | 'modern' | 'elegant') => setSelectedTemplate(value)}>
                <SelectTrigger id="template-select">
                  <SelectValue placeholder="Choisir un modèle" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center space-x-2">
                        <span>{template.preview}</span>
                        <div>
                          <div className="font-medium">{template.name}</div>
                          <div className="text-sm text-muted-foreground">{template.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {templates.map((template) => (
                <Card
                  key={template.id}
                  className={`cursor-pointer transition-all ${
                    selectedTemplate === template.id
                      ? 'ring-2 ring-blue-500 bg-blue-50'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedTemplate(template.id as 'classic' | 'modern' | 'elegant')}
                >
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl mb-2">{template.preview}</div>
                    <div className="font-medium">{template.name}</div>
                    <div className="text-sm text-muted-foreground">{template.description}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="border rounded-lg p-4 bg-gray-50">
        <h3 className="text-lg font-semibold mb-4">Aperçu du certificat</h3>
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <SchoolCertificate {...props} template={selectedTemplate} />
        </div>
      </div>
    </div>
  )
}

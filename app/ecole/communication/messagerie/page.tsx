"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Send, MessageSquare, Search, Paperclip } from "lucide-react"
import Link from "next/link"
import { serviceEleves } from "@/services/eleves.service"

export default function MessagerieParents() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [searchTerm, setSearchTerm] = useState("")

  const allStudents = serviceEleves.obtenirTousLesEleves()

  // Simulation des conversations
  const conversations = [
    {
      id: "1",
      parentNom: "DUPONT",
      parentPrenom: "Marie",
      eleveNom: "Lucas",
      eleveClasse: "CE1",
      dernierMessage: "Merci pour les informations sur le bulletin.",
      date: "Hier à 14:30",
      nonLu: true,
      messages: [
        { expediteur: "parent", contenu: "Bonjour, je voudrais avoir des informations sur le bulletin de Lucas.", date: "Hier à 10:00" },
        { expediteur: "ecole", contenu: "Bonjour Madame DupONT, le bulletin de Lucas est disponible. Il a eu une moyenne de 16.5/20.", date: "Hier à 11:30" },
        { expediteur: "parent", contenu: "Merci pour les informations sur le bulletin.", date: "Hier à 14:30" },
      ]
    },
    {
      id: "2",
      parentNom: "MARTIN",
      parentPrenom: "Jean",
      eleveNom: "Emma",
      eleveClasse: "CM1",
      dernierMessage: "Emma sera absente demain pour raison médicale.",
      date: "Aujourd'hui à 09:15",
      nonLu: true,
      messages: [
        { expediteur: "parent", contenu: "Emma sera absente demain pour raison médicale.", date: "Aujourd'hui à 09:15" },
      ]
    },
    {
      id: "3",
      parentNom: "BERNARD",
      parentPrenom: "Sophie",
      eleveNom: "Hugo",
      eleveClasse: "CP",
      dernierMessage: "C'est noté, merci de nous avoir prévenus.",
      date: "Il y a 2 jours",
      nonLu: false,
      messages: [
        { expediteur: "ecole", contenu: "Madame Bernard, Hugo a eu un retard ce matin.", date: "Il y a 2 jours" },
        { expediteur: "parent", contenu: "C'est noté, merci de nous avoir prévenus.", date: "Il y a 2 jours" },
      ]
    },
  ]

  const filteredConversations = conversations.filter(conv =>
    conv.parentNom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.parentPrenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.eleveNom.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const selectedConv = conversations.find(c => c.id === selectedConversation)

  const handleSendMessage = () => {
    if (!message.trim() || !selectedConversation) return
    
    console.log("Message envoyé:", message)
    setMessage("")
    // TODO: Implémenter l'envoi du message
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="sm" asChild>
            <Link href="/ecole/tableau-bord">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <MessageSquare className="h-6 w-6" />
              Messagerie avec les Parents
            </h1>
            <p className="text-gray-600">Communication avec les responsables légaux</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
          {/* Liste des conversations */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Conversations</CardTitle>
              <CardDescription>{filteredConversations.length} conversations actives</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              <div className="space-y-2">
                <div className="flex gap-2 mb-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Rechercher..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Button variant="outline" size="sm">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>

                {filteredConversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`p-4 rounded-lg cursor-pointer transition-colors ${
                      selectedConversation === conv.id ? 'bg-blue-50 border-2 border-blue-500' : 'bg-gray-50 hover:bg-gray-100'
                    } ${conv.nonLu ? 'border-l-4 border-l-blue-500' : ''}`}
                    onClick={() => setSelectedConversation(conv.id)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold">
                          {conv.parentPrenom} {conv.parentNom}
                        </p>
                        <p className="text-sm text-gray-600">
                          {conv.eleveNom} - {conv.eleveClasse}
                        </p>
                      </div>
                      {conv.nonLu && (
                        <div className="w-3 h-3 bg-blue-500 rounded-full" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 truncate">{conv.dernierMessage}</p>
                    <p className="text-xs text-gray-500 mt-1">{conv.date}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Zone de conversation */}
          <Card className="md:col-span-2 flex flex-col">
            {selectedConv ? (
              <>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>
                        {selectedConv.parentPrenom} {selectedConv.parentNom}
                      </CardTitle>
                      <CardDescription>
                        Parent de {selectedConv.eleveNom} ({selectedConv.eleveClasse})
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm">
                      Voir le profil
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                    {selectedConv.messages.map((msg, index) => (
                      <div
                        key={index}
                        className={`flex ${msg.expediteur === 'ecole' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] p-3 rounded-lg ${
                            msg.expediteur === 'ecole'
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-200'
                          }`}
                        >
                          <p>{msg.contenu}</p>
                          <p className={`text-xs mt-1 ${msg.expediteur === 'ecole' ? 'text-blue-100' : 'text-gray-500'}`}>
                            {msg.date}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Zone de saisie */}
                  <div className="border-t pt-4">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Paperclip className="h-4 w-4" />
                      </Button>
                      <Textarea
                        placeholder="Écrivez votre message..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="flex-1 min-h-[60px]"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleSendMessage()
                          }
                        }}
                      />
                      <Button onClick={handleSendMessage}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </>
            ) : (
              <CardContent className="flex-1 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>Sélectionnez une conversation pour commencer</p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

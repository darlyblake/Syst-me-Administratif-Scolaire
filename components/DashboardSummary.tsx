"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, UserCheck, UserX, Clock, AlertCircle } from "lucide-react"
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts"

interface DashboardSummaryProps {
  stats: {
    total: number
    active: number
    inactive: number
    onLeave: number
    suspended: number
  }
  uniqueSubjects: string[]
  teachers: any[] // Type to be refined based on DonneesEnseignant
}

const COLORS = ["#10B981", "#EF4444", "#3B82F6", "#F59E0B", "#6B7280"]

const statusData = (stats: DashboardSummaryProps["stats"]) => [
  { name: "Actifs", value: stats.active, color: "#10B981" },
  { name: "Inactifs", value: stats.inactive, color: "#EF4444" },
  { name: "En congé", value: stats.onLeave, color: "#3B82F6" },
  { name: "Suspendus", value: stats.suspended, color: "#F59E0B" },
]

const subjectsData = (uniqueSubjects: string[], teachers: any[]) => {
  const subjectCounts: { [key: string]: number } = {}

  teachers.forEach(teacher => {
    teacher.matieres.forEach((subject: string) => {
      subjectCounts[subject] = (subjectCounts[subject] || 0) + 1
    })
  })

  return uniqueSubjects.map(subject => ({
    name: subject,
    value: subjectCounts[subject] || 0
  })).filter(item => item.value > 0)
}

export function DashboardSummary({ stats, uniqueSubjects, teachers }: DashboardSummaryProps) {
  const pieData = statusData(stats)
  const barData = subjectsData(uniqueSubjects, teachers)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Cartes de statistiques */}
      <Card className="col-span-1 md:col-span-2 lg:col-span-1 animate-fade-in">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Enseignants</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground">
            +{Math.round((stats.active / stats.total) * 100)}% actifs
          </p>
        </CardContent>
      </Card>

      <Card className="col-span-1 animate-fade-in">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Actifs</CardTitle>
          <UserCheck className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          <p className="text-xs text-muted-foreground">Enseignants disponibles</p>
        </CardContent>
      </Card>

      <Card className="col-span-1 animate-fade-in">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Inactifs</CardTitle>
          <UserX className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{stats.inactive}</div>
          <p className="text-xs text-muted-foreground">Enseignants inactifs</p>
        </CardContent>
      </Card>

      <Card className="col-span-1 animate-fade-in">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">En congé</CardTitle>
          <Clock className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{stats.onLeave}</div>
          <p className="text-xs text-muted-foreground">Enseignants en congé</p>
        </CardContent>
      </Card>

      {/* Graphique en secteurs pour la répartition des statuts */}
      <Card className="col-span-1 md:col-span-2 lg:col-span-2 animate-slide-up">
        <CardHeader>
          <CardTitle>Répartition des statuts</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent = 0 }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Graphique en barres pour les matières */}
      <Card className="col-span-1 md:col-span-2 lg:col-span-2 animate-slide-up">
        <CardHeader>
          <CardTitle>Répartition par matières</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Badges de statut rapide */}
      <Card className="col-span-1 md:col-span-2 lg:col-span-4 animate-fade-in">
        <CardHeader>
          <CardTitle>Statuts rapides</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge variant="default" className="bg-green-100 text-green-800">
            Actifs: {stats.active}
          </Badge>
          <Badge variant="secondary" className="bg-red-100 text-red-800">
            Inactifs: {stats.inactive}
          </Badge>
          <Badge variant="outline" className="border-blue-200 text-blue-800">
            En congé: {stats.onLeave}
          </Badge>
          <Badge variant="destructive" className="bg-orange-100 text-orange-800">
            Suspendus: {stats.suspended}
          </Badge>
          {stats.suspended > 0 && (
            <Badge variant="destructive">
              <AlertCircle className="h-3 w-3 mr-1" />
              {stats.suspended} enseignant(s) suspendu(s)
            </Badge>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

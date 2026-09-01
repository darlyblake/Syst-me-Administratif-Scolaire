import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, Upload } from "lucide-react"
import { Input } from "@/components/ui/input"

interface ImportExportToolsProps {
  onExportCSV: () => void
  onExportIdentifiants: () => void
  onDownloadTemplate: () => void
  onImportCSV: (event: React.ChangeEvent<HTMLInputElement>) => void
}

export default function ImportExportTools({ onExportCSV, onExportIdentifiants, onDownloadTemplate, onImportCSV }: ImportExportToolsProps) {
  return (
    <Card className="mb-6 w-full min-w-0">
      <CardHeader className="px-4 sm:px-6">
        <CardTitle>Outils d'import/export</CardTitle>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Button onClick={onExportCSV} variant="outline" className="w-full min-w-0 justify-center sm:justify-start">
            <Download className="mr-2 h-4 w-4 shrink-0" /><span className="truncate">Exporter données</span>
          </Button>
          <Button onClick={onExportIdentifiants} variant="outline" className="w-full min-w-0 justify-center sm:justify-start">
            <Download className="mr-2 h-4 w-4 shrink-0" /><span className="truncate">Exporter identifiants</span>
          </Button>
          <Button onClick={onDownloadTemplate} variant="outline" className="w-full min-w-0 justify-center sm:justify-start">
            <Download className="mr-2 h-4 w-4 shrink-0" /><span className="truncate">Template d'import</span>
          </Button>
          <div className="min-w-0">
            <Input type="file" accept=".csv" onChange={onImportCSV} className="hidden" id="import-file" />
            <Button variant="outline" asChild className="w-full min-w-0 justify-center sm:justify-start">
              <label htmlFor="import-file" className="flex min-w-0 cursor-pointer items-center justify-center sm:justify-start">
                <Upload className="mr-2 h-4 w-4 shrink-0" /><span className="truncate">Importer CSV</span>
              </label>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

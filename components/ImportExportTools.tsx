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

export default function ImportExportTools({
  onExportCSV,
  onExportIdentifiants,
  onDownloadTemplate,
  onImportCSV
}: ImportExportToolsProps) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Outils d'import/export</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4">
          <Button onClick={onExportCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exporter données
          </Button>
          <Button onClick={onExportIdentifiants} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exporter identifiants
          </Button>
          <Button onClick={onDownloadTemplate} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Template d'import
          </Button>
          <div>
            <Input
              type="file"
              accept=".csv"
              onChange={onImportCSV}
              className="hidden"
              id="import-file"
            />
            <Button variant="outline" asChild>
              <label htmlFor="import-file">
                <Upload className="h-4 w-4 mr-2" />
                Importer CSV
              </label>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
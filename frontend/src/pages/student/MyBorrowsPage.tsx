import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import HoldsTab from './components/HoldsTab'
import BorrowingTab from './components/BorrowingTab'
import HistoryTab from './components/HistoryTab'

export default function MyBorrowsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Sách đã mượn</h2>
        <p className="text-muted-foreground">Quản lý sách đã mượn, đặt trước và lịch sử</p>
      </div>

      <Tabs defaultValue="holds">
        <TabsList>
          <TabsTrigger value="holds">Đang đặt trước</TabsTrigger>
          <TabsTrigger value="borrowing">Đang mượn</TabsTrigger>
          <TabsTrigger value="history">Lịch sử trả</TabsTrigger>
        </TabsList>
        <TabsContent value="holds"><HoldsTab /></TabsContent>
        <TabsContent value="borrowing"><BorrowingTab /></TabsContent>
        <TabsContent value="history"><HistoryTab /></TabsContent>
      </Tabs>
    </div>
  )
}

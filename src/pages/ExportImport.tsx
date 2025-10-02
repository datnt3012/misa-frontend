import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, TrendingDown, TrendingUp, History, ArrowUpDown } from "lucide-react";
import ExportSlips from "@/pages/ExportSlips";
import ImportSlips from "@/components/inventory/ImportSlips";
import InventoryHistory from "@/components/inventory/InventoryHistory";
import { useToast } from "@/hooks/use-toast";
import { PermissionGuard } from "@/components/PermissionGuard";
import { usePermissions } from "@/hooks/usePermissions";

const ExportImportContent = () => {
  const [activeTab, setActiveTab] = useState("exports");
  const { toast } = useToast();
  const { hasPermission } = usePermissions();

  // Permission checks
  const canManageImports = hasPermission('WAREHOUSE_RECEIPTS_CREATE');
  const canApproveImports = hasPermission('WAREHOUSE_RECEIPTS_APPROVE');


  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-foreground">Quản Lý Xuất Nhập Kho</h1>
          <p className="text-muted-foreground">Quản lý phiếu xuất kho, nhập kho và theo dõi lịch sử</p>
        </div>

        {/* Tabs for different sections */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="exports" className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              Xuất kho
            </TabsTrigger>
            <TabsTrigger value="imports" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Nhập kho
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Lịch sử xuất nhập kho
            </TabsTrigger>
          </TabsList>

          {/* Export Management Tab */}
          <TabsContent value="exports" className="space-y-6">
            <PermissionGuard requiredPermissions={['WAREHOUSE_RECEIPTS_VIEW']}>
              <ExportSlips />
            </PermissionGuard>
          </TabsContent>

          {/* Import Management Tab */}
          <TabsContent value="imports" className="space-y-6">
            <PermissionGuard requiredPermissions={['WAREHOUSE_RECEIPTS_VIEW']}>
              <ImportSlips 
                canManageImports={canManageImports}
                canApproveImports={canApproveImports}
              />
            </PermissionGuard>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <PermissionGuard 
              requiredPermissions={['WAREHOUSE_RECEIPTS_VIEW']}
              requireAll={false}
            >
              <InventoryHistory />
            </PermissionGuard>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

const ExportImport = () => {
  return <ExportImportContent />;
};

export default ExportImport;

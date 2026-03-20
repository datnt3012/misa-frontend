import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingDown, TrendingUp, History, ArrowRight } from "lucide-react";
import ExportSlips from "@/pages/ExportSlips";
import ImportSlips from "@/pages/ImportSlips";
import MovingSlips from "@/components/inventory/MovingSlips";
import InventoryHistory from "@/components/inventory/InventoryHistory";
import { useToast } from "@/hooks/use-toast";
import { PermissionGuard } from "@/components/PermissionGuard";
import { usePermissions } from "@/hooks/usePermissions";

const ExportImportContent = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Initialize tab from URL or default to 'exports'
  const getTabFromUrl = () => {
    const tab = searchParams.get('tab');
    return tab && ['exports', 'imports', 'moving', 'history'].includes(tab) ? tab : 'exports';
  };
  
  const [activeTab, setActiveTab] = useState(() => getTabFromUrl());
  const { hasPermission } = usePermissions();

  // Handle tab change from user interaction
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('tab', value);
    // Clear search parameter when switching tabs to avoid old search terms affecting data
    newSearchParams.delete('search');
    setSearchParams(newSearchParams, { replace: true });
  };

  // Update activeTab when URL changes (e.g., browser back/forward)
  useEffect(() => {
    const tabFromUrl = getTabFromUrl();
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Permission checks
  const canManageImports = hasPermission('WAREHOUSE_RECEIPTS_CREATE');
  const canApproveImports = hasPermission('WAREHOUSE_RECEIPTS_APPROVE');


  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-full mx-auto space-y-4">
        {/* Tabs for different sections */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="exports" className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              Xuất kho
            </TabsTrigger>
            <TabsTrigger value="imports" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Nhập kho
            </TabsTrigger>
            <TabsTrigger value="moving" className="flex items-center gap-2">
              <ArrowRight className="w-4 h-4" />
              Chuyển kho
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Lịch sử
            </TabsTrigger>
          </TabsList>

          {/* Export Management Tab */}
          <TabsContent value="exports" className="space-y-6">
            <PermissionGuard requiredPermissions={['WAREHOUSE_RECEIPTS_VIEW']}>
              <ExportSlips key="exports" />
            </PermissionGuard>
          </TabsContent>

          {/* Import Management Tab */}
          <TabsContent value="imports" className="space-y-6">
            <ImportSlips
              key="imports"
              canManageImports={canManageImports}
              canApproveImports={canApproveImports}
            />
          </TabsContent>

          {/* Moving Management Tab */}
          <TabsContent value="moving" className="space-y-6">
            <PermissionGuard requiredPermissions={['WAREHOUSE_RECEIPTS_VIEW']}>
              <MovingSlips key="moving" />
            </PermissionGuard>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <PermissionGuard 
              requiredPermissions={['WAREHOUSE_RECEIPTS_VIEW']}
              requireAll={false}
            >
              <InventoryHistory key="history" />
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

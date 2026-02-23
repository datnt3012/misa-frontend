import { useSearchParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Building2 } from "lucide-react";
import { CustomersContent } from "./Customers";
import { SuppliersContent } from "./Suppliers";

const Relations = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "customers";

  return (
    <div className="min-h-screen bg-background space-y-4 p-6 sm:p-6 md:p-7">
      <div className="mx-auto space-y-6">
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            setSearchParams({ tab: value });
          }}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="customers">Khách Hàng</TabsTrigger>
            <TabsTrigger value="suppliers">
              <Building2 className="w-4 h-4 mr-2" />
              Nhà Cung Cấp
            </TabsTrigger>
          </TabsList>

          <TabsContent value="customers">
            <CustomersContent />
          </TabsContent>

          <TabsContent value="suppliers">
            <SuppliersContent />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Relations;

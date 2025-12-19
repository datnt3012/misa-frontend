import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit, Trash2, Plus, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { orderApi } from "@/api/order.api";
interface BankOption {
  id: string;
  name: string;
  code?: string;
}
interface BankSelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}
const BankSelector: React.FC<BankSelectorProps> = ({
  value,
  onValueChange,
  placeholder = "Chọn ngân hàng"
}) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newBankData, setNewBankData] = useState({ accountNumber: "", bankName: "" });
  const [editingBank, setEditingBank] = useState<BankOption | null>(null);
  useEffect(() => {
    loadBanks();
  }, []);
  // Set default bank when banks are loaded
  useEffect(() => {
    if (banks.length > 0 && !value) {
      const defaultBank = banks[0];
      onValueChange(defaultBank.code);
    }
  }, [banks, value, onValueChange]);
  const loadBanks = async () => {
    try {
      setLoading(true);
      const bankList = await orderApi.getBanks();
      setBanks(bankList);
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách ngân hàng",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  const selectedBank = banks.find(bank => bank.code === value);
  const handleSelect = (bankId: string) => {
    const selectedBank = banks.find(b => b.id === bankId);
    // Use account number (code) instead of ID for payment storage
    onValueChange(selectedBank?.code || bankId);
    setOpen(false);
  };
  const handleAddNew = () => {
    setNewBankData({ accountNumber: "", bankName: "" });
    setEditingBank(null);
    setAddDialogOpen(true);
    setOpen(false);
  };
  const handleEdit = (bank: BankOption) => {
    setNewBankData({ accountNumber: bank.code, bankName: bank.name });
    setEditingBank(bank);
    setAddDialogOpen(true);
    setOpen(false);
  };
  const handleDelete = async (bank: BankOption) => {
    if (!confirm(`Bạn có chắc muốn xóa ngân hàng "${bank.name}"?`)) {
      return;
    }
    try {
      setLoading(true);
      await orderApi.deleteBank(bank.id);
      toast({
        title: "Thành công",
        description: "Đã xóa ngân hàng",
      });
      await loadBanks();
      // If the deleted bank was selected, clear the selection
      if (value === bank.code) {
        onValueChange("");
      }
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể xóa ngân hàng",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  const handleSaveBank = async () => {
    if (!newBankData.accountNumber.trim() || !newBankData.bankName.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập đầy đủ thông tin",
        variant: "destructive",
      });
      return;
    }
    try {
      setLoading(true);
      if (editingBank) {
        await orderApi.updateBank(editingBank.id, {
          accountNumber: newBankData.accountNumber.trim(),
          bankName: newBankData.bankName.trim(),
        });
        toast({
          title: "Thành công",
          description: "Đã cập nhật ngân hàng",
        });
      } else {
        await orderApi.createBank({
          accountNumber: newBankData.accountNumber.trim(),
          bankName: newBankData.bankName.trim(),
        });
        toast({
          title: "Thành công",
          description: "Đã thêm ngân hàng mới",
        });
      }
      await loadBanks();
      setAddDialogOpen(false);
      setNewBankData({ accountNumber: "", bankName: "" });
      setEditingBank(null);
    } catch (error) {
      toast({
        title: "Lỗi",
        description: editingBank ? "Không thể cập nhật ngân hàng" : "Không thể thêm ngân hàng",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedBank ? `${selectedBank.code} - ${selectedBank.name}` : placeholder}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Tìm ngân hàng..." />
          <CommandList>
            <CommandGroup>
              <div
                onClick={handleAddNew}
                className="flex items-center px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer border-b"
              >
                <Plus className="mr-2 h-4 w-4" />
                <span>Thêm ngân hàng</span>
              </div>
              {banks.map((bank) => (
                <div key={bank.id} className="flex items-center justify-between px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer">
                  <span onClick={() => handleSelect(bank.id)} className="flex-1 cursor-pointer">
                    {bank.code} - {bank.name}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(bank);
                      }}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(bank);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
    <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingBank ? "Chỉnh sửa ngân hàng" : "Thêm ngân hàng mới"}</DialogTitle>
          <DialogDescription>
            {editingBank ? "Cập nhật thông tin ngân hàng" : "Nhập thông tin cho ngân hàng mới"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="accountNumber">Số tài khoản</Label>
            <Input
              id="accountNumber"
              value={newBankData.accountNumber}
              onChange={(e) => setNewBankData(prev => ({ ...prev, accountNumber: e.target.value }))}
              placeholder="Nhập số tài khoản"
            />
          </div>
          <div>
            <Label htmlFor="bankName">Tên ngân hàng</Label>
            <Input
              id="bankName"
              value={newBankData.bankName}
              onChange={(e) => setNewBankData(prev => ({ ...prev, bankName: e.target.value }))}
              placeholder="Nhập tên ngân hàng"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
            Hủy
          </Button>
          <Button onClick={handleSaveBank} disabled={loading}>
            {loading ? "Đang xử lý..." : (editingBank ? "Cập nhật" : "Thêm")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </>
);
};
export default BankSelector;
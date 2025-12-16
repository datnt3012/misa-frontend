import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Edit, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { orderApi } from "@/api/order.api";

interface Bank {
  id: string;
  accountNumber: string;
  bankName: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

interface BankManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBankUpdated?: () => void;
}

interface BankFormData {
  accountNumber: string;
  bankName: string;
}

const BankManagementDialog: React.FC<BankManagementDialogProps> = ({
  open,
  onOpenChange,
  onBankUpdated
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<BankFormData>({
    accountNumber: "",
    bankName: "",
  });

  useEffect(() => {
    if (open) {
      loadBanks();
    }
  }, [open]);

  const loadBanks = async () => {
    try {
      setLoading(true);
      const response = await orderApi.getAllBanks({ includeDeleted: false });
      setBanks(response.banks);
    } catch (error) {
      console.error('Error loading banks:', error);
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách ngân hàng",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.accountNumber.trim() || !formData.bankName.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập đầy đủ thông tin",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      await orderApi.createBank({
        accountNumber: formData.accountNumber.trim(),
        bankName: formData.bankName.trim(),
      });

      toast({
        title: "Thành công",
        description: "Đã tạo ngân hàng mới",
      });

      setFormData({ accountNumber: "", bankName: "" });
      setShowForm(false);
      await loadBanks();
      onBankUpdated?.();
    } catch (error) {
      console.error('Error creating bank:', error);
      toast({
        title: "Lỗi",
        description: "Không thể tạo ngân hàng",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingBank || !formData.accountNumber.trim() || !formData.bankName.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập đầy đủ thông tin",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      await orderApi.updateBank(editingBank.id, {
        accountNumber: formData.accountNumber.trim(),
        bankName: formData.bankName.trim(),
      });

      toast({
        title: "Thành công",
        description: "Đã cập nhật ngân hàng",
      });

      setEditingBank(null);
      setFormData({ accountNumber: "", bankName: "" });
      setShowForm(false);
      await loadBanks();
      onBankUpdated?.();
    } catch (error) {
      console.error('Error updating bank:', error);
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật ngân hàng",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (bank: Bank) => {
    if (!confirm(`Bạn có chắc muốn xóa ngân hàng "${bank.bankName}"?`)) {
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
      onBankUpdated?.();
    } catch (error) {
      console.error('Error deleting bank:', error);
      toast({
        title: "Lỗi",
        description: "Không thể xóa ngân hàng",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (bank: Bank) => {
    setEditingBank(bank);
    setFormData({
      accountNumber: bank.accountNumber,
      bankName: bank.bankName,
    });
    setShowForm(true);
  };

  const startCreate = () => {
    setEditingBank(null);
    setFormData({ accountNumber: "", bankName: "" });
    setShowForm(true);
  };

  const cancelForm = () => {
    setEditingBank(null);
    setFormData({ accountNumber: "", bankName: "" });
    setShowForm(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quản lý ngân hàng</DialogTitle>
          <DialogDescription>
            Thêm, sửa, xóa thông tin ngân hàng cho thanh toán chuyển khoản
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!showForm && (
            <div className="flex justify-end">
              <Button onClick={startCreate} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Thêm ngân hàng
              </Button>
            </div>
          )}

          {showForm && (
            <div className="border rounded-lg p-4 space-y-4">
              <h3 className="font-medium">
                {editingBank ? "Chỉnh sửa ngân hàng" : "Thêm ngân hàng mới"}
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="accountNumber">Số tài khoản <span className="text-red-500">*</span></Label>
                  <Input
                    id="accountNumber"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, accountNumber: e.target.value }))}
                    placeholder="Nhập số tài khoản"
                  />
                </div>
                <div>
                  <Label htmlFor="bankName">Tên ngân hàng <span className="text-red-500">*</span></Label>
                  <Input
                    id="bankName"
                    value={formData.bankName}
                    onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
                    placeholder="Nhập tên ngân hàng"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={cancelForm}>
                  Hủy
                </Button>
                <Button onClick={editingBank ? handleUpdate : handleCreate} disabled={loading}>
                  {loading ? "Đang xử lý..." : (editingBank ? "Cập nhật" : "Thêm")}
                </Button>
              </div>
            </div>
          )}

          <Table className="border border-border/30 rounded-lg overflow-hidden">
            <TableHeader>
              <TableRow className="bg-slate-50 border-b-2 border-slate-200">
                <TableHead className="border-r border-slate-200 font-semibold text-slate-700">
                  Số tài khoản
                </TableHead>
                <TableHead className="border-r border-slate-200 font-semibold text-slate-700">
                  Tên ngân hàng
                </TableHead>
                <TableHead className="border-r border-slate-200 font-semibold text-slate-700">
                  Ngày tạo
                </TableHead>
                <TableHead className="font-semibold text-slate-700">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {banks.map((bank) => (
                <TableRow key={bank.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <TableCell className="border-r border-slate-100">
                    {bank.accountNumber}
                  </TableCell>
                  <TableCell className="border-r border-slate-100">
                    {bank.bankName}
                  </TableCell>
                  <TableCell className="border-r border-slate-100">
                    {new Date(bank.createdAt).toLocaleDateString('vi-VN')}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEdit(bank)}
                        disabled={loading}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(bank)}
                        disabled={loading}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {banks.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                    Chưa có ngân hàng nào
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BankManagementDialog;
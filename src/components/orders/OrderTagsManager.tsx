import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { orderTagsApi } from "@/api/orderTags.api";

interface OrderTagsManagerProps {
  orderId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTagsUpdated: () => void;
}

interface OrderTag {
  id: string;
  name: string;
  color: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export const OrderTagsManager: React.FC<OrderTagsManagerProps> = ({
  orderId,
  open,
  onOpenChange,
  onTagsUpdated,
}) => {
  const [allTags, setAllTags] = useState<OrderTag[]>([]);
  const [assignedTags, setAssignedTags] = useState<OrderTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewTagForm, setShowNewTagForm] = useState(false);
  const [newTag, setNewTag] = useState({ name: '', color: '#64748b', description: '' });
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (open) {
      loadTags();
      loadAssignedTags();
    }
  }, [open, orderId]);

  const loadTags = async () => {
    try {
      const tags = await orderTagsApi.getAllTags();
      setAllTags(tags);
    } catch (error) {
      console.error('Error loading tags:', error);
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách nhãn",
        variant: "destructive",
      });
    }
  };

  const loadAssignedTags = async () => {
    try {
      const assignedTags = await orderTagsApi.getAssignedTags(orderId);
      setAssignedTags(assignedTags);
    } catch (error) {
      console.error('Error loading assigned tags:', error);
      toast({
        title: "Lỗi",
        description: "Không thể tải nhãn đã gán",
        variant: "destructive",
      });
    }
  };

  const createNewTag = async () => {
    if (!newTag.name.trim()) return;

    setLoading(true);
    try {
      const createdTag = await orderTagsApi.createTag({
        name: newTag.name.trim(),
        color: newTag.color,
        description: newTag.description.trim() || undefined,
      });

      setAllTags([...allTags, createdTag]);
      setNewTag({ name: '', color: '#64748b', description: '' });
      setShowNewTagForm(false);
      
      toast({
        title: "Thành công",
        description: "Đã tạo nhãn mới",
      });
    } catch (error) {
      console.error('Error creating tag:', error);
      toast({
        title: "Lỗi",
        description: "Không thể tạo nhãn mới",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const assignTag = async (tagId: string) => {
    setLoading(true);
    try {
      await orderTagsApi.assignTag(orderId, tagId);

      const tag = allTags.find(t => t.id === tagId);
      if (tag) {
        setAssignedTags([...assignedTags, tag]);
      }
      
      toast({
        title: "Thành công",
        description: "Đã gán nhãn cho đơn hàng",
      });
      
      onTagsUpdated();
    } catch (error) {
      console.error('Error assigning tag:', error);
      toast({
        title: "Lỗi",
        description: "Không thể gán nhãn",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const removeTag = async (tagId: string) => {
    setLoading(true);
    try {
      await orderTagsApi.removeTag(orderId, tagId);

      setAssignedTags(assignedTags.filter(tag => tag.id !== tagId));
      
      toast({
        title: "Thành công",
        description: "Đã bỏ nhãn khỏi đơn hàng",
      });
      
      onTagsUpdated();
    } catch (error) {
      console.error('Error removing tag:', error);
      toast({
        title: "Lỗi",
        description: "Không thể bỏ nhãn",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const unassignedTags = allTags.filter(tag => !assignedTags.find(assigned => assigned.id === tag.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Quản lý nhãn đơn hàng</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Assigned Tags */}
          <div>
            <h4 className="font-medium mb-3">Nhãn đã gán</h4>
            <div className="flex flex-wrap gap-2">
              {assignedTags.length > 0 ? (
                assignedTags.map((tag) => (
                  <Badge
                    key={tag.id}
                    style={{ backgroundColor: tag.color, color: 'white' }}
                    className="flex items-center gap-1"
                  >
                    {tag.name}
                    <button
                      onClick={() => removeTag(tag.id)}
                      className="ml-1 hover:bg-black/20 rounded p-0.5"
                      disabled={loading}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))
              ) : (
                <Badge variant="destructive">Chưa đối soát</Badge>
              )}
            </div>
          </div>

          {/* Available Tags */}
          <div>
            <h4 className="font-medium mb-3">Nhãn có sẵn</h4>
            <div className="flex flex-wrap gap-2">
              {unassignedTags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => assignTag(tag.id)}
                  style={{ borderColor: tag.color, color: tag.color }}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  {tag.name}
                </Badge>
              ))}
              {unassignedTags.length === 0 && (
                <span className="text-muted-foreground text-sm">Tất cả nhãn đã được gán</span>
              )}
            </div>
          </div>

          {/* Create New Tag */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">Tạo nhãn mới</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNewTagForm(!showNewTagForm)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Thêm nhãn
              </Button>
            </div>

            {showNewTagForm && (
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tag-name">Tên nhãn</Label>
                    <Input
                      id="tag-name"
                      value={newTag.name}
                      onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
                      placeholder="Nhập tên nhãn"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tag-color">Màu sắc</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={newTag.color}
                        onChange={(e) => setNewTag({ ...newTag, color: e.target.value })}
                        className="w-12 h-10 border rounded"
                      />
                      <Input
                        value={newTag.color}
                        onChange={(e) => setNewTag({ ...newTag, color: e.target.value })}
                        placeholder="#000000"
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <Label htmlFor="tag-description">Mô tả (tuỳ chọn)</Label>
                  <Textarea
                    id="tag-description"
                    value={newTag.description}
                    onChange={(e) => setNewTag({ ...newTag, description: e.target.value })}
                    placeholder="Mô tả nhãn"
                    rows={2}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={createNewTag} disabled={loading || !newTag.name.trim()}>
                    Tạo nhãn
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowNewTagForm(false);
                      setNewTag({ name: '', color: '#64748b', description: '' });
                    }}
                  >
                    Hủy
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};


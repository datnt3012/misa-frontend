import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { orderTagsApi, OrderTag as ApiOrderTag } from "@/api/orderTags.api";
import { getErrorMessage } from "@/lib/error-utils";
interface OrderTagsManagerProps {
  orderId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTagsUpdated: () => void;
  onAssignedTagsChange?: (tags: OrderTag[]) => void;
  currentTags?: OrderTag[];
  availableTags?: OrderTag[];
}
type OrderTag = ApiOrderTag;
const normalizeLabel = (value?: string | null) => value?.toString().trim().toLowerCase() || "";
const RECONCILED_NAMES = ["đã đối soát", "reconciled"];
const PENDING_NAMES = ["chưa đối soát", "pending reconciliation"];
const isMatchingTag = (tag: OrderTag, candidates: string[]) => {
  const normalizedTargets = candidates.map(normalizeLabel);
  const sources = [tag.name, tag.raw_name, tag.display_name];
  return sources.some((source) => normalizedTargets.includes(normalizeLabel(source)));
};
const isReconciledTag = (tag: OrderTag) => isMatchingTag(tag, RECONCILED_NAMES);
const isPendingTag = (tag: OrderTag) => isMatchingTag(tag, PENDING_NAMES);
const isReconciliationTag = (tag: OrderTag) => isReconciledTag(tag) || isPendingTag(tag);
export const OrderTagsManager: React.FC<OrderTagsManagerProps> = ({
  orderId,
  open,
  onOpenChange,
  onTagsUpdated,
  onAssignedTagsChange,
  currentTags = [],
  availableTags = [],
}) => {
  const [allTags, setAllTags] = useState<OrderTag[]>(availableTags);
  const [assignedTags, setAssignedTags] = useState<OrderTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewTagForm, setShowNewTagForm] = useState(false);
  const [newTag, setNewTag] = useState({ name: '', color: '#64748b', description: '' });
  const { toast } = useToast();
  useEffect(() => {
    if (availableTags.length) {
      setAllTags(availableTags);
    }
  }, [availableTags]);
  useEffect(() => {
    if (open) {
      // Always load tags when dialog opens to ensure we have the latest data
      // This ensures that even if a tag was just created or updated, we have it
      loadTags();
    }
  }, [open, orderId]);
  // Separate useEffect to handle currentTags updates - runs after allTags is loaded
  useEffect(() => {
    if (open && currentTags && allTags.length > 0) {
      // Map currentTags to full tag objects from allTags to ensure we have all properties
      const assignedTagsFromProps = currentTags
        .map(tag => {
          // ALWAYS prioritize finding by ID first (API returns IDs in order.tags)
          // This is the most reliable way to match tags
          const matchedById = allTags.find(t => t.id === tag.id);
          if (matchedById) {
            return matchedById;
          }
          // If not found by ID, try to find by name/display_name/raw_name
          // (fallback for cases where tags are passed as names)
          const matchedByName = allTags.find(t => 
            t.name === tag.name || 
            t.display_name === tag.name || 
            t.raw_name === tag.name ||
            t.name === tag.display_name ||
            t.display_name === tag.display_name ||
            t.raw_name === tag.raw_name ||
            // Also try matching using tagMatchesNames logic
            isMatchingTag(t, [tag.name || '', tag.display_name || '', tag.raw_name || ''])
          );
          if (matchedByName) {
            return matchedByName;
          }
          // Fallback: use the tag from props, but ensure it has at least a display name
          const displayName = tag.display_name || tag.name || tag.raw_name;
          return {
            id: tag.id,
            name: displayName || tag.id,
            display_name: displayName || tag.id,
            raw_name: tag.raw_name || tag.name || tag.id,
            color: tag.color || '#64748b',
            description: tag.description,
          } as OrderTag;
        })
        .filter((tag): tag is OrderTag => Boolean(tag));
      setAssignedTags(assignedTagsFromProps);
      onAssignedTagsChange?.(assignedTagsFromProps);
    } else if (open && currentTags && currentTags.length === 0) {
      // Clear assigned tags if currentTags is empty
      setAssignedTags([]);
      onAssignedTagsChange?.([]);
    }
  }, [currentTags, open, allTags]);
  const loadTags = async () => {
    try {
      // Only load tags with type 'order'
      const tags = await orderTagsApi.getAllTags({ type: 'order' });
      setAllTags(tags);
      // The useEffect with [currentTags, open, allTags] dependency will handle
      // mapping currentTags to full tag objects when allTags is loaded
    } catch (error) {
      toast({
        title: "Lỗi",
        description: getErrorMessage(error, "Không thể tải danh sách nhãn"),
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
        type: 'order', // Ensure new tags are created with type 'order'
      });
      setAllTags((prev) => {
        const next = prev.some(tag => tag.id === createdTag.id) ? prev : [...prev, createdTag];
        return next;
      });
      setNewTag({ name: '', color: '#64748b', description: '' });
      setShowNewTagForm(false);
      toast({
        title: "Thành công",
        description: "Đã tạo nhãn mới",
      });
      await loadTags();
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể tạo nhãn mới",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  const updateOrderTags = async (updatedList: OrderTag[], successMessage: string) => {
    setLoading(true);
    try {
      await orderTagsApi.updateOrderTags(orderId, updatedList.map(tag => tag.id));
      setAssignedTags(updatedList);
      onAssignedTagsChange?.(updatedList);
      toast({
        title: "Thành công",
        description: successMessage,
      });
      onTagsUpdated();
    } catch (error) {
      toast({
        title: "Lỗi",
        description: getErrorMessage(error, "Không thể cập nhật nhãn"),
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };
  const assignTag = async (tagId: string) => {
    if (assignedTags.some(tag => tag.id === tagId)) {
      return;
    }
    const tag = allTags.find(t => t.id === tagId);
    if (!tag) {
      toast({
        title: "Lỗi",
        description: "Không tìm thấy nhãn trong danh sách",
        variant: "destructive",
      });
      return;
    }
    let updated = [...assignedTags, tag];
    if (isReconciledTag(tag)) {
      updated = updated.filter(existing => !isPendingTag(existing));
    } else if (isPendingTag(tag)) {
      updated = updated.filter(existing => !isReconciledTag(existing));
    }
    try {
      await updateOrderTags(updated, "Đã gán nhãn cho đơn hàng");
    } catch {
      // errors already handled inside updateOrderTags
    }
  };
  const removeTag = async (tagId: string) => {
    const tagToRemove = assignedTags.find(tag => tag.id === tagId);
    if (!tagToRemove) return;
    if (isReconciliationTag(tagToRemove)) {
      const reconciliationTags = assignedTags.filter(isReconciliationTag);
      if (reconciliationTags.length <= 1) {
        toast({
          title: "Không thể bỏ nhãn",
          description: "Đơn hàng phải có ít nhất một nhãn đối soát (Đã đối soát hoặc Chưa đối soát)",
          variant: "destructive",
        });
        return;
      }
    }
    const updated = assignedTags.filter(tag => tag.id !== tagId);
    try {
      await updateOrderTags(updated, "Đã bỏ nhãn khỏi đơn hàng");
    } catch {
      // errors already handled inside updateOrderTags
    }
  };
  const deleteTag = async (tagId: string) => {
    const tagToDelete = allTags.find(tag => tag.id === tagId);
    if (!tagToDelete) return;
    // Check if tag is assigned to this order
    const isAssigned = assignedTags.some(tag => tag.id === tagId);
    if (isAssigned) {
      toast({
        title: "Không thể xóa nhãn",
        description: "Vui lòng bỏ nhãn khỏi đơn hàng trước khi xóa",
        variant: "destructive",
      });
      return;
    }
    // Check if it's a default tag (should not be deleted)
    if (tagToDelete.is_default) {
      toast({
        title: "Không thể xóa nhãn",
        description: "Không thể xóa nhãn mặc định của hệ thống",
        variant: "destructive",
      });
      return;
    }
    if (!confirm(`Bạn có chắc chắn muốn xóa nhãn "${getTagDisplayName(tagToDelete)}"?`)) {
      return;
    }
    setLoading(true);
    try {
      await orderTagsApi.deleteTag(tagId);
      // Remove from allTags
      setAllTags(prev => prev.filter(tag => tag.id !== tagId));
      toast({
        title: "Thành công",
        description: "Đã xóa nhãn",
      });
      // Reload tags to ensure consistency
      await loadTags();
    } catch (error) {
      toast({
        title: "Lỗi",
        description: getErrorMessage(error, "Không thể xóa nhãn"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  const unassignedTags = useMemo(
    () =>
      allTags.filter(
        (tag) => !tag.is_deleted && !assignedTags.some(assigned => assigned.id === tag.id)
      ),
    [allTags, assignedTags]
  );
  // Helper function to get display name for tag
  const getTagDisplayName = (tag: OrderTag) => {
    return tag.display_name || tag.name || tag.raw_name || tag.id;
  };
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
                    {getTagDisplayName(tag)}
                    <button
                      onClick={() => {
                        removeTag(tag.id);
                      }}
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
                  className="cursor-pointer hover:bg-muted relative group"
                  onClick={() => {
                    assignTag(tag.id);
                  }}
                  style={{ borderColor: tag.color, color: tag.color }}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  {getTagDisplayName(tag)}
                  {/* Show delete button for non-default tags */}
                  {!tag.is_default && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent triggering assignTag
                        deleteTag(tag.id);
                      }}
                      className="ml-1 hover:bg-red-500 hover:text-white rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      disabled={loading}
                      title="Xóa nhãn"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
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
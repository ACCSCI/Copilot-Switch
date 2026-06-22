import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import { useProviderStore } from '@/stores/providerStore';
import { ProviderCard } from './ProviderCard';
import type { ProviderDTO } from '@shared/types';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface ProviderListProps {
  onStats: (p: ProviderDTO) => void;
}

export function ProviderList({ onStats }: ProviderListProps) {
  const providers = useProviderStore((s) => s.providers);
  const reorder = useProviderStore((s) => s.reorder);
  const remove = useProviderStore((s) => s.remove);
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState<ProviderDTO | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = providers.map((p) => p.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    if (oldIndex < 0 || newIndex < 0) return;
    const newIds = arrayMove(ids, oldIndex, newIndex);
    void reorder(newIds);
  }

  function handleEdit(p: ProviderDTO) {
    navigate({ to: '/edit/$id', params: { id: p.id } });
  }

  function handleDelete(p: ProviderDTO) {
    setConfirmDelete(p);
  }

  async function confirmDeleteAction() {
    if (!confirmDelete) return;
    try {
      await remove(confirmDelete.id);
      toast.success(`已删除 ${confirmDelete.name}`);
    } catch (e) {
      toast.error(`删除失败: ${String(e)}`);
    } finally {
      setConfirmDelete(null);
    }
  }

  if (providers.length === 0) {
    return (
      <div
        data-testid="empty-state"
        className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white py-16"
      >
        <div className="text-5xl">🪄</div>
        <h2 className="mt-4 text-lg font-semibold text-slate-900">还没有配置</h2>
        <p className="mt-1 text-sm text-slate-500">点击上方"添加配置"按钮开始</p>
      </div>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      >
        <SortableContext items={providers.map((p) => p.id)} strategy={verticalListSortingStrategy}>
          <div data-testid="provider-list" className="space-y-2">
            {providers.map((p) => (
              <ProviderCard
                key={p.id}
                provider={p}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onStats={onStats}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除 <strong>{confirmDelete?.name}</strong> 吗？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">取消</Button>
            </DialogClose>
            <Button variant="destructive" onClick={confirmDeleteAction}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

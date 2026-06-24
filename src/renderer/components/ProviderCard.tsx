import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Pencil,
  Copy,
  Activity,
  BarChart3,
  Trash2,
  Play,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import type { ProviderDTO } from '@shared/types';
import { useProviderStore } from '@/stores/providerStore';
import { useState } from 'react';

interface ProviderCardProps {
  provider: ProviderDTO;
  onEdit: (p: ProviderDTO) => void;
  onDelete: (p: ProviderDTO) => void;
  onStats: (p: ProviderDTO) => void;
}

export function ProviderCard({ provider, onEdit, onDelete, onStats }: ProviderCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: provider.id,
  });
  const activate = useProviderStore((s) => s.activate);
  const [pinging, setPinging] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  async function handlePing() {
    setPinging(true);
    try {
      const res = await window.api.testProvider.ping(provider.id);
      if (res.ok) {
        toast.success(`✓ ${provider.name} 通了`, {
          description: `${res.latencyMs}ms · ${res.model ?? ''}`,
        });
      } else {
        toast.error(`✗ ${provider.name} 失败`, { description: res.error });
      }
    } finally {
      setPinging(false);
    }
  }

  async function handleActivate() {
    try {
      await activate(provider.id);
      toast.success(`已切换到 ${provider.name}`);
    } catch (e) {
      toast.error(`切换失败: ${String(e)}`);
    }
  }

  async function handleCopy() {
    const text = `${provider.type} | ${provider.baseUrl} | ${provider.model}`;
    await navigator.clipboard.writeText(text);
    toast.success('已复制配置摘要');
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      data-testid="provider-card"
      data-active={provider.isActive}
      data-provider-id={provider.id}
      className={`p-4 transition-all ${
        provider.isActive
          ? 'border-2 border-brand-blue shadow-md'
          : 'border border-slate-200'
      }`}
    >
      <div className="flex items-center gap-4">
        {/* 拖拽柄 */}
        <button
          {...attributes}
          {...listeners}
          data-testid="drag-handle"
          className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600"
          aria-label="拖拽排序"
        >
          <GripVertical className="size-4" />
        </button>

        {/* 头像 */}
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200 text-lg">
          {provider.icon ?? provider.name.charAt(0).toUpperCase()}
        </div>

        {/* 名称和 URL */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold text-slate-900">{provider.name}</h3>
            <Badge variant="secondary" className="shrink-0">
              {provider.type}
            </Badge>
            {provider.isActive && (
              <Badge className="shrink-0 bg-brand-blue text-white">
                <Check className="mr-1 size-3" />
                已启用
              </Badge>
            )}
          </div>
          <a
            href={provider.baseUrl}
            target="_blank"
            rel="noreferrer"
            className="block truncate text-sm text-brand-blue hover:underline"
          >
            {provider.baseUrl}
          </a>
          <div className="mt-0.5 text-xs text-slate-500">
            {provider.model} · wireApi: {provider.wireApi}
          </div>
        </div>

        {/* 操作区 */}
        <div className="flex shrink-0 items-center gap-1">
          {provider.isActive ? (
            <Button variant="active" size="sm" disabled>
              <Check className="size-3" />
              已启用
            </Button>
          ) : (
            <Button variant="default" size="sm" onClick={handleActivate}>
              <Play className="size-3" />
              启用
            </Button>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                data-testid="action-edit"
                onClick={() => onEdit(provider)}
                aria-label="编辑"
              >
                <Pencil className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>编辑</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                data-testid="action-copy"
                onClick={handleCopy}
                aria-label="复制"
              >
                <Copy className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>复制</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                data-testid="action-health"
                onClick={handlePing}
                disabled={pinging}
                aria-label="健康检查"
              >
                <Activity className={pinging ? 'size-4 animate-pulse' : 'size-4'} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>健康检查（真实调用）</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                data-testid="action-stats"
                onClick={() => onStats(provider)}
                aria-label="统计"
              >
                <BarChart3 className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>统计</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                data-testid="action-delete"
                onClick={() => onDelete(provider)}
                aria-label="删除"
                className="hover:text-red-500"
              >
                <Trash2 className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>删除</TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="更多">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(provider)}>编辑</DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopy}>复制摘要</DropdownMenuItem>
              <DropdownMenuItem onClick={handlePing}>健康检查</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStats(provider)}>查看统计</DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(provider)}
                className="text-red-500 focus:text-red-500"
              >
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
}

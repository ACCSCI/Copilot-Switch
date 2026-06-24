import { useEffect, useState } from 'react';
import { useProviderStore } from '@/stores/providerStore';
import { ProviderList } from '@/components/ProviderList';
import { AddProviderButton } from '@/components/AddProviderButton';
import { Button } from '@/components/ui/button';
import { BarChart3, X, ScrollText } from 'lucide-react';
import { LogViewer } from '@/components/LogViewer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import type { ProviderDTO } from '@shared/types';
import type { HealthCheckDTO } from '@shared/types';

export function HomePage() {
  const { loading, fetch } = useProviderStore();
  const [statsFor, setStatsFor] = useState<ProviderDTO | null>(null);
  const [history, setHistory] = useState<HealthCheckDTO[]>([]);
  const [logOpen, setLogOpen] = useState(false);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  useEffect(() => {
    if (!statsFor) return;
    void window.api.health.history(statsFor.id).then(setHistory);
  }, [statsFor]);

  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Copilot Switch</h1>
          <p className="mt-1 text-sm text-slate-500">管理你的 Copilot BYOK 供应商配置</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setLogOpen(true)} data-testid="open-logs" aria-label="查看日志">
            <ScrollText className="size-4" />
          </Button>
          <AddProviderButton />
        </div>
      </header>

      {loading ? (
        <div className="rounded-xl border bg-white p-8 text-center text-slate-500">加载中...</div>
      ) : (
        <ProviderList onStats={setStatsFor} />
      )}

      <Dialog open={!!statsFor} onOpenChange={(o) => !o && setStatsFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="size-4" />
              {statsFor?.name} - 健康记录
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto">
            {history.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">暂无记录</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {history.map((h) => (
                  <li
                    key={h.id}
                    className="flex items-center justify-between rounded border p-2"
                  >
                    <span>{new Date(h.checkedAt).toLocaleString('zh-CN')}</span>
                    <span className={h.status === 'ok' ? 'text-green-600' : 'text-red-500'}>
                      {h.status} · {h.latencyMs ?? 0}ms
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <DialogClose asChild>
            <Button variant="outline" className="w-full">
              <X className="size-4" />
              关闭
            </Button>
          </DialogClose>
        </DialogContent>
      </Dialog>

      <LogViewer open={logOpen} onOpenChange={setLogOpen} />
    </div>
  );
}

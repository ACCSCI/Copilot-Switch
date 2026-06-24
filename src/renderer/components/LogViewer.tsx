import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, FolderOpen, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface LogViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LogViewer({ open, onOpenChange }: LogViewerProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const [logPath, setLogPath] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLPreElement>(null);

  async function loadLogs() {
    setLoading(true);
    try {
      const [lines, path] = await Promise.all([
        window.api.system.getLogs(),
        window.api.system.getLogPath(),
      ]);
      setLogs(lines);
      setLogPath(path);
    } catch (e) {
      toast.error(`加载日志失败: ${String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) loadLogs();
  }, [open]);

  useEffect(() => {
    // 自动滚动到底部
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  async function handleCopy() {
    await navigator.clipboard.writeText(logs.join('\n'));
    toast.success(`已复制 ${logs.length} 行日志`);
  }

  async function handleOpenDir() {
    await window.api.system.openLogDir();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            日志查看器
            <span className="text-xs text-slate-500 font-normal">({logs.length} 行)</span>
          </DialogTitle>
          <p className="text-xs text-slate-500 mt-1 break-all" data-testid="log-path">{logPath}</p>
        </DialogHeader>

        <div className="flex justify-end gap-2 mb-2">
          <Button variant="outline" size="sm" onClick={loadLogs} disabled={loading}>
            <RefreshCw className={`size-3 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopy} disabled={logs.length === 0}>
            <Copy className="size-3" />
            复制全部
          </Button>
          <Button variant="outline" size="sm" onClick={handleOpenDir}>
            <FolderOpen className="size-3" />
            在文件管理器打开
          </Button>
        </div>

        <pre
          ref={scrollRef}
          data-testid="log-viewer"
          className="bg-slate-950 text-slate-100 text-xs font-mono p-4 rounded-md overflow-auto max-h-[60vh] whitespace-pre-wrap break-all"
        >
          {logs.length === 0 ? (loading ? '加载中...' : '（无日志）') : logs.join('\n')}
        </pre>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">关闭</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
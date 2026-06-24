import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { providerInputSchema, type ProviderInput } from '@shared/schemas';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Save, X, Eye, EyeOff } from 'lucide-react';

interface ProviderFormProps {
  defaultValues?: Partial<ProviderInput>;
  onSubmit: (data: ProviderInput) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

export function ProviderForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel = '保存',
}: ProviderFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<ProviderInput>({
    resolver: zodResolver(providerInputSchema),
    defaultValues: {
      name: '',
      type: 'openai',
      baseUrl: '',
      apiKey: '',
      bearerToken: '',
      wireApi: 'completions',
      azureApiVersion: '',
      model: '',
      icon: '',
      ...defaultValues,
    },
  });

  const type = watch('type');
  const wireApi = watch('wireApi');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showBearer, setShowBearer] = useState(false);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* 名称 */}
            <div className="space-y-2">
              <Label htmlFor="name">名称 *</Label>
              <Input
                id="name"
                placeholder="Claude Official"
                data-testid="input-name"
                {...register('name')}
              />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>

            {/* 图标 */}
            <div className="space-y-2">
              <Label htmlFor="icon">图标</Label>
              <Input
                id="icon"
                placeholder="🤖"
                maxLength={4}
                data-testid="input-icon"
                {...register('icon')}
              />
              <p className="text-xs text-slate-500">最多 4 个字符（emoji）</p>
              {errors.icon && <p className="text-xs text-red-500">{errors.icon.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* 类型 */}
            <div className="space-y-2">
              <Label htmlFor="type">类型 *</Label>
              <Select
                value={type}
                onValueChange={(v) =>
                  setValue('type', v as ProviderInput['type'], { shouldValidate: true })
                }
              >
                <SelectTrigger id="type" data-testid="type-select">
                  <SelectValue placeholder="选择类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI / OpenAI 兼容</SelectItem>
                  <SelectItem value="azure">Azure OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic Claude</SelectItem>
                </SelectContent>
              </Select>
              {errors.type && <p className="text-xs text-red-500">{errors.type.message}</p>}
            </div>

            {/* 模型 */}
            <div className="space-y-2">
              <Label htmlFor="model">模型 *</Label>
              <Input
                id="model"
                placeholder="step-3.7-flash / gpt-4 / claude-sonnet-4.5"
                data-testid="input-model"
                {...register('model')}
              />
              {errors.model && <p className="text-xs text-red-500">{errors.model.message}</p>}
            </div>
          </div>

          {/* Base URL */}
          <div className="space-y-2">
            <Label htmlFor="baseUrl">Base URL *</Label>
            <Input
              id="baseUrl"
              placeholder="https://api.stepfun.com/step_plan/v1"
              data-testid="input-base-url"
              {...register('baseUrl')}
            />
            {errors.baseUrl && <p className="text-xs text-red-500">{errors.baseUrl.message}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* API Key */}
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <div className="relative">
                <Input
                  id="apiKey"
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="sk-..."
                  data-testid="input-api-key"
                  autoComplete="off"
                  className="pr-10"
                  {...register('apiKey')}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={showApiKey ? '隐藏 API Key' : '显示 API Key'}
                  data-testid="toggle-api-key"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowApiKey((v) => !v)}
                >
                  {showApiKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-500">使用系统密钥链加密存储</p>
              {errors.apiKey && <p className="text-xs text-red-500">{errors.apiKey.message}</p>}
            </div>

            {/* Bearer Token */}
            <div className="space-y-2">
              <Label htmlFor="bearerToken">Bearer Token（可选）</Label>
              <div className="relative">
                <Input
                  id="bearerToken"
                  type={showBearer ? 'text' : 'password'}
                  placeholder="可选，与 API Key 互斥"
                  data-testid="input-bearer-token"
                  autoComplete="off"
                  className="pr-10"
                  {...register('bearerToken')}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={showBearer ? '隐藏 Bearer Token' : '显示 Bearer Token'}
                  data-testid="toggle-bearer-token"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowBearer((v) => !v)}
                >
                  {showBearer ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {errors.bearerToken && (
                <p className="text-xs text-red-500">{errors.bearerToken.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Wire API */}
            <div className="space-y-2">
              <Label htmlFor="wireApi">Wire API</Label>
              <Select
                value={wireApi}
                onValueChange={(v) =>
                  setValue('wireApi', v as ProviderInput['wireApi'], { shouldValidate: true })
                }
              >
                <SelectTrigger id="wireApi" data-testid="wire-api-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="completions">completions（Chat Completions API）</SelectItem>
                  <SelectItem value="responses">responses（Responses API）</SelectItem>
                </SelectContent>
              </Select>
              {errors.wireApi && <p className="text-xs text-red-500">{errors.wireApi.message}</p>}
            </div>

            {/* Azure API Version */}
            {type === 'azure' && (
              <div className="space-y-2">
                <Label htmlFor="azureApiVersion">Azure API Version *</Label>
                <Input
                  id="azureApiVersion"
                  placeholder="2024-10-21"
                  data-testid="input-azure-api-version"
                  {...register('azureApiVersion')}
                />
                {errors.azureApiVersion && (
                  <p className="text-xs text-red-500">{errors.azureApiVersion.message}</p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="size-4" />
          取消
        </Button>
        <Button type="submit" disabled={isSubmitting} data-testid="submit-button">
          <Save className="size-4" />
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

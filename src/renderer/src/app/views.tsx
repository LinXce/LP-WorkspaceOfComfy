import type { ComponentType } from 'react'
import type { ViewId } from '@renderer/lib/store'
import { GalleryView } from '@renderer/features/gallery/GalleryView'
import { GalleryInspector } from '@renderer/features/gallery/GalleryInspector'
import { DatasetsView } from '@renderer/features/datasets/DatasetsView'
import { DatasetsInspector } from '@renderer/features/datasets/DatasetsInspector'
import { TaggingView } from '@renderer/features/tagging/TaggingView'
import { TaggingInspector } from '@renderer/features/tagging/TaggingInspector'
import { TagsView } from '@renderer/features/tags/TagsView'
import { TagsInspector } from '@renderer/features/tags/TagsInspector'
import { SettingsView } from '@renderer/features/settings/SettingsView'
import { SettingsInspector } from '@renderer/features/settings/SettingsInspector'

export interface ViewDefinition {
  id: ViewId
  title: string
  description: string
  inspectorTitle: string
  View: ComponentType
  Inspector: ComponentType
}

export const VIEWS: Record<ViewId, ViewDefinition> = {
  gallery: {
    id: 'gallery',
    title: '图库',
    description: '浏览图片，解析嵌入的提示词、模型与 LoRA',
    inspectorTitle: '图片详情',
    View: GalleryView,
    Inspector: GalleryInspector
  },
  datasets: {
    id: 'datasets',
    title: '数据集',
    description: '按文件夹管理图片，维护标签与打标进度',
    inspectorTitle: '数据集与图片',
    View: DatasetsView,
    Inspector: DatasetsInspector
  },
  tagging: {
    id: 'tagging',
    title: '打标工作台',
    description: '批量调用视觉大模型生成标签，可暂停与续跑',
    inspectorTitle: '本次打标',
    View: TaggingView,
    Inspector: TaggingInspector
  },
  tags: {
    id: 'tags',
    title: '标签库',
    description: '维护受控词表：类别、别名、屏蔽与合并',
    inspectorTitle: '标签详情',
    View: TagsView,
    Inspector: TagsInspector
  },
  settings: {
    id: 'settings',
    title: '设置',
    description: 'API 端点、打标默认值、缓存与外观',
    inspectorTitle: '连接与存储',
    View: SettingsView,
    Inspector: SettingsInspector
  }
}

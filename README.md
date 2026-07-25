# 会计从业人员模拟系统

基于 React + Ant Design 开发的会计科目管理系统。

## 功能特性

- 会计科目树形表格展示
- 类别筛选（资产类、负债类、共同类、权益类、成本类、损益类）
- 科目搜索（支持编码和名称）
- 列筛选（余额方向、适用范围）
- 我的笔记（内嵌飞书文档）
- 相关链接导航

## 技术栈

- React 18
- Ant Design 5
- Zustand（状态管理）
- Vite

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build
```

## 项目结构

```
├── src/
│   ├── App.jsx          # 主应用组件
│   ├── main.jsx         # 入口文件
│   ├── store.js         # Zustand状态管理
│   ├── data/            # 数据文件
│   │   └── accounting_subjects.json  # 会计科目数据
│   ├── assets/          # 静态资源
│   └── App.css          # 应用样式
├── index.html
├── package.json
└── vite.config.js
```

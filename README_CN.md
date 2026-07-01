# file-upload-api-demo

## 项目介绍

`file-upload-api-demo` 是一个独立的文件上传微服务演示项目，定位为面向海外自由职业项目的作品集案例。很多客户已经有自己的前端或后端系统，但需要一个可解耦、可独立部署、可快速集成的上传模块，而不是重写整套业务系统。

这个项目重点展示以下常见业务能力：

- 普通文件上传接口，支持图片、视频和文档。
- 大文件分片上传，降低大文件上传超时、卡顿和失败风险。
- 断点续传能力，页面刷新或网络中断后可跳过已上传分片。
- 上传成功后返回可直接访问的 HTTP 静态资源地址。
- 本地磁盘存储，便于快速运行和作品集演示。
- 代码中预留了云存储、用户隔离、权限控制等生产级扩展点。

项目保持轻量化设计：不需要数据库，不需要前端构建工具，也不需要复杂环境配置。

## 核心功能

- 独立上传服务，可集成到客户现有系统。
- 单文件上传，包含文件后缀白名单、MIME 类型校验、文件大小限制。
- 自动生成唯一文件名，避免同名文件覆盖。
- 大文件分片上传流程：初始化任务、上传分片、查询进度、断点续传、合并文件。
- 后台定时任务自动清理过期且未合并的临时分片。
- 原生静态资源托管，支持图片、视频和文档浏览器访问。
- 静态文件浏览器缓存响应头配置。
- 完整 CORS 配置，适配前后端分离架构。
- 统一成功和错误响应结构。
- 全局异常捕获，避免服务因单次请求异常而崩溃。
- 可读性良好的请求日志、上传日志和清理任务日志。
- 单文件 `index.html` 前端演示页面，支持拖拽上传、实时进度条、预览面板和可点击文件链接。

## 本地运行

### 1. 安装依赖

```bash
npm install
```

### 2. 启动服务

```bash
npm start
```

服务默认运行在：

```text
http://localhost:4000
```

打开前端演示页面：

```text
http://localhost:4000/index.html
```

也可以直接用浏览器打开 `public/index.html` 文件，并保持页面中的 API Base 为：

```text
http://localhost:4000
```

### 开发模式

```bash
npm run dev
```

## 配置说明

所有可调整参数集中在：

```text
src/config/index.js
```

支持通过环境变量覆盖默认配置：

```bash
PORT=4000
PUBLIC_BASE_URL=http://localhost:4000
UPLOAD_DIR=storage/uploads
CHUNK_DIR=storage/chunks
MAX_SINGLE_FILE_SIZE_BYTES=52428800
MAX_CHUNK_UPLOAD_FILE_SIZE_BYTES=524288000
MAX_CHUNK_SIZE_BYTES=8388608
DEFAULT_CHUNK_SIZE_BYTES=2097152
ALLOWED_ORIGINS=*
CHUNK_EXPIRY_MS=86400000
CLEANUP_INTERVAL_MS=1800000
```

## REST API 文档

### 健康检查

```http
GET /health
```

响应示例：

```json
{
  "success": true,
  "message": "File upload service is healthy.",
  "data": {
    "uptime": 18.51
  },
  "timestamp": "2026-06-26T10:00:00.000Z"
}
```

### 获取上传配置

```http
GET /api/uploads/config
```

响应示例：

```json
{
  "success": true,
  "message": "Upload configuration loaded successfully.",
  "data": {
    "maxSingleFileSizeBytes": 52428800,
    "maxChunkUploadFileSizeBytes": 524288000,
    "maxChunkSizeBytes": 8388608,
    "defaultChunkSizeBytes": 2097152,
    "allowedExtensions": [".jpg", ".jpeg", ".png", ".gif", ".webp", ".mp4", ".mov", ".pdf"],
    "allowedMimeTypes": ["image/jpeg", "image/png", "video/mp4", "application/pdf"],
    "publicBaseUrl": "http://localhost:4000"
  },
  "timestamp": "2026-06-26T10:00:00.000Z"
}
```

### 普通单文件上传

```http
POST /api/uploads/single
Content-Type: multipart/form-data
```

请求参数：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| file | File | 是 | 需要上传的文件 |

响应示例：

```json
{
  "success": true,
  "message": "File uploaded successfully.",
  "data": {
    "originalName": "contract.pdf",
    "storedFileName": "1782450012345-a1b2c3d4e5f6.pdf",
    "mimeType": "application/pdf",
    "size": 245760,
    "publicUrl": "http://localhost:4000/static/1782450012345-a1b2c3d4e5f6.pdf"
  },
  "timestamp": "2026-06-26T10:00:00.000Z"
}
```

### 初始化大文件分片上传

```http
POST /api/uploads/chunks/init
Content-Type: application/json
```

请求体：

```json
{
  "fileName": "product-demo.mp4",
  "mimeType": "video/mp4",
  "fileSize": 73400320,
  "chunkSize": 2097152,
  "totalChunks": 35
}
```

响应示例：

```json
{
  "success": true,
  "message": "Chunk upload task initialized.",
  "data": {
    "uploadId": "1782450012345-a1b2c3d4e5f6a7b8c9",
    "uploadedChunks": [],
    "expiresInMs": 86400000,
    "recommendedChunkSize": 2097152
  },
  "timestamp": "2026-06-26T10:00:00.000Z"
}
```

### 上传单个分片

```http
POST /api/uploads/chunks/:uploadId/part
Content-Type: multipart/form-data
```

请求参数：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| chunk | File | 是 | 当前分片二进制内容 |
| chunkIndex | Number | 是 | 从 0 开始的分片索引 |

响应示例：

```json
{
  "success": true,
  "message": "Chunk uploaded successfully.",
  "data": {
    "uploadId": "1782450012345-a1b2c3d4e5f6a7b8c9",
    "chunkIndex": 3,
    "uploadedChunks": [0, 1, 2, 3],
    "receivedChunks": 4,
    "totalChunks": 35
  },
  "timestamp": "2026-06-26T10:00:00.000Z"
}
```

### 查询分片上传状态

```http
GET /api/uploads/chunks/:uploadId/status
```

页面刷新或网络中断后，可以调用该接口获取已上传分片列表，从而跳过已完成部分。

响应示例：

```json
{
  "success": true,
  "message": "Upload status loaded successfully.",
  "data": {
    "uploadId": "1782450012345-a1b2c3d4e5f6a7b8c9",
    "status": "uploading",
    "originalName": "product-demo.mp4",
    "totalChunks": 35,
    "uploadedChunks": [0, 1, 2, 3],
    "missingChunks": [4, 5, 6]
  },
  "timestamp": "2026-06-26T10:00:00.000Z"
}
```

### 合并分片

```http
POST /api/uploads/chunks/:uploadId/merge
```

响应示例：

```json
{
  "success": true,
  "message": "Chunks merged successfully.",
  "data": {
    "uploadId": "1782450012345-a1b2c3d4e5f6a7b8c9",
    "originalName": "product-demo.mp4",
    "storedFileName": "1782450099999-f6e5d4c3b2a1.mp4",
    "mimeType": "video/mp4",
    "size": 73400320,
    "publicUrl": "http://localhost:4000/static/1782450099999-f6e5d4c3b2a1.mp4"
  },
  "timestamp": "2026-06-26T10:00:00.000Z"
}
```

### 静态文件访问

```http
GET /static/:storedFileName
```

上传后的文件会通过静态资源路由访问，并带有浏览器缓存和跨域资源访问响应头。

## 统一错误响应

```json
{
  "success": false,
  "message": "This file extension is not allowed.",
  "error": {
    "code": 400,
    "details": {
      "extension": ".exe"
    }
  },
  "timestamp": "2026-06-26T10:00:00.000Z"
}
```

## 可为客户扩展的生产级能力

该上传模块可以继续扩展为真实商业项目中的生产级服务，例如：

- 集成 AWS S3、Google Cloud Storage、Azure Blob Storage、Cloudflare R2 等对象存储。
- 按用户、租户、项目或工作区隔离文件。
- 上传限流，保护后端资源。
- 图片和视频缩略图生成。
- Token 鉴权和私有文件权限控制。
- 文件压缩与图片优化。
- 病毒扫描和内容安全审核。
- CDN 加速，提升全球访问速度。
- 使用 Redis 或数据库存储上传状态，支持多实例部署。
- 后台队列处理文件转码、元数据提取等耗时任务。

## Upwork 作品集简介

我开发了一个独立的 Node.js 文件上传微服务演示项目，支持普通文件上传、大文件分片上传、断点续传、静态文件访问、文件校验、CORS、临时分片清理任务，以及无需构建工具的前端演示页面。该项目适合作为可复用上传模块，帮助客户在现有 Web 或后端系统中快速接入可靠的文件处理能力。

## 客户沟通模板

您好，我有一个可独立集成的文件上传模块方案，适合接入已有 Web 应用或后端系统。它支持普通上传、大文件分片上传、上传中断后续传、文件校验、公开文件 URL、静态资源托管以及未完成分片自动清理。我可以根据您的业务需求继续扩展云存储、用户权限、Token 鉴权、上传限流、缩略图生成或文件压缩等功能。

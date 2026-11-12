# Set Randoms

用 Vue 3 + TypeScript 做的随机集合。候选项只留在当前页面会话里。Node 服务负责以后的远程存储，现在只接收请求，不把数据写下来。

## 本地

```sh
npm install
npm run server
npm run dev
```

页面在 `http://127.0.0.1:5173`。Vite 会把 `/api` 转到 `http://127.0.0.1:3000`。

## 存储

`server/index.mjs` 提供三个接口：

- `GET /api/health`
- `GET /api/sets`：总是返回空数组
- `PUT /api/sets`：校验通过后丢弃内容

`persistence` 固定为 `false`。真正要保存时，再在这个服务里补上写入。

## Cloudflare Pages

把这个 GitHub 仓库接到 Pages 即可。

- 构建命令：`npm run build`
- 输出目录：`dist`
- Node 版本：22.18 或更高

Pages 只托管页面，不会运行 `server/`。线上会显示远程存储未连接，集合刷新后就没有了。`public/_redirects` 已经处理了前端路由。

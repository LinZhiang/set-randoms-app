# 记录抽卡

手机上记录抽卡的树。每个节点有名称和详情，可以增、删、改。数据写在 Node 服务里，多台设备打开同一个地址会自动同步。页面可以安装到手机桌面。

## 本地

```sh
npm install
npm run server
npm run dev
```

手机和电脑在同一个 Wi-Fi 时，用终端里的 Network 地址打开。开发服务器会把 `/api` 转到本机的 Node 服务。

记录保存在 `server/data/nodes.json`。

## 安装到手机

用 HTTPS 打开页面后：

- Android：页面里出现「安装」，或用浏览器菜单「安装应用」。
- iPhone：用 Safari 打开，点分享，再选「添加到主屏幕」。

## Cloudflare

页面用 Workers 的静态资源发布。同步要另外运行 `server/index.mjs`，并让手机访问得到它。

- 构建命令：`npm run build`
- 部署命令：`npx wrangler deploy`
- 构建环境变量：`VITE_API_BASE` 设为 Node 服务的公网地址

如果给服务设置了 `API_TOKEN`，构建时还要设置相同的 `VITE_API_TOKEN`。服务监听地址用 `HOST=0.0.0.0`。

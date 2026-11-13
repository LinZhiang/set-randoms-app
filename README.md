# 卡片式练习

手机上卡片式练习的树。每个节点有名称和详情，可以增、删、改。发布到 Cloudflare Pages 后，记录存在这个站点上，多台设备打开会自动同步。页面左上角可以安装到手机桌面。

## 本地

```sh
npm install
npm run server
npm run dev
```

手机和电脑在同一个 Wi-Fi 时，用终端里的 Network 地址打开。开发服务器会把 `/api` 转到本机的 Node 服务。

记录保存在 `server/data/nodes.json`。

## 安装到手机

首页左上角是「安装」。

- Android：用 Chrome 打开，点「安装」。
- iPhone：用 Safari 打开，点分享，再选「添加到主屏幕」。QQ 里不能直接安装。

## Cloudflare

页面发在 Cloudflare Pages，地址是 `https://set-randoms-app.pages.dev`。构建命令是 `npm run build`，输出目录是 `dist`。记录存在这个站点的存储里，打开页面就能同步。

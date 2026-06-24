# Cloudflare Worker 反代加速（jinming.vip）

让国内用户经由 Cloudflare 优选节点访问 `shao-naming.vercel.app`，绕开 `*.vercel.app` 在大陆的限速。

> 你的域名：`jinming.vip`。下文用根域名 `jinming.vip` 作为给用户访问的加速域名（如想用 `www.jinming.vip` 或 `name.jinming.vip`，把对应位置替换即可）。

## 一、把域名接入 Cloudflare（改 DNS 服务器）

1. 注册/登录 [Cloudflare](https://dash.cloudflare.com/)，点 **Add a site**，输入 `jinming.vip`，选 **Free** 套餐。
2. Cloudflare 会给你 **两个 nameserver**（形如 `xxx.ns.cloudflare.com`）。
3. 回到 **腾讯云控制台 → 域名管理 → jinming.vip → 管理 → DNS 服务器（DNS Servers / 修改DNS服务器）**，把默认的腾讯云 DNS 改成 Cloudflare 给的这两个。
4. 等待生效（几分钟到几小时）。Cloudflare 后台域名状态变成 **Active** 即可继续。

> 注意：改 nameserver 后，这个域名的解析就全部由 Cloudflare 管理了，原来腾讯云 DNS 里的记录（如邮箱解析）要在 Cloudflare 里重建。

## 二、部署 Worker

1. Cloudflare 后台 → **Workers & Pages → Create → Create Worker**，起名如 `shao-proxy`，先 Deploy。
2. 点进 Worker → **Edit code**，把本目录 `worker.js` 的内容**整段替换**进去，保存并部署。
3. 顶部 `TARGET_HOST` 已设为 `shao-naming.vercel.app`，无需改动；以后换 Vercel 地址只改这一行。

## 三、绑定你的加速域名

在 Worker 页面 → **Settings → Domains & Routes → Add → Custom Domain**，填 `jinming.vip`。
Cloudflare 会自动创建解析记录并签发证书。完成后访问 **https://jinming.vip** 就是你的网站了。

> 想同时支持 `www.jinming.vip`：再加一个 Custom Domain 填 `www.jinming.vip` 即可。

到这一步通常已经比 `vercel.app` 快很多。先测速，够用就结束。

## 四、（可选）启用「优选 IP」进一步提速

如果默认节点对你的网络仍不理想，可改用「路由 + 优选 IP」：

1. 删除第三步创建的 Custom Domain（或用一个子域名如 `name.jinming.vip` 做这步）。
2. Worker → **Settings → Domains & Routes → Add → Route**，填 `jinming.vip/*`，Zone 选 `jinming.vip`。
3. Cloudflare → **DNS** 给对应记录加一条 **CNAME**，目标填一个 **Cloudflare 优选域名**（网上有公开的优选 IP/优选域名列表），代理状态按所用优选服务的说明设置。
4. 保存后测速，挑延迟最低的优选目标。

> 优选 IP 本质是手动挑选「离你更近、更快」的 Cloudflare 边缘 IP。不同运营商（电信/联通/移动）最优 IP 不同，可多试几个。

## 常见问题

- **页面打开但样式/JS 丢失**：本脚本已自动改写绝对 URL；若仍有问题，多为某些资源被硬编码成 `vercel.app` 绝对路径，检查后在 `rewriteUrls` 里补充规则。
- **502 代理失败**：多为 Vercel 临时抽风或 `TARGET_HOST` 写错，确认 `shao-naming.vercel.app` 能直接打开。
- **根域名证书/解析问题**：用 Custom Domain 绑定 `jinming.vip` 时 Cloudflare 会自动处理证书；若长时间 pending，确认域名状态已 Active 且没有冲突的旧 DNS 记录。

/**
 * 通过 Vercel REST API 部署当前目录的静态站点（无需安装 Vercel CLI）。
 *
 * 用法：
 *   VERCEL_TOKEN=你的令牌 node deploy-vercel.mjs
 *
 * 流程：
 *   1) 逐个文件计算 sha1 并上传到 /v2/files
 *   2) 调用 /v13/deployments 创建生产环境部署
 *   3) 轮询直到就绪，打印公网访问地址
 */

import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const TOKEN = process.env.VERCEL_TOKEN;
const PROJECT = process.env.VERCEL_PROJECT || "shao-naming";
if (!TOKEN) {
  console.error("缺少 VERCEL_TOKEN 环境变量");
  process.exit(1);
}

// 站点所需文件（不含本脚本与 README）
const FILES = ["index.html", "styles.css", "app.js", "data.js"];

const API = "https://api.vercel.com";
const authHeaders = { Authorization: `Bearer ${TOKEN}` };

async function uploadFile(path) {
  const buf = await readFile(path);
  const sha = createHash("sha1").update(buf).digest("hex");
  const res = await fetch(`${API}/v2/files`, {
    method: "POST",
    headers: {
      ...authHeaders,
      "Content-Type": "application/octet-stream",
      "x-vercel-digest": sha,
    },
    body: buf,
  });
  if (!res.ok) {
    throw new Error(`上传 ${path} 失败：${res.status} ${await res.text()}`);
  }
  return { file: path, sha, size: buf.length };
}

async function main() {
  console.log("· 上传文件中…");
  const files = [];
  for (const f of FILES) files.push(await uploadFile(f));

  console.log("· 创建生产部署…");
  const res = await fetch(`${API}/v13/deployments`, {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: PROJECT,
      files: files.map((f) => ({ file: f.file, sha: f.sha, size: f.size })),
      target: "production",
      projectSettings: { framework: null },
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`创建部署失败：${res.status} ${JSON.stringify(data)}`);
  }

  const id = data.id;
  let url = data.url;
  // 轮询就绪状态
  for (let i = 0; i < 40; i++) {
    const st = await fetch(`${API}/v13/deployments/${id}`, { headers: authHeaders });
    const sd = await st.json();
    url = sd.url || url;
    if (sd.readyState === "READY") {
      console.log("\n✅ 部署成功！");
      console.log("生产地址： https://" + url);
      const alias = (sd.alias && sd.alias[0]) || (data.alias && data.alias[0]);
      if (alias) console.log("固定别名： https://" + alias);
      return;
    }
    if (sd.readyState === "ERROR") {
      throw new Error("部署构建失败：" + JSON.stringify(sd.errorMessage || sd));
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  console.log("部署已提交，地址： https://" + url + "（稍后稍候即可访问）");
}

main().catch((e) => {
  console.error("✗ " + e.message);
  process.exit(1);
});

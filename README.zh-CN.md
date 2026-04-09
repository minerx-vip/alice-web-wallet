# Alice网页钱包

这是 Alice Protocol 的网页钱包。

## 功能

- **钱包**：创建 / 导入钱包（本地加密存储）
- **转账**：发送 ALICE 到其他地址
- **交易记录**：查看转账记录（通过 indexer API）
- **质押**：查看质押状态 / 质押 / 解除质押
- **PWA**：支持在手机上“添加到主屏幕/桌面图标”（包含应用图标、独立窗口模式）

## 环境要求

- 建议使用 Node.js 20+
- npm（仓库包含 `package-lock.json`）

## 本地运行

安装依赖：

```bash
npm ci
```

启动开发服务器：

```bash
npm run dev
```

浏览器打开：

- [http://localhost:3000](http://localhost:3000)

构建并启动：

```bash
npm run build
npm run start
```

## 手机添加到桌面图标（Add to Home Screen）

本项目内置 Web App Manifest（`public/manifest.json`）与 Service Worker（`public/sw.js`），因此支持添加到主屏幕后以“类 App”形式打开。

### iOS（Safari）

1. 用 Safari 打开站点
2. 点击“分享”按钮
3. 选择“添加到主屏幕”
4. 确认添加

### Android（Chrome）

1. 用 Chrome 打开站点
2. 点击右上角菜单（3 个点）
3. 选择“添加到主屏幕”或“安装应用”

## 注意事项

- 钱包数据（密钥与加密后的钱包内容）仅保存在浏览器本地（localStorage），本应用不会将其上传到任何服务器。
- 请妥善备份并安全保存助记词/钱包数据。

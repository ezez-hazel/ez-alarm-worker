# ez-alarm

> 由于 bilibili 风控限制 Cloudflare 边缘网络访问 API ，本项目已废弃。

[![部署到 Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/ezez-hazel/ez-alarm)

这是一个 Cloudflare Worker，用于定时检查一个 Bilibili 直播间，并在主播开播时通过绑定的 `bark-worker` Worker 发送通知。

## 功能

- 每 5 分钟通过 Cloudflare Cron Trigger 执行一次。
- 从 `ROOM_ID` 读取一个 Bilibili 房间号。
- 请求 Bilibili 房间信息，获取主播 UID、直播状态和直播间标题。
- 当 `live_status` 不为 `1` 时结束本次处理。
- 直播中时请求主播资料，获取主播名称和头像。
- 查询 D1 数据库 `devices` 表中 `token` 不为空且不为 `deleted` 的设备。
- 将这些设备的 `key` 发送到 `bark-worker/post`。
- 使用 KV 记录执行时间，执行后的 4 小时内跳过计划任务。
- 提供 `/test` 端点，使用预设数据手动触发一次处理流程。

## 配置

### 房间号

在 `wrangler.jsonc` 中设置 `ROOM_ID`：

```jsonc
"vars": {
  "ROOM_ID": "123456"
}
```

本地开发时，也可以在 `.dev.vars` 中设置：

```text
ROOM_ID="123456"
```

### Cloudflare 资源

`wrangler.jsonc` 已配置以下绑定：

- `DB`：自动创建的 D1 数据库 `ez-alarm`。
- `KV`：自动创建的 KV namespace，用于 4 小时执行冷却。
- `NOTIFICATION_WORKER`：名为 `bark-worker` 的 Service Binding。

部署前需要确保 Cloudflare 账户中已部署 `bark-worker`。D1 数据库还需要提前创建 `devices` 表，例如：

```sql
CREATE TABLE devices (
  key TEXT NOT NULL,
  token TEXT
);
```

## 端点

- `GET /`：返回 Worker 健康检查响应。
- `GET /test`：使用固定测试数据调用 `handleLiveRoom`，并会真实执行 D1 查询、KV 写入和通知调用。

## 开发与部署

安装依赖：

```sh
npm install
```

启动本地开发服务器：

```sh
npm run dev
```

运行测试：

```sh
npm test
```

部署到 Cloudflare：

```sh
npm run deploy
```

也可以点击页面顶部的“部署到 Cloudflare”按钮进行部署。

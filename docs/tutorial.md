# 教程：从零接入一台设备并发起调用

> 前置：已按 [README 快速开始](../README.md#快速开始) 起好服务，并用配置里的管理员账号登录了面板。

下面以一个 iOS 真机（frida）取 `getToken` 为例，走完整链路。

## ① 新建分组

进入 **分组** 页 → 新建分组：

- 中文名：`示例分组`，路由：`demo`
- 调用鉴权：选 `API Key`（则对外调用需带 key；选 `免鉴权` 则任何人可调）

创建后，这一行会显示两把钥匙：

- **设备密钥**（device key，`dk_...`）——给设备用，点复制。
- **调用 API Key**（`ak_...`）——给调用方用。

## ② 设备端接入

设备侧需要一个常驻客户端：用 device key 登录拿到 WS 地址，连上后注册自己能干的 action，然后等任务。协议见下方 [设备接入协议](#设备接入协议)。最小骨架（Python）：

```python
import requests, websocket, json

BASE = "http://你的服务器:9876"
DEVICE_KEY = "dk_..."        # 分组页复制
GROUP, CLIENT_ID = "demo", "device-01"

# 登录拿 token + wsUrl，并上报本设备支持的 action
r = requests.post(f"{BASE}/api/client/login", json={
    "deviceKey": DEVICE_KEY, "clientId": CLIENT_ID, "group": GROUP,
    "platform": "frida", "actions": ["getToken"],
}).json()["data"]
ws = websocket.create_connection(r["wsUrl"])

while True:
    msg = json.loads(ws.recv())
    if msg.get("type") != "job":
        continue
    job = msg["job"]
    payload = do_real_work(job["action"], job.get("payload"))   # ← 在真机上执行
    ws.send(json.dumps({"type": "result", "result": {
        "requestId": job["requestId"], "status": "success",
        "httpCode": 200, "payload": payload, "error": "", "latencyMs": 0,
    }}))
```

> 完整可跑的参考实现见 [`examples/device_client.py`](../examples/device_client.py)。

跑起来后，在面板 **设备** 页能看到 `device-01` 变成「在线」，**分组** 页 `demo` 的可用 action 会自动出现 `getToken`。

## ③ 发起调用

分组是 `apikey` 模式，带上 API Key 即可：

```bash
curl -X POST "http://localhost:9876/rpc/demo/getToken" \
  -H "X-API-Key: ak_你的key" \
  -H "Content-Type: application/json" \
  -d '{"payload": {}, "timeoutSeconds": 15}'
```

返回统一信封：

```json
{ "success": true, "msg": "ok", "data": { "token": "..." } }
```

也可以在面板的 **RPC 调用** 页直接发，它会按所选分组自动带好鉴权，并生成对应 curl。

---

## 设备接入协议

1. **登录**：`POST /api/client/login`
   ```json
   { "deviceKey": "dk_...", "clientId": "device-01", "group": "demo",
     "platform": "frida", "actions": ["getToken"], "maxInFlight": 8 }
   ```
   返回 `data.token` 与 `data.wsUrl`。

2. **连接**：`GET {wsUrl}`（即 `/api/client/ws?token=...`）。

3. **消息**（JSON 文本帧）：

   | 方向 | 类型 | 说明 |
   | --- | --- | --- |
   | 服务器 → 设备 | `welcome` | 连接确认 |
   | 服务器 → 设备 | `job` | 下发任务：`job.{requestId, action, payload}` |
   | 设备 → 服务器 | `result` | 回传结果：`result.{requestId, status, httpCode, payload, error, latencyMs}` |
   | 设备 → 服务器 | `heartbeat` | 心跳（服务器回 `heartbeatAck`） |

   > 多线程并发处理任务时，所有 WS 发送必须串行化（加锁），否则帧流写乱会被服务端断连。

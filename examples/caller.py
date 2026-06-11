#!/usr/bin/env python3
"""
r1rpc 调用方示例：从你的后端发起一次 RPC。

依赖：
    pip install requests

用法：
    # 免鉴权分组
    python caller.py --server http://127.0.0.1:9876 --group demo --action ping

    # apikey 分组（带上分组的调用 API Key）
    python caller.py --group demo --action echo --api-key ak_xxxx --payload '{"hello":"world"}'
"""
import argparse
import json

import requests


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--server", default="http://127.0.0.1:9876")
    p.add_argument("--group", required=True)
    p.add_argument("--action", required=True)
    p.add_argument("--api-key", default="")            # apikey 分组才需要
    p.add_argument("--payload", default="{}")          # JSON 字符串
    p.add_argument("--timeout", type=int, default=15)
    args = p.parse_args()

    headers = {"Content-Type": "application/json"}
    if args.api_key:
        headers["X-API-Key"] = args.api_key

    resp = requests.post(
        f"{args.server.rstrip('/')}/rpc/{args.group}/{args.action}",
        headers=headers,
        json={"payload": json.loads(args.payload), "timeoutSeconds": args.timeout},
        timeout=args.timeout + 5,
    )
    body = resp.json()
    print(json.dumps(body, ensure_ascii=False, indent=2))
    # 统一信封：success / msg / data
    raise SystemExit(0 if body.get("success") else 1)


if __name__ == "__main__":
    main()

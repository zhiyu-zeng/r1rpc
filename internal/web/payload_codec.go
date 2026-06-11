package web

import (
	"bytes"
	"compress/gzip"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"strings"

	"r1rpc/internal/rpc"
)

const payloadEncodingGzipBase64JSON = "gzip+base64+json"

func normalizeClientJobResult(result *rpc.JobResult) error {
	if result == nil {
		return nil
	}
	encoding := strings.TrimSpace(result.PayloadEncoding)
	if encoding == "" {
		return nil
	}
	switch encoding {
	case payloadEncodingGzipBase64JSON:
		decoded, err := decodeCompressedPayload(result.Payload)
		if err != nil {
			return err
		}
		result.Payload = decoded
		result.PayloadEncoding = ""
		return nil
	default:
		return fmt.Errorf("不支持的 payloadEncoding: %s", encoding)
	}
}

func decodeCompressedPayload(raw json.RawMessage) (json.RawMessage, error) {
	var encoded string
	if err := json.Unmarshal(raw, &encoded); err != nil {
		return nil, fmt.Errorf("压缩 payload 必须是 base64 字符串: %w", err)
	}
	compressed, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return nil, fmt.Errorf("base64 解码失败: %w", err)
	}
	reader, err := gzip.NewReader(bytes.NewReader(compressed))
	if err != nil {
		return nil, fmt.Errorf("打开 gzip 失败: %w", err)
	}
	defer reader.Close()
	plain, err := io.ReadAll(reader)
	if err != nil {
		return nil, fmt.Errorf("读取 gzip 失败: %w", err)
	}
	trimmed := bytes.TrimSpace(plain)
	if len(trimmed) == 0 {
		return json.RawMessage("{}"), nil
	}
	if !json.Valid(trimmed) {
		return nil, fmt.Errorf("解码后的 payload 不是合法 JSON")
	}
	return json.RawMessage(trimmed), nil
}
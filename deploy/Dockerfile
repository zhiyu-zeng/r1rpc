# 多阶段构建：前端已预构建并 go:embed 进二进制，这里只编译 Go。
FROM golang:1.26-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags "-s -w" -o /out/r1rpc-server ./cmd/server

FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=build /out/r1rpc-server /app/r1rpc-server
EXPOSE 9876
ENTRYPOINT ["/app/r1rpc-server"]

import { useState, type ComponentProps } from 'react'
import {
  Flex,
  Box,
  Card,
  Table,
  Button,
  Badge,
  Text,
  Select,
  Spinner,
  Dialog,
  Code,
  ScrollArea,
  DataList,
} from '@radix-ui/themes'
import { ReloadIcon, ChevronLeftIcon, ChevronRightIcon } from '@radix-ui/react-icons'
import { get } from '../api/client'
import { useFetch } from '../lib/useFetch'
import { notify } from '../lib/toast'
import { fmtTime, prettyJson } from '../lib/format'
import type { RpcRequest, RPCRequestPage, RequestFilterOptions } from '../types'

type BadgeColor = ComponentProps<typeof Badge>['color']
const statusColor: Record<string, BadgeColor> = {
  success: 'green',
  error: 'red',
  timeout: 'amber',
  no_client: 'orange',
  rejected: 'red',
  pending: 'gray',
}
const STATUSES = ['success', 'error', 'timeout', 'no_client', 'rejected', 'pending']
const statusCn: Record<string, string> = {
  success: '成功',
  error: '失败',
  timeout: '超时',
  no_client: '无设备',
  rejected: '已拒绝',
  pending: '处理中',
}

export default function RequestsPage() {
  const [page, setPage] = useState(1)
  const [group, setGroup] = useState('all')
  const [action, setAction] = useState('all')
  const [client, setClient] = useState('all')
  const [status, setStatus] = useState('all')
  const [detail, setDetail] = useState<RpcRequest | null>(null)

  const optR = useFetch(() => get<RequestFilterOptions>('/api/monitor/request-options'))
  const opts = optR.data

  function setFilter(setter: (v: string) => void, v: string) {
    setter(v)
    setPage(1)
  }

  const qs = new URLSearchParams({ page: String(page), pageSize: '20' })
  if (group !== 'all') qs.set('group', group)
  if (action !== 'all') qs.set('action', action)
  if (client !== 'all') qs.set('client', client)
  if (status !== 'all') qs.set('status', status)

  const listR = useFetch(
    () => get<RPCRequestPage>(`/api/monitor/requests?${qs.toString()}`),
    [page, group, action, client, status],
  )
  const items = listR.data?.items ?? []
  const totalPages = listR.data?.totalPages ?? 0

  return (
    <Flex direction="column" gap="4">
      <Flex justify="between" align="center" wrap="wrap" gap="2">
        <Flex gap="2" align="center" wrap="wrap">
          <FilterSelect label="分组" value={group} onChange={(v) => setFilter(setGroup, v)} options={opts?.groups} />
          <FilterSelect label="Action" value={action} onChange={(v) => setFilter(setAction, v)} options={opts?.actions} />
          <FilterSelect label="客户端" value={client} onChange={(v) => setFilter(setClient, v)} options={opts?.clientIds} />
          <FilterSelect label="状态" value={status} onChange={(v) => setFilter(setStatus, v)} options={STATUSES} labels={statusCn} />
        </Flex>
        <Button
          variant="soft"
          color="gray"
          onClick={() => {
            listR.reload()
            notify.success('已刷新')
          }}
        >
          <ReloadIcon /> 刷新
        </Button>
      </Flex>

      <Card size="2">
        {listR.loading ? (
          <Flex justify="center" p="6">
            <Spinner size="3" />
          </Flex>
        ) : (
          <Table.Root variant="surface">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>时间</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>分组</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Action</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>客户端</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>状态</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>耗时</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell></Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {items.map((r) => (
                <Table.Row key={r.id} align="center">
                  <Table.Cell>
                    <Text size="2" color="gray">
                      {fmtTime(r.createdAt)}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>{r.group}</Table.Cell>
                  <Table.Cell>{r.action}</Table.Cell>
                  <Table.Cell>
                    <Code variant="ghost">{r.clientId || '—'}</Code>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge color={statusColor[r.status] ?? 'gray'} variant="soft">
                      {statusCn[r.status] ?? r.status}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>{r.latencyMs} ms</Table.Cell>
                  <Table.Cell>
                    <Button size="1" variant="ghost" onClick={() => setDetail(r)}>
                      详情
                    </Button>
                  </Table.Cell>
                </Table.Row>
              ))}
              {items.length === 0 && (
                <Table.Row>
                  <Table.Cell colSpan={7}>
                    <Text color="gray">暂无记录</Text>
                  </Table.Cell>
                </Table.Row>
              )}
            </Table.Body>
          </Table.Root>
        )}

        {totalPages > 1 && (
          <Flex align="center" justify="end" gap="3" mt="3">
            <Button variant="soft" color="gray" size="1" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeftIcon /> 上一页
            </Button>
            <Text size="2" color="gray">
              第 {page} / {totalPages} 页
            </Text>
            <Button
              variant="soft"
              color="gray"
              size="1"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              下一页 <ChevronRightIcon />
            </Button>
          </Flex>
        )}
      </Card>

      <RequestDetailDialog request={detail} onClose={() => setDetail(null)} />
    </Flex>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  labels,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options?: string[]
  labels?: Record<string, string>
}) {
  return (
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger variant="soft" color="gray" />
      <Select.Content>
        <Select.Item value="all">全部{label}</Select.Item>
        {(options ?? []).map((o) => (
          <Select.Item key={o} value={o}>
            {labels?.[o] ?? o}
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  )
}

function RequestDetailDialog({ request, onClose }: { request: RpcRequest | null; onClose: () => void }) {
  return (
    <Dialog.Root open={!!request} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Content maxWidth="640px">
        <Dialog.Title>调用详情</Dialog.Title>
        {request && (
          <Flex direction="column" gap="3" mt="2">
            <DataList.Root size="2">
              <DataList.Item>
                <DataList.Label>requestId</DataList.Label>
                <DataList.Value>
                  <Code variant="ghost">{request.requestId}</Code>
                </DataList.Value>
              </DataList.Item>
              <DataList.Item>
                <DataList.Label>分组 / Action</DataList.Label>
                <DataList.Value>
                  {request.group} / {request.action}
                </DataList.Value>
              </DataList.Item>
              <DataList.Item>
                <DataList.Label>客户端</DataList.Label>
                <DataList.Value>{request.clientId || '—'}</DataList.Value>
              </DataList.Item>
              <DataList.Item>
                <DataList.Label>状态</DataList.Label>
                <DataList.Value>
                  <Badge color={statusColor[request.status] ?? 'gray'} variant="soft">
                    {statusCn[request.status] ?? request.status}
                  </Badge>
                  <Text size="2" color="gray" ml="2">
                    HTTP {request.httpCode} · {request.latencyMs} ms
                  </Text>
                </DataList.Value>
              </DataList.Item>
              {request.errorMessage && (
                <DataList.Item>
                  <DataList.Label>错误</DataList.Label>
                  <DataList.Value>
                    <Text color="red">{request.errorMessage}</Text>
                  </DataList.Value>
                </DataList.Item>
              )}
            </DataList.Root>

            <JsonBlock title="请求 payload" value={request.requestPayload} />
            <JsonBlock title="响应 payload" value={request.responsePayload} />
          </Flex>
        )}
        <Flex justify="end" mt="4">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              关闭
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}

function JsonBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <Box>
      <Text size="1" color="gray" mb="1" as="div">
        {title}
      </Text>
      <ScrollArea type="auto" scrollbars="vertical" style={{ maxHeight: 200 }}>
        <Box
          p="3"
          style={{ background: 'var(--gray-2)', borderRadius: 'var(--radius-3)', border: '1px solid var(--gray-4)' }}
        >
          <pre style={{ margin: 0, fontSize: 12, fontFamily: 'var(--code-font-family)', whiteSpace: 'pre-wrap' }}>
            {prettyJson(value)}
          </pre>
        </Box>
      </ScrollArea>
    </Box>
  )
}

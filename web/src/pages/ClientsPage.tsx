import { useState } from 'react'
import { Flex, Card, Table, Button, Badge, Text, Select, Spinner, Code } from '@radix-ui/themes'
import { ReloadIcon } from '@radix-ui/react-icons'
import { get } from '../api/client'
import { useFetch } from '../lib/useFetch'
import { notify } from '../lib/toast'
import { fmtTime } from '../lib/format'
import type { GroupInfo, ClientQueueItem } from '../types'

interface ClientQueue {
  group: string
  count: number
  clientIds: string[]
  items: ClientQueueItem[]
}

export default function ClientsPage() {
  const groupsR = useFetch(() => get<{ items: GroupInfo[] }>('/api/groups'))
  const groups = groupsR.data?.items ?? []
  const [group, setGroup] = useState('')
  const effGroup = group || groups[0]?.group || ''

  const queueR = useFetch(
    () =>
      effGroup
        ? get<ClientQueue>(`/rpc/clientQueue?group=${encodeURIComponent(effGroup)}`)
        : Promise.resolve({ group: '', count: 0, clientIds: [], items: [] }),
    [effGroup],
  )
  const items = queueR.data?.items ?? []

  return (
    <Flex direction="column" gap="4">
      <Flex justify="between" align="center">
        <Text size="2" color="gray">
          某分组下的在线设备实时队列
        </Text>
        <Flex gap="2" align="center">
          <Select.Root value={effGroup} onValueChange={setGroup} disabled={groups.length === 0}>
            <Select.Trigger placeholder="选择分组" />
            <Select.Content>
              {groups.map((g) => (
                <Select.Item key={g.group} value={g.group}>
                  {g.group}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
          <Button
            variant="soft"
            color="gray"
            onClick={() => {
              queueR.reload()
              notify.success('已刷新')
            }}
          >
            <ReloadIcon /> 刷新
          </Button>
        </Flex>
      </Flex>

      <Card size="2">
        {queueR.loading ? (
          <Flex justify="center" p="6">
            <Spinner size="3" />
          </Flex>
        ) : (
          <Table.Root variant="surface">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>客户端 ID</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>状态</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>排队</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>处理中 / 上限</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>最后在线</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>IP</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {items.map((c) => (
                <Table.Row key={c.clientId} align="center">
                  <Table.RowHeaderCell>
                    <Code variant="ghost">{c.clientId}</Code>
                  </Table.RowHeaderCell>
                  <Table.Cell>
                    <Badge color={c.status === 'online' ? 'green' : 'gray'} variant="soft">
                      {c.status === 'online' ? '在线' : '离线'}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>{c.pendingCount}</Table.Cell>
                  <Table.Cell>
                    {c.inFlight} / {c.maxInFlight}
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="2" color="gray">
                      {fmtTime(c.lastSeenAt)}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="2" color="gray">
                      {c.lastIp || '—'}
                    </Text>
                  </Table.Cell>
                </Table.Row>
              ))}
              {items.length === 0 && (
                <Table.Row>
                  <Table.Cell colSpan={6}>
                    <Text color="gray">{effGroup ? '该分组暂无在线设备' : '暂无分组'}</Text>
                  </Table.Cell>
                </Table.Row>
              )}
            </Table.Body>
          </Table.Root>
        )}
      </Card>
    </Flex>
  )
}

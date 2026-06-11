import { useState } from 'react'
import { Flex, Card, Table, Button, Badge, Text, Switch, Dialog, TextField, Spinner } from '@radix-ui/themes'
import { PlusIcon, ReloadIcon, Pencil1Icon } from '@radix-ui/react-icons'
import { get, post, patch } from '../api/client'
import { useFetch } from '../lib/useFetch'
import { notify } from '../lib/toast'
import { fmtTime } from '../lib/format'
import type { User } from '../types'

export default function UsersPage() {
  const { data, loading, reload } = useFetch(() => get<{ items: User[] }>('/api/users'))
  const users = data?.items ?? []

  async function toggleEnabled(u: User, enabled: boolean) {
    try {
      await patch(`/api/users/${u.id}/status`, { enabled })
      notify.success(enabled ? `已启用 ${u.username}` : `已禁用 ${u.username}`)
    } catch (e) {
      notify.error(e)
    } finally {
      reload()
    }
  }

  function refresh() {
    reload()
    notify.success('已刷新')
  }

  return (
    <Flex direction="column" gap="4">
      <Flex justify="between" align="center">
        <Text size="2" color="gray">
          后台管理员账号
        </Text>
        <Flex gap="2">
          <Button variant="soft" color="gray" onClick={refresh}>
            <ReloadIcon /> 刷新
          </Button>
          <CreateUserDialog onCreated={reload} />
        </Flex>
      </Flex>

      <Card size="2">
        {loading ? (
          <Flex justify="center" p="6">
            <Spinner size="3" />
          </Flex>
        ) : (
          <Table.Root variant="surface">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>用户名</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>角色</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>启用</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>备注</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>最后登录</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>操作</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {users.map((u) => (
                <Table.Row key={u.id} align="center">
                  <Table.RowHeaderCell>{u.username}</Table.RowHeaderCell>
                  <Table.Cell>
                    <Badge color={u.role === 'admin' ? 'blue' : 'gray'} variant="soft">
                      {u.role}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <Switch checked={u.enabled} onCheckedChange={(v) => toggleEnabled(u, v)} />
                  </Table.Cell>
                  <Table.Cell>
                    <Text color="gray">{u.notes || '—'}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="2" color="gray">
                      {fmtTime(u.lastLoginAt)}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <EditUserDialog user={u} onUpdated={reload} />
                  </Table.Cell>
                </Table.Row>
              ))}
              {users.length === 0 && (
                <Table.Row>
                  <Table.Cell colSpan={6}>
                    <Text color="gray">暂无账号</Text>
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

function CreateUserDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (!username.trim() || !password.trim()) {
      notify.error('用户名和密码必填')
      return
    }
    setBusy(true)
    try {
      await post('/api/users', { username: username.trim(), password, role: 'admin', enabled: true, notes: notes.trim() })
      notify.success(`已创建账号 ${username.trim()}`)
      setOpen(false)
      setUsername('')
      setPassword('')
      setNotes('')
      onCreated()
    } catch (e) {
      notify.error(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <Button>
          <PlusIcon /> 新建账号
        </Button>
      </Dialog.Trigger>
      <Dialog.Content maxWidth="420px">
        <Dialog.Title>新建账号</Dialog.Title>
        <Flex direction="column" gap="3" mt="3">
          <label>
            <Text size="2" mb="1" as="div" weight="medium">
              用户名
            </Text>
            <TextField.Root value={username} onChange={(e) => setUsername(e.target.value)} />
          </label>
          <label>
            <Text size="2" mb="1" as="div" weight="medium">
              密码
            </Text>
            <TextField.Root type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <label>
            <Text size="2" mb="1" as="div" weight="medium">
              备注（可选）
            </Text>
            <TextField.Root value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </Flex>
        <Flex gap="3" mt="4" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              取消
            </Button>
          </Dialog.Close>
          <Button onClick={submit} loading={busy}>
            创建
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}

function EditUserDialog({ user, onUpdated }: { user: User; onUpdated: () => void }) {
  const [open, setOpen] = useState(false)
  const [username, setUsername] = useState(user.username)
  const [password, setPassword] = useState('')
  const [notes, setNotes] = useState(user.notes || '')
  const [busy, setBusy] = useState(false)

  function onOpenChange(o: boolean) {
    setOpen(o)
    if (o) {
      setUsername(user.username)
      setPassword('')
      setNotes(user.notes || '')
    }
  }

  async function submit() {
    if (!username.trim()) {
      notify.error('用户名不能为空')
      return
    }
    setBusy(true)
    try {
      if (username.trim() !== user.username || notes.trim() !== (user.notes || '')) {
        await patch(`/api/users/${user.id}`, { username: username.trim(), notes: notes.trim() })
      }
      if (password.trim()) {
        await patch(`/api/users/${user.id}/password`, { password })
      }
      notify.success(`已更新账号 ${username.trim()}`)
      setOpen(false)
      setPassword('')
      onUpdated()
    } catch (e) {
      notify.error(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger>
        <Button variant="soft" color="gray" size="1">
          <Pencil1Icon /> 编辑
        </Button>
      </Dialog.Trigger>
      <Dialog.Content maxWidth="380px">
        <Dialog.Title>编辑账号</Dialog.Title>
        <Flex direction="column" gap="3" mt="3">
          <label>
            <Text size="2" mb="1" as="div" weight="medium">
              用户名
            </Text>
            <TextField.Root value={username} onChange={(e) => setUsername(e.target.value)} />
          </label>
          <label>
            <Text size="2" mb="1" as="div" weight="medium">
              新密码
            </Text>
            <TextField.Root
              type="password"
              placeholder="留空则不修改"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label>
            <Text size="2" mb="1" as="div" weight="medium">
              备注
            </Text>
            <TextField.Root value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </Flex>
        <Flex gap="3" mt="4" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              取消
            </Button>
          </Dialog.Close>
          <Button onClick={submit} loading={busy}>
            保存
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}

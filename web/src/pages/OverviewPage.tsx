import type { ReactNode, ReactElement } from 'react'
import { useEffect, useState } from 'react'
import { Box, Flex, Card, Heading, Text } from '@radix-ui/themes'
import { ActivityLogIcon, CheckCircledIcon, MobileIcon, LayersIcon, LapTimerIcon } from '@radix-ui/react-icons'
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  PieChart,
  Pie,
  Cell,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { get } from '../api/client'
import { useFetch } from '../lib/useFetch'
import type { TrendPoint, GroupInfo, Device } from '../types'

const tooltipStyle = {
  background: 'var(--color-panel-solid)',
  border: '1px solid var(--gray-5)',
  borderRadius: 8,
  fontSize: 12,
  boxShadow: 'var(--shadow-3)',
}
const labelStyle = { color: 'var(--gray-12)', fontWeight: 600 }
const axisTick = { fill: 'var(--gray-9)', fontSize: 11 }
const gridStroke = 'var(--gray-a4)'
const noAnim = { isAnimationActive: false as const }

const C = {
  accent: 'var(--accent-9)',
  success: 'var(--green-9)',
  failed: 'var(--red-9)',
  timeout: 'var(--amber-9)',
  latency: 'var(--violet-9)',
}

type RtBucket = { t: string; success: number; failed: number; timeout: number }

export default function OverviewPage() {
  const trendsR = useFetch(() => get<{ items: TrendPoint[] }>('/api/metrics/trends?days=7'))
  const groupsR = useFetch(() => get<{ items: GroupInfo[] }>('/api/groups'))
  const devicesR = useFetch(() => get<{ items: Device[] }>('/api/devices'))

  // 实时请求频谱：每 10s 轮询近 60 分钟的分钟桶
  const [realtime, setRealtime] = useState<RtBucket[]>([])
  useEffect(() => {
    let alive = true
    const load = () =>
      get<{ buckets: RtBucket[] }>('/api/metrics/realtime?minutes=60')
        .then((d) => {
          if (alive) setRealtime(d.buckets ?? [])
        })
        .catch(() => {})
    load()
    const id = setInterval(load, 10000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [])

  const trends = trendsR.data?.items ?? []
  const groups = groupsR.data?.items ?? []
  const devices = devicesR.data?.items ?? []

  const totalReq = trends.reduce((s, p) => s + p.totalRequests, 0)
  const totalSucc = trends.reduce((s, p) => s + p.successRequests, 0)
  const totalFailed = trends.reduce((s, p) => s + p.failedRequests, 0)
  const totalTimeout = trends.reduce((s, p) => s + p.timeoutRequests, 0)
  const successRate = totalReq ? Math.round((totalSucc / totalReq) * 1000) / 10 : 0
  const avgLatency = totalReq
    ? Math.round(trends.reduce((s, p) => s + p.avgLatencyMs * p.totalRequests, 0) / totalReq)
    : 0
  const onlineDevices = devices.filter((d) => d.status === 'online').length

  const trendData = trends.map((p) => ({
    date: p.statDate.slice(5),
    调用量: p.totalRequests,
    成功率: p.totalRequests ? Math.round(p.successRate * 10) / 10 : null,
    成功: p.successRequests,
    失败: p.failedRequests,
    超时: p.timeoutRequests,
    平均延迟: p.totalRequests ? p.avgLatencyMs : null,
  }))

  const statusPie = [
    { name: '成功', value: totalSucc, color: C.success },
    { name: '失败', value: totalFailed, color: C.failed },
    { name: '超时', value: totalTimeout, color: C.timeout },
  ].filter((x) => x.value > 0)

  const groupBar = [...groups]
    .sort((a, b) => b.requests7d - a.requests7d)
    .slice(0, 6)
    .map((g) => ({ group: g.group, 调用量: g.requests7d }))

  return (
    <Flex direction="column" gap="3">
      {/* 紧凑统计条 */}
      <Card size="2">
        <Flex align="center">
          <MiniStat label="近 7 天调用" value={totalReq} color="blue" icon={<ActivityLogIcon />} />
          <VDivider />
          <MiniStat label="成功率" value={`${successRate}%`} color="green" icon={<CheckCircledIcon />} />
          <VDivider />
          <MiniStat label="平均延迟" value={`${avgLatency} ms`} color="violet" icon={<LapTimerIcon />} />
          <VDivider />
          <MiniStat label="在线设备" value={`${onlineDevices}/${devices.length}`} color="cyan" icon={<MobileIcon />} />
          <VDivider />
          <MiniStat label="分组数" value={groups.length} color="amber" icon={<LayersIcon />} />
        </Flex>
      </Card>

      {/* 趋势 */}
      <Card size="2">
        <PanelHead title="调用量 & 成功率趋势" subtitle="柱：调用量 ｜ 线：成功率" />
        <Box mt="3" style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={trendData} margin={{ top: 6, right: 6, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.accent} stopOpacity={0.95} />
                  <stop offset="100%" stopColor={C.accent} stopOpacity={0.45} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={gridStroke} strokeDasharray="3 3" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tick={axisTick} dy={4} />
              <YAxis yAxisId="left" allowDecimals={false} tickLine={false} axisLine={false} tick={axisTick} width={36} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} unit="%" tickLine={false} axisLine={false} tick={axisTick} width={40} />
              <Tooltip cursor={{ fill: 'var(--gray-a3)' }} contentStyle={tooltipStyle} labelStyle={labelStyle} />
              <Bar yAxisId="left" dataKey="调用量" fill="url(#barFill)" radius={[5, 5, 0, 0]} maxBarSize={40} {...noAnim} />
              <Line yAxisId="right" type="monotone" dataKey="成功率" stroke={C.success} strokeWidth={2} unit="%" dot={{ r: 3, fill: C.success, strokeWidth: 0 }} activeDot={{ r: 5 }} connectNulls {...noAnim} />
            </ComposedChart>
          </ResponsiveContainer>
        </Box>
      </Card>

      {/* 组合卡 1：状态分布 + 平均延迟 */}
      <Card size="2">
        <Flex gap="4">
          <Panel title="请求状态分布" subtitle="近 7 天累计" height={190} flex={1} empty={statusPie.length === 0}>
            <PieChart>
              <Pie data={statusPie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={42} outerRadius={66} paddingAngle={2} stroke="var(--color-panel-solid)" strokeWidth={2} {...noAnim}>
                {statusPie.map((e) => (
                  <Cell key={e.name} fill={e.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend iconType="circle" formatter={(v) => <span style={{ color: 'var(--gray-11)', fontSize: 12 }}>{v}</span>} />
            </PieChart>
          </Panel>
          <VDivider />
          <Panel title="实时请求频谱" subtitle="每分钟 · 近 60 分钟 · 10s 刷新" height={190} flex={3} empty={realtime.length === 0}>
            <BarChart data={realtime} margin={{ top: 6, right: 6, bottom: 0, left: -20 }} barCategoryGap="12%" barGap={0}>
              <CartesianGrid vertical={false} stroke={gridStroke} strokeDasharray="3 3" />
              <XAxis dataKey="t" tickLine={false} axisLine={false} tick={axisTick} interval={9} minTickGap={8} dy={4} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={axisTick} width={36} />
              <Tooltip cursor={{ fill: 'var(--gray-a3)' }} contentStyle={tooltipStyle} labelStyle={labelStyle} />
              <Legend iconType="circle" formatter={(v) => <span style={{ color: 'var(--gray-11)', fontSize: 11 }}>{v}</span>} />
              <Bar dataKey="success" name="成功" stackId="s" fill={C.success} maxBarSize={7} {...noAnim} />
              <Bar dataKey="failed" name="失败" stackId="s" fill={C.failed} maxBarSize={7} {...noAnim} />
              <Bar dataKey="timeout" name="超时" stackId="s" fill={C.timeout} maxBarSize={7} radius={[2, 2, 0, 0]} {...noAnim} />
            </BarChart>
          </Panel>
        </Flex>
      </Card>

      {/* 组合卡 2：状态构成 + 分组调用量 */}
      <Card size="2">
        <Flex gap="4">
          <Panel title="每日请求状态构成" subtitle="成功 / 失败 / 超时" height={190}>
            <BarChart data={trendData} margin={{ top: 6, right: 6, bottom: 0, left: -20 }}>
              <CartesianGrid vertical={false} stroke={gridStroke} strokeDasharray="3 3" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tick={axisTick} dy={4} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={axisTick} width={36} />
              <Tooltip cursor={{ fill: 'var(--gray-a3)' }} contentStyle={tooltipStyle} labelStyle={labelStyle} />
              <Legend iconType="circle" formatter={(v) => <span style={{ color: 'var(--gray-11)', fontSize: 11 }}>{v}</span>} />
              <Bar dataKey="成功" stackId="s" fill={C.success} maxBarSize={40} {...noAnim} />
              <Bar dataKey="失败" stackId="s" fill={C.failed} maxBarSize={40} {...noAnim} />
              <Bar dataKey="超时" stackId="s" fill={C.timeout} radius={[4, 4, 0, 0]} maxBarSize={40} {...noAnim} />
            </BarChart>
          </Panel>
          <VDivider />
          <Panel title="分组调用量" subtitle="近 7 天 · Top 6" height={190} empty={groupBar.length === 0}>
            <BarChart data={groupBar} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
              <CartesianGrid horizontal={false} stroke={gridStroke} strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={axisTick} />
              <YAxis type="category" dataKey="group" tickLine={false} axisLine={false} tick={axisTick} width={72} />
              <Tooltip cursor={{ fill: 'var(--gray-a3)' }} contentStyle={tooltipStyle} labelStyle={labelStyle} />
              <Bar dataKey="调用量" fill={C.accent} radius={[0, 5, 5, 0]} maxBarSize={22} {...noAnim} />
            </BarChart>
          </Panel>
        </Flex>
      </Card>
    </Flex>
  )
}

function VDivider() {
  return <Box style={{ width: 1, alignSelf: 'stretch', background: 'var(--gray-a4)', flexShrink: 0 }} />
}

function PanelHead({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <Flex align="baseline" gap="2" wrap="wrap">
      <Heading size="3">{title}</Heading>
      {subtitle && (
        <Text size="1" color="gray">
          {subtitle}
        </Text>
      )}
    </Flex>
  )
}

function Panel({
  title,
  subtitle,
  height,
  flex = 1,
  empty = false,
  children,
}: {
  title: string
  subtitle?: string
  height: number
  flex?: number
  empty?: boolean
  children: ReactNode
}) {
  return (
    <Box style={{ flex, minWidth: 0 }}>
      <PanelHead title={title} subtitle={subtitle} />
      <Box mt="3" style={{ height }}>
        {empty ? (
          // 空状态不能塞进 ResponsiveContainer（会被测量成 0 宽导致文字竖排错位）
          <Flex align="center" justify="center" height="100%">
            <Text size="2" color="gray" style={{ whiteSpace: 'nowrap' }}>
              暂无数据
            </Text>
          </Flex>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {children as ReactElement}
          </ResponsiveContainer>
        )}
      </Box>
    </Box>
  )
}

function MiniStat({
  label,
  value,
  icon,
  color,
}: {
  label: string
  value: ReactNode
  icon: ReactNode
  color: string
}) {
  return (
    <Flex align="center" gap="2" px="3" py="1" style={{ flex: 1, minWidth: 0 }}>
      <Flex
        align="center"
        justify="center"
        style={{
          width: 34,
          height: 34,
          borderRadius: 9,
          flexShrink: 0,
          background: `var(--${color}-3)`,
          color: `var(--${color}-11)`,
        }}
      >
        {icon}
      </Flex>
      <Flex direction="column" style={{ minWidth: 0 }}>
        <Text size="1" color="gray" truncate>
          {label}
        </Text>
        <Heading size="4">{value}</Heading>
      </Flex>
    </Flex>
  )
}

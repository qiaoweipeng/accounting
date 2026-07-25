import { useState } from 'react'
import { useMemo, useRef, useEffect } from 'react'
import { Layout, Menu, Input, Button, Table, Tag, Space, Tooltip, Dropdown, Modal } from 'antd'
import { SearchOutlined, FolderOpenOutlined, ExportOutlined } from '@ant-design/icons'
import accountingData from './data/accounting_subjects02.json'
import { useAccountingStore } from './store'
import './App.css'

const { Header, Content } = Layout

// 会计科目类别配置
const categories = [
  { key: '资产类', label: '资产类', shortLabel: '资产', fixed: true },
  { key: '负债类', label: '负债类', shortLabel: '负债', fixed: true },
  { key: '共同类', label: '共同类', shortLabel: '共同', fixed: true },
  { key: '权益类', label: '权益类', shortLabel: '权益', fixed: true },
  { key: '成本类', label: '成本类', shortLabel: '成本', fixed: true },
  { key: '损益类', label: '损益类', shortLabel: '损益', fixed: true }
]

// 从数据中提取所有适用范围值作为筛选选项
const scopeFilters = (() => {
  const scopes = new Set()
  const collect = (items) => {
    items.forEach(item => {
      if (item.scope.includes('、')) {
        item.scope.split('、').forEach(s => scopes.add(s))
      } else {
        scopes.add(item.scope)
      }
      if (item.children) collect(item.children)
    })
  }
  collect(accountingData)
  return Array.from(scopes).map(value => ({ text: value, value }))
})()

// 主表格列配置
const columns = [
  {
    title: '科目编码',
    dataIndex: 'code',
    key: 'code',
    width: 120,
    // 编码格式化：4位直接显示，6位第4位后加横杠，8位第4位和第6位后加横杠
    render: (text) => {
      if (!text) return '-'
      let formatted = text
      if (text.length === 6) {
        formatted = text.slice(0, 4) + '-' + text.slice(4)
      } else if (text.length === 8) {
        formatted = text.slice(0, 4) + '-' + text.slice(4, 6) + '-' + text.slice(6)
      }
      return <span style={{ color: '#999' }}>{formatted}</span>
    },
  },
  {
    title: '科目名称',
    dataIndex: 'name',
    key: 'name',
    width: 120,
  },
  {
    title: '余额方向',
    dataIndex: 'balanceDirection',
    key: 'balanceDirection',
    width: 80,
    filters: [
      { text: '借', value: '借' },
      { text: '贷', value: '贷' },
    ],
    render: (text) => <span style={{ color: '#999' }}>{text || '-'}</span>,
  },
  {
    title: '适用范围',
    dataIndex: 'scope',
    key: 'scope',
    width: 100,
    filters: scopeFilters,
    render: (text) => {
      const scope = text || '所有企业'
      const color = scopeColors[scope] || 'blue'
      return <Tag color={color}>{scope}</Tag>
    },
  },
  {
    title: '说明',
    dataIndex: 'description',
    key: 'description',
    width: 550,
    render: (text) => <span style={{ color: '#999', overflowX: 'auto', whiteSpace: 'nowrap', display: 'block' }}>{text || '-'}</span>,
  },
]

// 类别标签颜色映射
const categoryColors = {
  '资产类': 'blue',
  '负债类': 'orange',
  '共同类': 'cyan',
  '权益类': 'purple',
  '成本类': 'green',
  '损益类': 'red'
}

// 适用范围标签颜色映射（匹配数据中实际的值）
const scopeColors = {
  '所有企业': 'blue',
  '银行': 'orange',
  '证券公司': 'purple',
  '金融企业': 'magenta',
  '保险公司': 'cyan',
  '商业企业': 'gold',
  '农业企业': 'green',
  '租赁企业': 'volcano',
  '石油天然气开采企业': 'red',
}

// 搜索结果表格列配置
const searchColumns = [
  {
    title: '科目类别',
    dataIndex: 'category',
    key: 'category',
    width: 80,
    render: (text) => <Tag color={categoryColors[text] || 'blue'}>{text}</Tag>,
  },
  {
    title: '科目编码',
    dataIndex: 'code',
    key: 'code',
    width: 80,
    render: (text) => {
      if (!text) return '-'
      let formatted = text
      if (text.length === 6) {
        formatted = text.slice(0, 4) + '-' + text.slice(4)
      } else if (text.length === 8) {
        formatted = text.slice(0, 4) + '-' + text.slice(4, 6) + '-' + text.slice(6)
      }
      return <span style={{ color: '#999' }}>{formatted}</span>
    },
  },
  {
    title: '科目名称',
    dataIndex: 'name',
    key: 'name',
    width: 200,
  },
]

/**
 * 会计科目管理主组件
 * 功能：树形表格展示、类别筛选、搜索定位、列筛选、展开折叠
 */
function App() {
  // 笔记模态框状态
  const [notesModalOpen, setNotesModalOpen] = useState(false)

  // 从 Zustand Store 获取状态
  const selectedCategory = useAccountingStore(s => s.selectedCategory)
  const searchText = useAccountingStore(s => s.searchText)
  const searchOpen = useAccountingStore(s => s.searchOpen)
  const highlightedRowKey = useAccountingStore(s => s.highlightedRowKey)
  const expandedRowKeys = useAccountingStore(s => s.expandedRowKeys)
  const tableFilters = useAccountingStore(s => s.tableFilters)

  // 从 Zustand Store 获取操作方法
  const setSelectedCategory = useAccountingStore(s => s.setSelectedCategory)
  const setSearchText = useAccountingStore(s => s.setSearchText)
  const setSearchOpen = useAccountingStore(s => s.setSearchOpen)
  const setExpandedRowKeys = useAccountingStore(s => s.setExpandedRowKeys)
  const setTableFilters = useAccountingStore(s => s.setTableFilters)
  const handleSearchResultClick = useAccountingStore(s => s.handleSearchResultClick)

  // 表格容器引用，用于滚动定位
  const tableWrapperRef = useRef(null)

  // 根据选中类别过滤数据（第一层过滤）
  const filteredData = useMemo(() => {
    return accountingData.filter((item) => item.category === selectedCategory)
  }, [selectedCategory])

  // 根据表格列筛选条件过滤树形数据（第二层过滤）
  const displayData = useMemo(() => {
    const { balanceDirection, scope } = tableFilters
    // 没有筛选条件时直接返回
    if (balanceDirection === null && scope === null) return filteredData

    // 判断适用范围是否匹配（支持复合范围如"证券、银行"的拆分匹配）
    const matchScope = (itemScope, selectedScopes) => {
      if (selectedScopes.includes(itemScope)) return true
      if (itemScope.includes('、') && itemScope.split('、').some(s => selectedScopes.includes(s))) return true
      return false
    }

    // 递归过滤树形数据，保留匹配的节点及其父节点
    const filterTree = (items) => {
      return items
        .map(item => {
          const children = item.children ? filterTree(item.children) : undefined
          const selfMatch =
            (balanceDirection === null || balanceDirection.includes(item.balanceDirection)) &&
            (scope === null || matchScope(item.scope, scope))
          // 自身匹配或有匹配的子节点时保留
          if (selfMatch) return { ...item, children }
          if (children && children.length > 0) return { ...item, children }
          return null
        })
        .filter(Boolean)
    }

    return filterTree(filteredData)
  }, [filteredData, tableFilters])

  // 统计树形数据总记录数（含子节点）
  const totalCount = useMemo(() => {
    const countTotal = (items) => {
      return items.reduce((sum, item) => {
        return sum + 1 + (item.children ? countTotal(item.children) : 0)
      }, 0)
    }
    return countTotal(displayData)
  }, [displayData])

  // 给列配置添加受控筛选值，确保筛选UI状态与Store同步
  const tableColumns = useMemo(() => {
    return columns.map(col => {
      if (col.key === 'balanceDirection') {
        return { ...col, filteredValue: tableFilters.balanceDirection || null }
      }
      if (col.key === 'scope') {
        return { ...col, filteredValue: tableFilters.scope || null }
      }
      return col
    })
  }, [tableFilters])

  // 搜索结果点击后滚动定位到表格中间
  useEffect(() => {
    if (highlightedRowKey) {
      const timer = setTimeout(() => {
        const wrapper = tableWrapperRef.current
        if (wrapper) {
          const row = wrapper.querySelector(`tr[data-row-key="${highlightedRowKey}"]`)
          if (row) {
            row.scrollIntoView({ block: 'center', behavior: 'smooth' })
          }
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [highlightedRowKey, displayData])

  // 搜索功能：递归搜索编码和名称，最多返回10条结果
  const searchResults = useMemo(() => {
    if (!searchText) return []
    const results = []

    const searchTree = (items) => {
      for (const item of items) {
        if (item.code.toLowerCase().includes(searchText.toLowerCase()) ||
          item.name.toLowerCase().includes(searchText.toLowerCase())) {
          results.push(item)
        }
        if (item.children && item.children.length > 0) {
          searchTree(item.children)
        }
        if (results.length >= 10) break
      }
    }

    searchTree(accountingData)
    return results.slice(0, 10)
  }, [searchText])

  // 筛选出固定显示的类别（用于悬浮按钮组）
  const filteredCategories = categories.filter(c => c.fixed)

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 顶部导航栏 */}
      <Header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 999, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1890ff' }}>会计从业人员模拟系统</div>
        <Menu
          style={{
            flex: 1,                    // 占据剩余空间
            justifyContent: 'flex-end',   // 内容右对齐
            borderBottom: 'none',          // 去掉底部边框
          }}
          mode="horizontal"
          defaultSelectedKeys={['subjects']}
          items={[
          
            { key: 'subjects', label: '会计科目' },
            {
              key: 'reports',
              label: '会计报表',
              children: [
                { key: 'balanceSheet', label: '资产负债表' },
                { key: 'incomeStatement', label: '利润表' },
                { key: 'cashFlow', label: '现金流量表' },
                { key: 'equityChange', label: '所有者权益变动表' },
              ],
            },
              { key: 'notes', label: '我的笔记', onClick: () => setNotesModalOpen(true) },
            {
              key: 'links',
              label: '相关链接',
              children: [
                { key: 'link1', label: '全国会计人员统一服务平台', onClick: () => window.open('https://ausm.mof.gov.cn/index/', '_blank') },
                { key: 'link2', label: '知了课堂', onClick: () => window.open('https://www.zlketang.com/', '_blank') },
              ],
            },
          ]}
        />
      </Header>

      {/* 主内容区 */}
      <Content style={{ padding: '84px 24px 24px', background: '#f5f5f5' }}>
        <div style={{ background: '#fff', borderRadius: '8px', padding: '24px', minHeight: 'calc(100vh - 160px)' }}>
          {/* 搜索框、类别按钮和导出按钮区域 */}
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 50 }}>
              {/* 搜索框下拉展示搜索结果 */}
              <Dropdown
                open={searchOpen && searchResults.length > 0}
                onOpenChange={setSearchOpen}
                dropdownRender={() => (
                  <div style={{ width: 400, padding: 8, maxHeight: 400, overflow: 'auto' }}>
                    <Table
                      columns={searchColumns}
                      dataSource={searchResults}
                      rowKey={(record) => `${record.name}-${record.category}`}
                      pagination={false}
                      onRow={(record) => ({ onClick: () => handleSearchResultClick(record) })}
                      size="small"
                      bordered
                      expandable={{ showExpandColumn: false }}
                    />
                  </div>
                )}
              >
                <Input.Search
                  placeholder="搜索会计科目（编码或名称）"
                  prefix={<SearchOutlined />}
                  value={searchText}
                  onChange={(e) => {
                    setSearchText(e.target.value)
                    if (e.target.value) setSearchOpen(true)
                  }}
                  allowClear
                  onClear={() => {
                    setSearchText('')
                    setSearchOpen(false)
                  }}
                  style={{ width: 300 }}
                  onFocus={() => {
                    if (searchText) setSearchOpen(true)
                  }}
                  size="middle"
                />
              </Dropdown>

              {/* 类别切换按钮组 */}
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Space.Compact orientation="horizontal">
                  {filteredCategories.map((category) => (
                    <Button
                      key={category.key}
                      type={selectedCategory === category.key ? 'primary' : 'default'}
                      onClick={() => setSelectedCategory(category.key)}
                      size="middle"
                    >
                      {category.shortLabel}
                    </Button>
                  ))}
                </Space.Compact>
              </div>
            </div>

            {/* 导出按钮 */}
            <Button
              type="primary"
              icon={<ExportOutlined />}
              onClick={() => {
                const jsonContent = JSON.stringify(accountingData, null, 2)
                const blob = new Blob([jsonContent], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = '会计科目数据.json'
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                URL.revokeObjectURL(url)
              }}
              size="middle"
            >
              导出
            </Button>
          </div>

          {/* 主表格区域 */}
          <div ref={tableWrapperRef}>
            <Table
              columns={tableColumns}
              dataSource={displayData}
              rowKey="code"
              pagination={false}
              scroll={{ x: 930, y: 'calc(100vh - 320px)' }}
              bordered
              // 高亮行样式
              rowClassName={(record) => {
                return record.code === highlightedRowKey ? 'highlight-row' : ''
              }}
              // 树形展开配置
              expandable={{
                expandedRowKeys,
                onExpandedRowsChange: (keys) => setExpandedRowKeys(keys),
              }}
              // 列筛选回调（受控模式）
              onChange={(_pagination, filters) => {
                setTableFilters({
                  balanceDirection: filters.balanceDirection ?? [],
                  scope: filters.scope ?? [],
                })
              }}
              // 底部汇总统计
              summary={() => (
                <Table.Summary fixed>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={5} style={{ textAlign: 'right' }}>
                      共 {totalCount} 条记录
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </div>
        </div>
      </Content>

      {/* 我的笔记模态框 */}
      <Modal
        title="我的笔记"
        open={notesModalOpen}
        onCancel={() => setNotesModalOpen(false)}
        width="80%"
        footer={null}
        forceRender
      >
        <div style={{ width: '100%', height: 600 }}>
          <iframe
            src="https://hwqlhqyloqd.feishu.cn/wiki/QOlhw6OcJiEF7jkh0X6csKCrnwe"
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="我的笔记"
          />
        </div>
      </Modal>
    </Layout>
  )
}

export default App

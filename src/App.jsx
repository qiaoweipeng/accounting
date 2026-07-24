import { useMemo, useRef, useEffect } from 'react'
import { Layout, Menu, Input, Button, Table, Tag, Space, Tooltip, Dropdown } from 'antd'
import { SearchOutlined, FolderOpenOutlined } from '@ant-design/icons'
import accountingData from '../会计科目_树形_422编码.json'
import { useAccountingStore } from './store'
import './App.css'

const { Header, Content } = Layout

const categories = [
  { key: '资产类', label: '资产类', shortLabel: '资产', fixed: true },
  { key: '负债类', label: '负债类', shortLabel: '负债', fixed: true },
  { key: '共同类', label: '共同类', shortLabel: '共同', fixed: true },
  { key: '权益类', label: '权益类', shortLabel: '权益', fixed: true },
  { key: '成本类', label: '成本类', shortLabel: '成本', fixed: true },
  { key: '损益类', label: '损益类', shortLabel: '损益', fixed: true }
]

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

const columns = [
  {
    title: '科目编码',
    dataIndex: 'code',
    key: 'code',
    width: 120,
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
    render: (text) => <Tag color="blue">{text || '所有企业'}</Tag>,
  },
  {
    title: '说明',
    dataIndex: 'description',
    key: 'description',
    width: 550,
    render: (text) => <span style={{ color: '#999', overflowX: 'auto', whiteSpace: 'nowrap', display: 'block' }}>{text || '-'}</span>,
  },
]

const categoryColors = {
  '资产类': 'blue',
  '负债类': 'orange',
  '共同类': 'cyan',
  '权益类': 'purple',
  '成本类': 'green',
  '损益类': 'red'
}

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

function App() {
  const selectedCategory = useAccountingStore(s => s.selectedCategory)
  const searchText = useAccountingStore(s => s.searchText)
  const searchOpen = useAccountingStore(s => s.searchOpen)
  const highlightedRowKey = useAccountingStore(s => s.highlightedRowKey)
  const expandedRowKeys = useAccountingStore(s => s.expandedRowKeys)
  const tableFilters = useAccountingStore(s => s.tableFilters)

  const setSelectedCategory = useAccountingStore(s => s.setSelectedCategory)
  const setSearchText = useAccountingStore(s => s.setSearchText)
  const setSearchOpen = useAccountingStore(s => s.setSearchOpen)
  const setExpandedRowKeys = useAccountingStore(s => s.setExpandedRowKeys)
  const setTableFilters = useAccountingStore(s => s.setTableFilters)
  const handleSearchResultClick = useAccountingStore(s => s.handleSearchResultClick)

  const tableWrapperRef = useRef(null)

  const filteredData = useMemo(() => {
    return accountingData.filter((item) => item.category === selectedCategory)
  }, [selectedCategory])

  const displayData = useMemo(() => {
    const { balanceDirection, scope } = tableFilters
    if (balanceDirection === null && scope === null) return filteredData

    const matchScope = (itemScope, selectedScopes) => {
      if (selectedScopes.includes(itemScope)) return true
      if (itemScope.includes('、') && itemScope.split('、').some(s => selectedScopes.includes(s))) return true
      return false
    }

    const filterTree = (items) => {
      return items
        .map(item => {
          const children = item.children ? filterTree(item.children) : undefined
          const selfMatch =
            (balanceDirection === null || balanceDirection.includes(item.balanceDirection)) &&
            (scope === null || matchScope(item.scope, scope))
          if (selfMatch) return { ...item, children }
          if (children && children.length > 0) return { ...item, children }
          return null
        })
        .filter(Boolean)
    }

    return filterTree(filteredData)
  }, [filteredData, tableFilters])

  const totalCount = useMemo(() => {
    const countTotal = (items) => {
      return items.reduce((sum, item) => {
        return sum + 1 + (item.children ? countTotal(item.children) : 0)
      }, 0)
    }
    return countTotal(displayData)
  }, [displayData])

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

  const filteredCategories = categories.filter(c => c.fixed)

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 24, background: '#fff' }}>
        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1890ff' }}>会计从业人员模拟系统</div>
        <Menu
          mode="horizontal"
          defaultSelectedKeys={['subjects']}
          style={{ minWidth: 260 }}
          items={[
            { key: 'subjects', label: '会计科目' },
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

      <Content style={{ padding: '84px 24px 24px', background: '#f5f5f5' }}>
        <div style={{ background: '#fff', borderRadius: '8px', padding: '24px', minHeight: 'calc(100vh - 160px)' }}>
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 50 }}>
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
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {/* <span style={{ fontSize: 14, fontWeight: 500, color: '#666', marginRight: 8 }}>类型选择:</span> */}
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
          <div ref={tableWrapperRef}>
          <Table
            columns={tableColumns}
            dataSource={displayData}
            rowKey="code"
            pagination={false}
            scroll={{ x: 930, y: 'calc(100vh - 320px)' }}
            bordered
            rowClassName={(record) => {
              return record.code === highlightedRowKey ? 'highlight-row' : ''
            }}
            expandable={{
              expandedRowKeys,
              onExpandedRowsChange: (keys) => setExpandedRowKeys(keys),
            }}
            onChange={(_pagination, filters) => {
              setTableFilters({
                balanceDirection: filters.balanceDirection ?? [],
                scope: filters.scope ?? [],
              })
            }}
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
    </Layout>
  )
}

export default App
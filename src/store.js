import { create } from 'zustand'

const defaultTableFilters = { balanceDirection: ['借', '贷'], scope: ['所有企业'] }

const scopeMatches = (itemScope, selectedScopes) => {
  if (selectedScopes.includes(itemScope)) return true
  if (itemScope.includes('、') && itemScope.split('、').some(s => selectedScopes.includes(s))) return true
  return false
}

export const useAccountingStore = create((set, get) => ({
  selectedCategory: '资产类',
  searchText: '',
  searchOpen: false,
  highlightedRowKey: null,
  expandedRowKeys: [],
  tableFilters: { ...defaultTableFilters },

  setSelectedCategory: (category) => set({ selectedCategory: category }),
  setSearchText: (text) => set({ searchText: text }),
  setSearchOpen: (open) => set({ searchOpen: open }),
  setHighlightedRowKey: (key) => set({ highlightedRowKey: key }),
  setExpandedRowKeys: (keys) => set({ expandedRowKeys: keys }),
  setTableFilters: (filters) => set({ tableFilters: filters }),

  handleSearchResultClick: (record) => {
    const { tableFilters } = get()
    const balanceDirection = tableFilters.balanceDirection || []
    const scope = tableFilters.scope || []

    const newBalanceDirection = balanceDirection.includes(record.balanceDirection)
      ? balanceDirection
      : [...balanceDirection, record.balanceDirection]

    const newScope = scopeMatches(record.scope, scope)
      ? scope
      : [...scope, record.scope]

    set({
      selectedCategory: record.category,
      searchText: '',
      searchOpen: false,
      highlightedRowKey: record.code,
      tableFilters: { balanceDirection: newBalanceDirection, scope: newScope },
      expandedRowKeys: record.code.length > 4 ? [record.code.substring(0, 4)] : [],
    })
    setTimeout(() => {
      set({ highlightedRowKey: null })
    }, 3000)
  },
}))

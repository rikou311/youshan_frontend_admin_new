import { reactive, ref } from 'vue'

export function usePagination(defaultPageSize = 10) {
  const pagination = reactive({
    page: 1,
    pageSize: defaultPageSize,
    total: 0,
  })

  function resetPagination() {
    pagination.page = 1
    pagination.total = 0
  }

  return {
    pagination,
    resetPagination,
  }
}

export function useTableList<T, P extends Record<string, unknown>>(
  fetcher: (params: P & { page: number; pageSize: number }) => Promise<{ list: T[]; total: number }>,
  defaultParams: () => P,
  defaultPageSize = 10,
) {
  const loading = ref(false)
  const list = ref<T[]>([]) as { value: T[] }
  const { pagination, resetPagination } = usePagination(defaultPageSize)

  async function fetchList() {
    loading.value = true
    try {
      const result = await fetcher({
        ...defaultParams(),
        page: pagination.page,
        pageSize: pagination.pageSize,
      })
      list.value = result.list
      pagination.total = result.total
    } finally {
      loading.value = false
    }
  }

  async function handleSearch() {
    pagination.page = 1
    await fetchList()
  }

  async function handlePageChange(page: number) {
    pagination.page = page
    await fetchList()
  }

  async function handleSizeChange(pageSize: number) {
    pagination.pageSize = pageSize
    pagination.page = 1
    await fetchList()
  }

  return {
    loading,
    list,
    pagination,
    fetchList,
    handleSearch,
    handlePageChange,
    handleSizeChange,
    resetPagination,
  }
}

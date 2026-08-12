<script setup lang="ts">
import { ref } from 'vue'
import type { DashboardFilterParams } from '@/api/dashboard'
import MerchantLeaderboard from './components/MerchantLeaderboard.vue'
import ProductRanking from './components/ProductRanking.vue'
import SalesTrendChart from './components/SalesTrendChart.vue'

const currentFilterParams = ref<DashboardFilterParams | null>(null)

function handleSalesDataUpdated(data: {
  dateRange: string[]
  category: string
}) {
  currentFilterParams.value = {
    dateRange: data.dateRange,
    category: data.category,
  }
}
</script>

<template>
  <div class="dashboard-container">
    <SalesTrendChart @data-updated="handleSalesDataUpdated" />

    <div class="ranking-container">
      <div class="ranking-item">
        <ProductRanking :filter-params="currentFilterParams" />
      </div>
      <div class="ranking-item">
        <MerchantLeaderboard :filter-params="currentFilterParams" />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.dashboard-container {
  padding: 20px;
  background: #f5f5f5;
  min-height: calc(100vh - 50px);
}

.ranking-container {
  display: flex;
  gap: 20px;
  margin-top: 20px;

  .ranking-item {
    flex: 1;
    min-width: 0;
  }

  @media (max-width: 1200px) {
    flex-direction: column;

    .ranking-item {
      width: 100%;
    }
  }
}
</style>

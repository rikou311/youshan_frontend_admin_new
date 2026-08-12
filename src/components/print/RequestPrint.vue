<script setup lang="ts">
import { computed } from 'vue'
import type { RequestPrintCustomer } from '@/utils/merchant-order-print'
import {
  getRequestPagedRows,
  truncatePrintTitle,
  type PrintProductLine,
} from '@/utils/merchant-order-print'
import { formatDictionary } from '@/utils/dictionary'
import { formatMoneyJp, formatPostcode, formatTimestampJp, getMonthRangeLabel } from '@/utils/format'

interface Props {
  customers: RequestPrintCustomer[]
  datalist: Record<number, Record<string, Record<string, PrintProductLine>>>
  totalList: Record<number, Record<string, number>>
  taxTotal: Record<number, number>
  moneyTotal: Record<number, number>
  depositmoney: Record<number, number>
  reqmoney: Record<number, number>
  refunder: Record<number, Array<{ rid: string; total: number }>>
  ld: Record<number, number>
  yf: Record<number, number>
  svf: Record<number, number>
  pointTotal: Record<number, number>
  otherCost: Record<number, Record<string, string>>
  today?: Date
  reqId?: string
  amountHidden?: boolean
  titleHidden?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  today: () => new Date(),
  reqId: '',
  amountHidden: false,
  titleHidden: false,
})

const monthRange = computed(() => getMonthRangeLabel(props.today))

function payLabel(pay?: number | string) {
  return formatDictionary('pay_type', pay ?? '')
}

function getPages(customer: RequestPrintCustomer) {
  return getRequestPagedRows(props.datalist[customer.id] ?? {})
}

function formatAddress(address?: string) {
  if (!address) {
    return ''
  }
  return String(address)
    .split(/\s+/)
    .filter((part) => part && part !== 'null' && part !== 'undefined')
    .join(' ')
}

function purchaseTotal(uid: number) {
  return (
    Number(props.moneyTotal[uid] ?? 0) +
    Number(props.yf[uid] ?? 0) +
    Number(props.ld[uid] ?? 0) +
    Number(props.svf[uid] ?? 0) -
    Number(props.pointTotal[uid] ?? 0)
  )
}

function monthTotal(uid: number) {
  return purchaseTotal(uid) + Number(props.taxTotal[uid] ?? 0)
}

function balanceTotal(uid: number) {
  return (
    monthTotal(uid) -
    (Number(props.depositmoney[uid] ?? 0) - Number(props.reqmoney[uid] ?? 0))
  )
}
</script>

<template>
  <div id="requestPrintRoot" class="jee-fk-form-request">
    <div id="requestPrintArea">
      <template v-for="val in customers" :key="val.id">
        <div
          v-for="(pageData, pageIndex) in getPages(val)"
          :key="`${val.id}-${pageIndex}`"
          class="page_box"
        >
          <div class="request-div">
            <div class="title">
              適格請求書{{ titleHidden ? '(兼領収書)' : '' }}
            </div>
            <div v-if="pageIndex === 0" class="header">
              <div class="header-left">
                <div class="customer-code">お客様コードNo {{ val.id }}</div>
                <div class="customer-zip">〒{{ formatPostcode(val.zip) }}</div>
                <div class="customer-address">{{ formatAddress(val.address) }}</div>
                <div class="customer-name">{{ val.unick }} 様 [{{ val.ucode }}]</div>
                <div class="customer-connect">
                  <div class="tel-left">電話番号</div>
                  <div class="tel-right">{{ val.phone }}</div>
                </div>
                <div class="customer-connect">
                  <div class="tel-left">請求期間</div>
                  <div class="tel-right">{{ monthRange }}</div>
                </div>
              </div>
              <div class="header-right">
                <div class="reqno">
                  <div class="reqno-left">請求書番号</div>
                  <div class="reqno-right">{{ reqId || val.requestid }}</div>
                </div>
                <div class="company-name">株式会社有善</div>
                <div class="company-address">
                  <div class="company-zip">〒334-0073</div>
                  <div>埼玉県川口市赤井2-13-10</div>
                </div>
                <div class="company-info">
                  <div class="info-left">登録番号</div>
                  <div class="info-right">T7420001014339</div>
                </div>
                <div class="company-info">
                  <div class="info-left" style="margin-right: 10px">お振込口座</div>
                  <div class="info-right">
                    川口信用金庫(赤井支店025)
                    <br />普通 0254411
                    <br />カ)ユウゼン
                  </div>
                </div>
              </div>
            </div>
            <div class="money">
              <div class="msg">
                <span>お振込み手数料は貴社負担にてお願い申し上げます。</span>
              </div>
              <div class="tables">
                <div class="divleft">
                  <table>
                    <thead>
                      <tr>
                        <th>前回御請求額</th>
                        <th>御入金額</th>
                        <th>前回分繰越額</th>
                        <th>当月お買上金額</th>
                        <th>当月お買上消費税額</th>
                        <th>当月合計金額</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style="height: 32px">¥ {{ formatMoneyJp(reqmoney[val.id]) }}</td>
                        <td>¥ {{ formatMoneyJp(depositmoney[val.id]) }}</td>
                        <td>
                          ¥
                          {{
                            formatMoneyJp(
                              Number(depositmoney[val.id] ?? 0) - Number(reqmoney[val.id] ?? 0),
                            )
                          }}
                        </td>
                        <td>¥ {{ formatMoneyJp(purchaseTotal(val.id)) }}</td>
                        <td>¥ {{ formatMoneyJp(taxTotal[val.id]) }}</td>
                        <td>¥ {{ formatMoneyJp(monthTotal(val.id)) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div class="divrightRes">
                  <table>
                    <thead>
                      <tr>
                        <th>御請求残高</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style="height: 32px">¥ {{ formatMoneyJp(balanceTotal(val.id)) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div class="taxMsg">商品名欄に※がある場合、消費税区分は8%となります。</div>
            <div class="products">
              <table>
                <thead>
                  <tr>
                    <th class="date">伝票日付</th>
                    <th class="orderid">伝票No</th>
                    <th class="name">品名</th>
                    <th style="border-left-style: hidden; width: 30px" />
                    <th class="count">数量</th>
                    <th class="count">単位</th>
                    <th>単価</th>
                    <th>金額</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(row, rowIndex) in pageData.rows"
                    :key="`${val.id}-${pageIndex}-${rowIndex}`"
                  >
                    <td v-if="row.showDate" class="center" :rowspan="row.dateRowspan">
                      {{ formatTimestampJp(row.time) }}
                    </td>
                    <td v-if="row.showOrderId" class="center" :rowspan="row.orderIdRowspan">
                      {{ row.orderId }}
                      <br />
                      {{ payLabel(row.pay) }}
                    </td>
                    <td>
                      {{ truncatePrintTitle(row.title) }}
                      <span v-if="String(row.home).includes('3')">活动</span>
                    </td>
                    <td class="center">{{ row.tax === 8 ? '※' : '' }}</td>
                    <td class="center">{{ row.count }}</td>
                    <td class="center">{{ row.unit }}</td>
                    <td v-if="amountHidden" class="end">*******</td>
                    <td v-else class="end">¥ {{ formatMoneyJp(row.price) }}</td>
                    <td v-if="amountHidden" class="end">*******</td>
                    <td v-else class="end">¥ {{ formatMoneyJp(row.total) }}</td>
                  </tr>
                </tbody>
                <tfoot v-if="pageData.isLastPage">
                  <tr v-for="(value, key) in refunder[val.id] ?? []" :key="key">
                    <td style="text-align: center; font-size: 12px">返金ID:</td>
                    <td colspan="6" style="text-align: left; padding-left: 15px; font-size: 12px">
                      {{ value.rid }}
                    </td>
                    <td style="text-align: end; font-size: 12px">
                      - ¥ {{ formatMoneyJp(value.total) }}
                    </td>
                  </tr>
                  <tr>
                    <td style="text-align: center; font-size: 12px" rowspan="2">備考欄</td>
                    <td colspan="2" rowspan="2" />
                    <td colspan="3" style="text-align: right">小計</td>
                    <td colspan="2" style="text-align: right">
                      ¥ {{ formatMoneyJp(moneyTotal[val.id]) }}
                    </td>
                  </tr>
                  <tr>
                    <td colspan="3" style="text-align: right">(消費税)</td>
                    <td colspan="2" style="text-align: right">
                      ¥ {{ formatMoneyJp(taxTotal[val.id]) }}
                    </td>
                  </tr>
                  <tr
                    v-for="(oc, key, index) in otherCost[val.id] ?? {}"
                    :key="String(key)"
                  >
                    <td
                      v-if="index === 0"
                      style="text-align: center; font-size: 12px"
                      :rowspan="Object.keys(otherCost[val.id] ?? {}).length"
                    >
                      その他
                    </td>
                    <td>{{ key }}</td>
                    <td colspan="6" style="text-align: right">{{ oc }}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div v-if="pageData.isLastPage" class="foot-total">
              <div>〔小計内訳〕</div>
              <div>
                <table>
                  <tbody>
                    <tr>
                      <td style="width: 80px">冷藏费:</td>
                      <td style="width: 120px">¥ {{ formatMoneyJp(ld[val.id]) }}</td>
                      <td style="width: 80px">运费</td>
                      <td style="width: 120px">¥ {{ formatMoneyJp(yf[val.id]) }}</td>
                      <td style="width: 120px">货到付款费:</td>
                      <td style="width: 120px">¥ {{ formatMoneyJp(svf[val.id]) }}</td>
                      <td style="width: 80px">积分:</td>
                      <td style="width: 120px">
                        {{ (pointTotal[val.id] ?? 0) > 0 ? '-' : '' }} ¥
                        {{ formatMoneyJp(pointTotal[val.id]) }}
                      </td>
                    </tr>
                    <tr v-for="(dval, dkey) in totalList[val.id] ?? {}" :key="dkey">
                      <td style="width: 80px">本体:</td>
                      <td style="width: 120px">¥ {{ formatMoneyJp(dval) }}</td>
                      <td style="width: 80px">消費税:</td>
                      <td style="width: 120px">
                        ¥
                        {{
                          formatMoneyJp(
                            (Number(dval) * Number(String(dkey).split('_')[0])) / 100,
                          )
                        }}
                      </td>
                      <td />
                      <td>
                        {{ String(dkey).split('_')[1] === '0' ? '軽減' : ''
                        }}{{ String(dkey).split('_')[0] }}%対象
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style lang="scss" src="./styles/request-print.scss"></style>

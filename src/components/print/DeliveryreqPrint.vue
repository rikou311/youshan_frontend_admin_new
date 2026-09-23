<script setup lang="ts">
import { computed } from 'vue'
import type { DeliveryPrintItem } from '@/utils/merchant-order-print'
import { formatMoneyJp, formatPostcode, getMonthRangeLabel } from '@/utils/format'

interface Props {
  list: DeliveryPrintItem[]
  totalList: Record<number, Record<string, number>>
  taxTotal: Record<number, number>
  moneyTotal: Record<number, number>
  ld: Record<number, number>
  yf: Record<number, number>
  svf: Record<number, number>
  point: Record<number, number>
  today?: Date
  double?: boolean
  amountHidden?: boolean
  titleHidden?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  today: () => new Date(),
  double: false,
  amountHidden: false,
  titleHidden: false,
})

const monthRange = computed(() => getMonthRangeLabel(props.today))

function productEntries(item: DeliveryPrintItem) {
  return Object.entries(item.data ?? {})
}

function otherFee(oid: number) {
  return (
    Number(props.ld[oid] ?? 0) +
    Number(props.yf[oid] ?? 0) +
    Number(props.svf[oid] ?? 0) -
    Number(props.point[oid] ?? 0)
  )
}

function grandTotal(oid: number) {
  return (
    Number(props.moneyTotal[oid] ?? 0) +
    Number(props.taxTotal[oid] ?? 0) +
    Number(props.ld[oid] ?? 0) +
    Number(props.yf[oid] ?? 0) +
    Number(props.svf[oid] ?? 0) -
    Number(props.point[oid] ?? 0)
  )
}
</script>

<template>
  <div id="deliveryreqPrintRoot" class="jee-fk-form-delivery">
    <div id="deliveryreqPrintArea">
      <div v-for="val in list" :key="val.oid" class="page_box">
        <div v-for="v in double ? 2 : 1" :key="v" class="deliveryreq-div">
          <div class="title">
            <span style="font-size: 20px">納品書</span>
            <span v-if="titleHidden" style="font-size: 12px">（兼領収書）</span>
            <span v-if="v === 2" style="font-size: 12px">（控）</span>
          </div>
          <div class="header">
            <div class="header-left">
              <div class="customer-code">お客様コードNo {{ val.id }}</div>
              <div class="customer-zip">〒{{ formatPostcode(val.zip) }}</div>
              <div class="customer-address">{{ val.address }}</div>
              <div class="customer-name">{{ val.unick }} 様 [{{ val.ucode }}]</div>
              <div class="customer-connect">
                <div class="tel-left">電話番号</div>
                <div class="tel-right">{{ val.phone }}</div>
              </div>
              <div class="customer-connect">
                <div class="tel-left">請求期間</div>
                <div class="tel-right">{{ monthRange }}</div>
              </div>
              <div class="customer-connect">
                <div class="tel-left">注文番号</div>
                <div class="tel-right">{{ val.oid }}</div>
              </div>
            </div>
            <div class="header-right">
              <div class="reqno">
                <div class="reqno-left">請求書番号</div>
                <div class="reqno-right">{{ val.requestid }}</div>
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
                      <th>小計 (本体)</th>
                      <th>消費税 (請求時)</th>
                      <th>その他</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style="height: 32px; width: 250px">
                        ¥ {{ formatMoneyJp(moneyTotal[val.oid]) }}
                      </td>
                      <td>¥ {{ formatMoneyJp(taxTotal[val.oid]) }}</td>
                      <td>¥ {{ formatMoneyJp(otherFee(val.oid)) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="divright">
                <table>
                  <thead>
                    <tr>
                      <th>ご請求額</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td
                        style="
                          height: 32px;
                          font-size: 16px;
                          font-weight: bold;
                          border: 2px solid #000;
                        "
                      >
                        ¥ {{ formatMoneyJp(grandTotal(val.oid)) }}
                      </td>
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
                  <th class="index" />
                  <th class="date">品番</th>
                  <th class="name">品名</th>
                  <th style="border-left-style: hidden; width: 30px" />
                  <th class="count">数量</th>
                  <th class="count">単位</th>
                  <th>単価</th>
                  <th>金額</th>
                  <th style="width: 120px">備考欄</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="([pkey, pval], index) in productEntries(val)" :key="pkey">
                  <td class="index">{{ index + 1 }}</td>
                  <td class="center">{{ pval.pid }}</td>
                  <td>
                    {{ pval.title }}
                    <span v-if="String(pval.home).includes('3')" class="new-tag">活动</span>
                  </td>
                  <td class="center">{{ pval.tax === 8 ? '※' : '' }}</td>
                  <td class="center">{{ pval.count }}</td>
                  <td class="center">{{ pval.unit }}</td>
                  <td v-if="amountHidden && v === 1" class="end">*******</td>
                  <td v-else class="end">¥ {{ formatMoneyJp(pval.price) }}</td>
                  <td v-if="amountHidden && v === 1" class="end">*******</td>
                  <td v-else class="end">¥ {{ formatMoneyJp(pval.total) }}</td>
                  <td class="end" />
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td style="border-left-width: 0; border-bottom-width: 0; border-top-width: 0" />
                  <td style="text-align: center; font-size: 12px" rowspan="2">備考欄</td>
                  <td colspan="2" rowspan="2">{{ val.memo }}</td>
                  <td colspan="3" style="text-align: right">小計</td>
                  <td colspan="2" style="text-align: right">
                    ¥ {{ formatMoneyJp(moneyTotal[val.oid]) }}
                  </td>
                </tr>
                <tr>
                  <td style="border-left-width: 0; border-bottom-width: 0; border-top-width: 0" />
                  <td colspan="3" style="text-align: right">(消費税)</td>
                  <td colspan="2" style="text-align: right">
                    ¥ {{ formatMoneyJp(taxTotal[val.oid]) }}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div class="foot-total">
            <div>〔小計内訳〕</div>
            <div>
              <table>
                <tbody>
                  <tr v-for="(dval, dkey) in totalList[val.oid]" :key="dkey">
                    <td>
                      {{ String(dkey).split('_')[1] === '0' ? '軽減' : ''
                      }}{{ String(dkey).split('_')[0] }}%対象
                    </td>
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
                  </tr>
                  <tr>
                    <td />
                    <td style="width: 140px">货到付款费:</td>
                    <td style="width: 120px">¥ {{ formatMoneyJp(svf[val.oid]) }}</td>
                    <td style="width: 80px">运费</td>
                    <td style="width: 120px">¥ {{ formatMoneyJp(yf[val.oid]) }}</td>
                  </tr>
                  <tr>
                    <td />
                    <td style="width: 80px">冷藏费:</td>
                    <td style="width: 120px">¥ {{ formatMoneyJp(ld[val.oid]) }}</td>
                    <td style="width: 80px">积分:</td>
                    <td style="width: 120px">- ¥ {{ formatMoneyJp(point[val.oid]) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" src="./styles/deliveryreq-print.scss"></style>

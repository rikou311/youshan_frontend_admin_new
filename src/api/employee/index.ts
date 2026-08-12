import {
  createAddApi,
  createDeleteApi,
  createListApi,
  createQueryApi,
  createUpdateApi,
} from '@/api/helpers/crud'
import request from '@/utils/request'
import type { PageParams } from '@/types/api'

export interface EmployeeItem {
  id: number
  name: string
  empId?: string
  comprefaceSubjectId?: string
  basicGive?: number
  hourlyWage?: number
  rent?: string | number
  transportationExp?: number
  overtime?: string | number
  specialAllowance?: string | number
  socialSecurity?: string | number
  startDate?: string
  createdAt?: string
  type?: number | string
  department?: string
}

export interface EmployeeForm {
  id?: number
  name: string
  empId?: string
  comprefaceSubjectId?: string
  basicGive?: number
  hourlyWage?: number
  rent?: string | number
  transportationExp?: number
  overtime?: string | number
  specialAllowance?: string | number
  socialSecurity?: string | number
  startDate?: string
  createdAt?: string
  type?: number | string
  department?: string
}

export interface EmployeeListParams extends Record<string, unknown> {
  name?: string
  sort?: { prop?: string; order?: string }
  sortProp?: string
  sortOrder?: string
}

export interface AttendanceRecordItem {
  id: number
  name?: string
  employeeName?: string
  empId?: number | string
  empId2?: string
  type?: number | string
  state?: number | string
  createdAt?: string
  checkDate?: string
  rent?: string | number
  basicGive?: number
  hourlyWage?: number
  socialSecurity?: string | number
  startDate?: string
  transportationExp?: number
  overtime?: string | number
  specialAllowance?: string | number
  similarity?: number
}

export interface AttendanceRecordForm {
  id?: number
  empId?: number | string
  type?: number | string
  createdAt?: string | Date
  similarity?: number
  state?: number | string
  name?: string
  employeeName?: string
  checkDate?: string
}

export interface AttendanceRecordListParams extends Record<string, unknown> {
  name?: string
  createTimeArr?: Array<string | Date | number>
  typeList?: Array<string | number>
  state?: string | number
  sort?: { prop?: string; order?: string }
}

export interface AttendanceDownloadParams {
  createTimeArr: Array<Date | string>
  empType: number
  state: number
}

export const getEmployeeList = (params: PageParams & EmployeeListParams) =>
  createListApi<EmployeeItem, EmployeeListParams>('employee')(params)

export const queryEmployee = createQueryApi<EmployeeForm>('employee')
export const addEmployee = createAddApi<EmployeeForm>('employee')
export const updateEmployee = createUpdateApi<EmployeeForm>('employee')
export const deleteEmployee = createDeleteApi('employee')

export const getAttendanceRecordList = (
  params: PageParams & AttendanceRecordListParams,
) =>
  createListApi<AttendanceRecordItem, AttendanceRecordListParams>('attendanceRecord')(params)

export const queryAttendanceRecord = createQueryApi<AttendanceRecordForm>('attendanceRecord')
export const addAttendanceRecord = createAddApi<AttendanceRecordForm>('attendanceRecord')
export const updateAttendanceRecord = createUpdateApi<AttendanceRecordForm>('attendanceRecord')
export const deleteAttendanceRecord = createDeleteApi('attendanceRecord')

export const downloadAttendanceRecord = (data: AttendanceDownloadParams) =>
  request.post<AttendanceRecordItem[]>('/jee-fk/attendanceRecord/download', data)

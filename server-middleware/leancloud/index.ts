import AV from 'leancloud-storage'

// -MdYXbMMI 结尾的就不是 CN region, 不需要提供 serverURL
const LEANCLOUD_APPID = process.env.LEANCLOUD_APPID || '000-MdYXbMMI'
const LEANCLOUD_APPKEY = process.env.LEANCLOUD_APPKEY || '000'
AV.init({ appId: LEANCLOUD_APPID, appKey: LEANCLOUD_APPKEY })

export const LeanCloudStorage = AV

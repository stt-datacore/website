export interface BeamableStoreRoot {
  stores: Store[]
}

export interface Store {
  symbol: string
  listings: Listing[]
  nextDeltaSeconds?: number
}

export interface Listing {
  symbol: string
  offer: Offer
  secondsActive: number
  clientData: ClientData
  clientDataList: ClientDataList[]
  active: boolean
  queryAfterPurchase: boolean
  secondsRemain?: number
  purchasesRemain?: number
  cooldown?: number
}

export interface Offer {
  symbol: string
  titles: string[]
  descriptions: string[]
  images: Image[]
  obtain: Obtain[]
  obtainCurrency: any[]
  obtainItems: any[]
  price: Price
  coupons: number
  buttonText: string
}

export interface Image {
  small: Small
  medium?: Medium
  large?: Large
}

export interface Small {
  file?: string
  atlas_info?: string
}

export interface Medium {
  file: string
  atlas_info?: string
}

export interface Large {
  file: string
  atlas_info?: string
}

export interface Obtain {
  ent: string
  count: string
  spec: string
}

export interface Price {
  type: string
  symbol: string
  amount?: number
}

export interface ClientData {
  content_type?: string
  click_action?: string
  render_component?: string
  daily_activity_applicable: any
  event_owner?: string
  click_target?: string
  value?: string
}

export interface ClientDataList {
  name: string
  value: string
}

export type NFTType = {
  isOwner: boolean
  ownershipVerified: boolean
  tokenName: string
  tokenSymbol: string
  metadata: {
    name: string
    originalUrl: string
    permalink: string
    previewUrl: string
    thumbnailUrl: string
    url: string
    traits: Record<string, any>
  }
}

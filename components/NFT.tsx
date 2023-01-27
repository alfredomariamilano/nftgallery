import styles from '~/styles/Grid.module.css'
import { NFTType } from '~/utils/types.d'

type NFTGridCellProps = {
  NFT: NFTType
}

export const NFTGridCell = (props: NFTGridCellProps) => {
  const { NFT } = props

  return (
    <a
      key={NFT?.metadata?.name}
      href={NFT?.metadata?.permalink}
      target="_blank"
      className={styles.gridCell}
      rel="noreferrer"
    >
      <div
        className={styles.gridCellInner}
        style={{
          backgroundImage: `url(${NFT?.metadata?.originalUrl})`,
        }}
      >
        <div className={styles.gridCellContent}>
          <h1>{NFT?.metadata?.name}</h1>
          <h2>
            {NFT?.tokenSymbol ? `(${NFT?.tokenSymbol}) ` : ''}
            {NFT?.tokenName}
          </h2>
          <h3>
            (
            {NFT.isOwner
              ? 'Owned'
              : NFT.ownershipVerified
              ? 'Previously owned'
              : 'Ownership unverified'}
            )
          </h3>
        </div>
      </div>
    </a>
  )
}

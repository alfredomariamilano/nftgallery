import Head from 'next/head'
import styles from '~/styles/Home.module.css'
import gridStyles from '~/styles/Grid.module.css'
import { ethers } from 'ethers'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ETHERSCAN_API_KEY } from '~/utils/constants'
import { LoadingSpinner } from '~/components/LoadingSpinner'
import { NFTType } from '~/utils/types.d'
import { NFTGridCell } from '~/components/NFT'

export default function Home() {
  const [NFTs, setNFTs] = useState<NFTType[]>([])
  const [loading, setLoading] = useState(false)
  const [metaMaskAvailable, setMetaMaskAvailable] = useState(false)
  const [walletConnected, setWalletConnected] = useState<null | string>(null)
  const [chain, setChain] = useState('homestead')

  const provider = useMemo(() => {
    const source: any = typeof window !== 'undefined' ? window : undefined

    if (source) {
      return new ethers.providers.Web3Provider(source.ethereum)
    }

    return null as unknown as ethers.providers.Web3Provider
  }, [])

  const etherscanProvider = useMemo(() => {
    return new ethers.providers.EtherscanProvider(chain, ETHERSCAN_API_KEY)
  }, [chain])

  const etherscanERC721RequestURL = useMemo(() => {
    return `${etherscanProvider.baseUrl}/api?module=account&action=tokennfttx&address=${walletConnected}&startblock=0&endblock=999999999&sort=asc&apikey=${ETHERSCAN_API_KEY}`
  }, [etherscanProvider.baseUrl, walletConnected])

  const etherscanERC1155RequestURL = useMemo(() => {
    return `${etherscanProvider.baseUrl}/api?module=account&action=token1155tx&address=${walletConnected}&startblock=0&endblock=999999999&sort=asc&apikey=${ETHERSCAN_API_KEY}`
  }, [etherscanProvider.baseUrl, walletConnected])

  const getEtherscanContractAbiURL = useCallback(
    (contractAddress: string) => {
      return `${etherscanProvider.baseUrl}/api?module=contract&action=getabi&address=${contractAddress}&apikey=${ETHERSCAN_API_KEY}`
    },
    [etherscanProvider]
  )

  // The MetaMask plugin also allows signing transactions to
  // send ether and pay to change state within the blockchain.
  // For this, you need the account signer...
  const signer = useMemo(() => provider && provider.getSigner(), [provider])

  useEffect(() => {
    setMetaMaskAvailable(!!(window as any)?.ethereum)

    const getAddress = async () => {
      let address: typeof walletConnected = null

      try {
        address = await signer.getAddress()
      } catch (error) {
        console.warn(error)
      }

      setWalletConnected(() => address)
    }

    const getChain = async () => {
      if (provider?.network?.name) {
        const newChain = await provider.detectNetwork()

        setChain(() => newChain.name)
      }
    }

    const metaMask = provider?.provider as any

    if (provider) {
      getAddress()
      metaMask.on('accountsChanged', getAddress)

      getChain()
      metaMask.on('chainChanged', getChain)
    }

    return () => {
      metaMask.removeListener('accountsChanged', getAddress)
      metaMask.removeListener('chainChanged', getChain)
    }
  }, [provider, signer])

  const onClick = useCallback(async () => {
    if (walletConnected) {
      setWalletConnected(() => null)
    } else {
      let account: typeof walletConnected = null

      try {
        // MetaMask requires requesting permission to connect users accounts
        const [_account] = await provider.send('eth_requestAccounts', [])
        account = _account
      } catch (error) {
        console.warn(error)
      }

      setWalletConnected(account)
    }
  }, [provider, walletConnected])

  useEffect(() => {
    const onWalletConnected = async () => {
      setLoading(() => true)

      const existingUser = await fetch(`/api/user/${walletConnected}`).then(
        (res) => res.json()
      )

      if (existingUser?.nfts) {
        setNFTs(() => existingUser?.nfts)
      }

      const sleep = (ms: number) => {
        return new Promise((resolve) => {
          setTimeout(resolve, ms)
        })
      }

      const getContractABI = (contractAddress: string) => {
        return new Promise((resolve, reject) => {
          fetch(getEtherscanContractAbiURL(contractAddress))
            .then((res) => res.json())
            .then((res) => {
              if (res.status !== '1' || res.message !== 'OK') {
                reject(res.result)
              } else {
                resolve(JSON.parse(res.result))
              }
            })
            .catch((err) => reject(err))
        })
      }

      const validateNFTOwner = (
        contractAddress: string,
        abi: any,
        tokenID: string
      ) => {
        return new Promise<boolean>(async (resolve, reject) => {
          try {
            const contract = new ethers.Contract(contractAddress, abi, provider)

            const ownerWallet = await contract.ownerOf(tokenID)

            resolve(
              ownerWallet?.toLowerCase() === walletConnected?.toLowerCase()
            )
          } catch (e) {
            reject(e)
          }
        })
      }

      const getNFTMetadata = (contractAddress: string, tokenID: string) => {
        return new Promise<NFTType['metadata']>((resolve, reject) => {
          fetch(
            `https://${
              chain !== 'homestead' ? 'testnets-' : ''
            }api.opensea.io/api/v1/asset/${contractAddress}/${tokenID}`
          )
            .then((res) => res.json())
            .then((asset) => {
              resolve({
                ...asset,
                url: asset.image_url,
                previewUrl: asset.image_preview_url,
                thumbnailUrl: asset.image_thumbnail_url,
                originalUrl: asset.image_original_url,
                name: asset.name,
                permalink: asset.permalink,
                traits: asset.traits,
              })
            })
            .catch((err) => reject(err))
        })
      }

      const nftTransactionsResults = await Promise.all([
        fetch(etherscanERC721RequestURL).then((res) => res.json()),
        fetch(etherscanERC1155RequestURL).then((res) => res.json()),
      ])

      const nftTransactions = nftTransactionsResults.reduce((acc, response) => {
        if (Array.isArray(response?.result)) {
          acc.push(...response?.result)
        }

        return acc
      }, [] as any[])

      const _NFTs: typeof NFTs = []

      for (let i = 0; i < nftTransactions.length; i++) {
        const transaction = nftTransactions[i]
        const { contractAddress, tokenID } = transaction

        try {
          const abi = await getContractABI(contractAddress)

          let isOwner = false
          let ownershipVerified = false

          await validateNFTOwner(contractAddress, abi, tokenID)
            .then((_isOwner) => {
              isOwner = _isOwner
              ownershipVerified = true
            })
            .catch(console.warn)

          const metadata = await getNFTMetadata(contractAddress, tokenID)

          _NFTs.push({
            ...transaction,
            isOwner,
            ownershipVerified,
            metadata,
          })

          setNFTs((currentNFTs) => {
            if (currentNFTs?.length <= 0) {
              return _NFTs
            } else {
              return currentNFTs
            }
          })
        } catch (error) {
          console.warn(error)
          continue
        } finally {
          await sleep(250)
        }
      }

      setLoading(() => false)
      setNFTs(() => _NFTs)

      fetch('/api/user', {
        method: 'post',
        body: JSON.stringify({
          wallet: walletConnected,
          nfts: _NFTs,
        }),
      })
    }

    if (walletConnected) {
      onWalletConnected()
    } else {
      setNFTs([])
    }
  }, [
    chain,
    etherscanERC1155RequestURL,
    etherscanERC721RequestURL,
    getEtherscanContractAbiURL,
    provider,
    walletConnected,
  ])

  return (
    <>
      <Head>
        <title>Create Next App</title>
        <meta name="description" content="Generated by create next app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={styles.main}>
        <div className={styles.center}>
          <button
            className={styles.button}
            disabled={!metaMaskAvailable}
            onClick={onClick}
          >
            {walletConnected ? 'Disconnect' : 'Connect MetaMask'}
          </button>
          {/* <input
            type="text"
            onChange={(e) => {
              setWalletConnected(e.target.value || null)
            }}
          /> */}

          {(NFTs?.length > 0 || loading) && (
            <div className={gridStyles.grid}>
              {NFTs.map((NFT) => {
                return <NFTGridCell key={NFT?.metadata?.name} NFT={NFT} />
              })}

              {loading && (
                <div className={gridStyles.gridCell}>
                  <LoadingSpinner />
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  )
}

// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { databaseConnection, UserModel } from '~/utils/database'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { wallet, nfts } = JSON.parse(req.body)

    await databaseConnection

    const user = await UserModel.findOneAndUpdate(
      {
        wallet,
      },
      {
        wallet,
        nfts,
      },
      {
        new: true,
        upsert: true,
      }
    )

    res.status(201).json(user)
  } catch (error) {
    console.error(error)
    res.status(401).json({ error })
  }
}

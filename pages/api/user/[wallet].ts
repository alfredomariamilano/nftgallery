// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { databaseConnection, UserModel } from '~/utils/database'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method?.toLowerCase() === 'get') {
      const { wallet } = req.query

      await databaseConnection

      const user = await UserModel.findOne({
        wallet,
      })

      res.status(200).json(user)
    } else {
      throw new Error('Not a GET request')
    }
  } catch (error) {
    console.error(error)
    res.status(401).json({ error })
  }
}

import mongoose from 'mongoose'
import { MONGO_URL } from '~/utils/constants'

export const databaseConnection = mongoose.connect(MONGO_URL)

export const UserSchema = new mongoose.Schema({
  wallet: { type: String, required: true },
  nfts: { type: mongoose.Schema.Types.Array, required: true },
})

export const UserModel =
  mongoose.models.User || mongoose.model('User', UserSchema)

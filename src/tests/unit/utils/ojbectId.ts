import mongoose from 'mongoose';

export function getObjectIds(total: number): mongoose.Types.ObjectId[];
export function getObjectIds(total?: null): mongoose.Types.ObjectId;
export function getObjectIds(total?: number | null): mongoose.Types.ObjectId | mongoose.Types.ObjectId[] {
  const count = total ?? 1;
  const ids = Array.from({ length: count }, () => new mongoose.Types.ObjectId());
  return total ? ids : ids[0];
}

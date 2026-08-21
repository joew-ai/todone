import type { HouseholdRepository } from './model';
import { DynamoHouseholdRepository } from './repository';

let repository: HouseholdRepository | null = null;

export function getHouseholdRepository(): HouseholdRepository {
  if (repository) return repository;
  const tableName = process.env.TODONE_TABLE_NAME;
  if (!tableName) throw new Error('TODONE_TABLE_NAME is not configured.');
  repository = new DynamoHouseholdRepository(tableName);
  return repository;
}

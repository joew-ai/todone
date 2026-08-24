import {
  InMemoryHouseholdRepository,
  resolveMembershipRecords,
} from '../../../lambdas/households/repository';
import { MembershipResolutionKind } from '../../../lambdas/households/constants';
import type {
  Household,
  Membership,
  MembershipLookup,
  MembershipResolution,
} from '../../../lambdas/households/model';

/** Test fixture for handler tests that need persisted Membership states local bootstrap cannot create. */
export class MembershipRecordRepository extends InMemoryHouseholdRepository {
  constructor(
    private readonly fixtureSub: string,
    private readonly records: {
      lookup: MembershipLookup;
      household: Household;
      membership: Membership;
    },
  ) {
    super();
  }

  override async resolveMembership(
    sub: string,
    tokenIssuedAt?: number,
  ): Promise<MembershipResolution> {
    if (sub !== this.fixtureSub) return { kind: MembershipResolutionKind.unattached };
    return resolveMembershipRecords(
      this.records.lookup,
      this.records.membership,
      this.records.household,
      sub,
      tokenIssuedAt,
    );
  }
}

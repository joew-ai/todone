import rawEnglishCatalog from './en.yml?raw';
import { parse } from 'yaml';

export interface BootstrapMessages {
  checkEmail: string;
  emailVerified: string;
  codeResent: string;
  recoverySent: string;
  passwordReset: string;
  nameRequired: string;
  timezoneRequired: string;
  sessionEnded: string;
  created: string;
  signedOut: string;
  restoreHeading: string;
  restoring: string;
  signIn: string;
  signingIn: string;
  createFirstParent: string;
  forgotPassword: string;
  createParent: string;
  username: string;
  recoveryEmail: string;
  password: string;
  entryCode: string;
  entryCodeHelp: string;
  entryCodeInvalid: string;
  usernamePolicyError: string;
  passwordPolicy: string;
  passwordPolicyError: string;
  creatingAccount: string;
  createAccount: string;
  backToSignIn: string;
  verifyEmail: string;
  verificationHelp: string;
  verificationCode: string;
  verifyEmailAction: string;
  resendCode: string;
  resetPassword: string;
  sendRecoveryCode: string;
  choosePassword: string;
  recoveryCode: string;
  newPassword: string;
  resetPasswordAction: string;
  createHousehold: string;
  householdHelp: string;
  householdName: string;
  householdTimezone: string;
  selectTimezone: string;
  creatingHousehold: string;
  createHouseholdAction: string;
  signOut: string;
  ready: string;
  onboardingHelp: string;
  addFamilyMembers: string;
  membersComingSoon: string;
}

interface EnglishMessages {
  generic: { unexpectedError: string; networkError: string };
  bootstrap: BootstrapMessages;
  householdClient: { sessionEnded: string; requestFailed: string };
  profileApi: {
    unsupportedFields: string;
    invalidDisplayName: string;
    invalidColor: string;
    invalidVersion: string;
    conflict: string;
  };
}

export const messages = parse(rawEnglishCatalog) as EnglishMessages;

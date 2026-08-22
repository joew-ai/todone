import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

interface LambdaMessages {
  profileApi: {
    unsupportedFields: string;
    invalidDisplayName: string;
    invalidColor: string;
    invalidVersion: string;
    conflict: string;
  };
}

// Local Lambda development runs from the repository root; deployed Lambda
// artifacts package the same source catalog at their working-directory root.
const catalogPath = join(process.cwd(), 'src', 'i18n', 'en.yml');
const deployedCatalogPath = join(process.cwd(), 'en.yml');

function readCatalog(): LambdaMessages {
  try {
    return parse(readFileSync(catalogPath, 'utf8')) as LambdaMessages;
  } catch {
    return parse(readFileSync(deployedCatalogPath, 'utf8')) as LambdaMessages;
  }
}

export const messages = readCatalog();

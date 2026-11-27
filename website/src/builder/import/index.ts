// Entry point for "Upload resume". Loaded on demand, so pdf.js and mammoth
// only download when someone actually uploads a file.
import { extractFile } from './extract';
import { parseResume, type ParseResult } from './parse';

export type { ParseResult };

export async function importResume(file: File): Promise<ParseResult> {
  return parseResume(await extractFile(file));
}

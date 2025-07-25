import { parsePhoneNumberWithError } from 'libphonenumber-js';

export const normalizePhoneNumber = (
  rawNumber: string,
  defaultCountry = 'US',
) => {
  try {
    const phone = parsePhoneNumberWithError(rawNumber, defaultCountry as 'US');
    if (phone && phone.isValid()) return phone.number;
  } catch {}
  return rawNumber;
};

export const contactToName = (contact?: {
  firstName: string;
  lastName: string;
  organization: string;
}) => {
  if (!contact) return '';

  const { firstName, lastName, organization } = contact;
  let result = `${firstName} ${lastName || ''}`;
  if (organization) result += ` (${organization})`;
  return result.trim();
};

export const textFromBinary = (arrayBuffer: number[]) => {
  const textDecoder = new TextDecoder('utf-8');
  const bytes = new Uint8Array(arrayBuffer);
  const asText = textDecoder.decode(bytes);
  const markerIndex = asText.indexOf('NSString');
  if (markerIndex === -1) return '';
  const slice = asText.slice(markerIndex + 8);
  const possibleText = slice.match(/([ -~\n\r\t]+)/);
  return possibleText ? possibleText[0].trim().slice(2) : '';
};

const PDF_SIGNATURE = Buffer.from('%PDF-');

export const hasPdfMagicBytes = (bytes: Buffer) => {
  if (bytes.length < PDF_SIGNATURE.length) {
    return false;
  }
  return bytes.subarray(0, PDF_SIGNATURE.length).equals(PDF_SIGNATURE);
};

export const isPdfMime = (mime: string | null | undefined) => {
  if (!mime) {
    return false;
  }
  return mime.toLowerCase() === 'application/pdf';
};

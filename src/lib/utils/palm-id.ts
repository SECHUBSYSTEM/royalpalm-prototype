/**
 * Validates palm ID format: RP-[BLOCK]-[SEQUENCE]
 * Example: RP-A1-00001
 */
export const validatePalmID = (palmId: string): boolean => {
  if (!palmId || typeof palmId !== "string") {
    return false;
  }
  // Trim whitespace before validation
  const trimmed = palmId.trim();
  const pattern = /^RP-[A-Z0-9]+-\d+$/;
  return pattern.test(trimmed);
};

/**
 * Parses palm ID into components
 */
export const parsePalmID = (
  palmId: string
): { plantation: string; block: string; sequence: string } | null => {
  if (!validatePalmID(palmId)) {
    return null;
  }

  const parts = palmId.split("-");
  if (parts.length !== 3) {
    return null;
  }

  return {
    plantation: parts[0], // RP
    block: parts[1], // A1
    sequence: parts[2], // 00001
  };
};

/**
 * Generates palm ID from components
 */
export const generatePalmID = (block: string, sequence: number): string => {
  const sequenceStr = sequence.toString().padStart(5, "0");
  return `RP-${block}-${sequenceStr}`;
};

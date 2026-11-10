export const getFullName = (firstName: string, lastName: string) => {
  let name = "";

  if (firstName) name = firstName;
  if (lastName) name = name + " " + lastName;

  return name.trim();
};

export class ColumnNumericTransformer {
  to(data: number): number {
    return data;
  }
  from(data: string): number {
    const toNumber = parseFloat(data);
    if (isNaN(toNumber)) return null;
    return toNumber;
  }
}

// Money is rounded to 2 decimals at every step so totals are reproducible
export const twoDecimalFloat = (value: number) => {
  if (!value) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
};

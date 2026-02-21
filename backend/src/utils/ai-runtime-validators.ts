export const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0

export const isBoolean = (value: unknown): value is boolean =>
  typeof value === "boolean"

export const isNumber = (value: unknown): value is number =>
  typeof value === "number" && !Number.isNaN(value)

export const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value.filter(v => typeof v === "string") as string[]
}


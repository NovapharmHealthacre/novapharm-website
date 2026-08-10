const jsonEscape = Object.freeze({
  "<": "\\u003c",
  ">": "\\u003e",
  "&": "\\u0026",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029",
});

export function safeJsonStringify(value) {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) return "";
  return serialized.replace(/[<>&\u2028\u2029]/gu, (character) => jsonEscape[character]);
}

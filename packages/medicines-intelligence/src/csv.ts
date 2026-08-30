export interface CsvParseOptions {
  readonly maximumColumns?: number;
  readonly maximumFieldLength?: number;
}

export async function* parseCsvRows(
  chunks: AsyncIterable<Uint8Array | string>,
  options: CsvParseOptions = {},
): AsyncGenerator<readonly string[]> {
  const maximumColumns = options.maximumColumns ?? 256;
  const maximumFieldLength = options.maximumFieldLength ?? 64_000;
  if (!Number.isInteger(maximumColumns) || maximumColumns < 1 || maximumColumns > 4_096) throw new Error("CSV maximum column count is outside the approved bounds.");
  if (!Number.isInteger(maximumFieldLength) || maximumFieldLength < 1 || maximumFieldLength > 1_000_000) throw new Error("CSV maximum field length is outside the approved bounds.");

  const decoder = new TextDecoder("utf-8", { fatal: true });
  let row: string[] = [];
  let field = "";
  let fieldStarted = false;
  let inQuotes = false;
  let afterQuote = false;
  let previousWasCarriageReturn = false;
  let firstCharacter = true;

  const finishField = (): void => {
    row.push(field);
    if (row.length > maximumColumns) throw new Error("CSV row exceeds the approved column count.");
    field = "";
    fieldStarted = false;
  };

  const append = (value: string): void => {
    field += value;
    fieldStarted = true;
    if (field.length > maximumFieldLength) throw new Error("CSV field exceeds the approved length.");
  };

  const process = function* (text: string): Generator<readonly string[]> {
    for (const character of text) {
      if (firstCharacter) {
        firstCharacter = false;
        if (character === "\uFEFF") continue;
      }

      if (inQuotes) {
        if (afterQuote) {
          if (character === '"') {
            append('"');
            afterQuote = false;
            continue;
          }
          inQuotes = false;
          afterQuote = false;
          if (character === " " || character === "\t") continue;
          if (character !== "," && character !== "\r" && character !== "\n") throw new Error("CSV contains text after a closing quote.");
        } else if (character === '"') {
          afterQuote = true;
          continue;
        } else {
          append(character);
          continue;
        }
      }

      if (character === ",") {
        finishField();
        previousWasCarriageReturn = false;
      } else if (character === "\r") {
        finishField();
        const complete = Object.freeze(row);
        row = [];
        previousWasCarriageReturn = true;
        yield complete;
      } else if (character === "\n") {
        if (previousWasCarriageReturn) {
          previousWasCarriageReturn = false;
          continue;
        }
        finishField();
        const complete = Object.freeze(row);
        row = [];
        yield complete;
      } else if (character === '"') {
        if (fieldStarted || field.length) throw new Error("CSV quote appears inside an unquoted field.");
        fieldStarted = true;
        inQuotes = true;
        previousWasCarriageReturn = false;
      } else {
        append(character);
        previousWasCarriageReturn = false;
      }
    }
  };

  for await (const chunk of chunks) {
    const text = typeof chunk === "string" ? chunk : decoder.decode(chunk, { stream: true });
    yield* process(text);
  }
  yield* process(decoder.decode());

  if (inQuotes && !afterQuote) throw new Error("CSV ended inside a quoted field.");
  if (fieldStarted || field.length || row.length) {
    finishField();
    yield Object.freeze(row);
  }
}

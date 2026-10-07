export async function* readCsvObjects(
  body: ReadableStream<Uint8Array>,
  delimiter = ",",
): AsyncGenerator<Record<string, string>> {
  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8");
  let headers: string[] | null = null;
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let pendingQuote = false;

  const emit = () => {
    row.push(field);
    field = "";
    if (!headers) {
      headers = row.map((value) => value.replace(/^\uFEFF/, "").trim());
      row = [];
      return null;
    }

    const object: Record<string, string> = {};
    headers.forEach((header, index) => {
      object[header] = row[index] ?? "";
    });
    row = [];
    return object;
  };

  while (true) {
    const { value, done } = await reader.read();
    const chunk = decoder.decode(value ?? new Uint8Array(), { stream: !done });

    for (let index = 0; index < chunk.length; index += 1) {
      const char = chunk[index];

      if (pendingQuote) {
        pendingQuote = false;
        if (char === '"') {
          field += '"';
          continue;
        }
        quoted = false;
      }

      if (quoted) {
        if (char === '"') {
          pendingQuote = true;
        } else {
          field += char;
        }
        continue;
      }

      if (char === '"') {
        quoted = true;
      } else if (char === delimiter) {
        row.push(field);
        field = "";
      } else if (char === "\n") {
        const object = emit();
        if (object) yield object;
      } else if (char !== "\r") {
        field += char;
      }
    }

    if (done) break;
  }

  if (pendingQuote) quoted = false;
  if (field.length || row.length) {
    const object = emit();
    if (object) yield object;
  }
}

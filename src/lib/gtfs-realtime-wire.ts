type MessageKind = "feed" | "entity" | "alert";

type Varint = {
  value: number;
  nextOffset: number;
};

function readVarint(bytes: Uint8Array, offset: number): Varint {
  let value = 0;
  let shift = 0;
  let cursor = offset;

  while (cursor < bytes.length && shift <= 53) {
    const byte = bytes[cursor++];
    value += (byte & 0x7f) * 2 ** shift;
    if ((byte & 0x80) === 0) {
      return { value, nextOffset: cursor };
    }
    shift += 7;
  }

  throw new RangeError("Invalid GTFS-Realtime protobuf varint.");
}

function fieldEnd(
  bytes: Uint8Array,
  payloadOffset: number,
  wireType: number,
): number {
  switch (wireType) {
    case 0:
      return readVarint(bytes, payloadOffset).nextOffset;
    case 1:
      return payloadOffset + 8;
    case 2: {
      const length = readVarint(bytes, payloadOffset);
      return length.nextOffset + length.value;
    }
    case 5:
      return payloadOffset + 4;
    default:
      throw new RangeError(
        `Unsupported GTFS-Realtime protobuf wire type ${wireType}.`,
      );
  }
}

function encodeVarint(value: number): Uint8Array {
  const bytes: number[] = [];
  let remaining = value;
  do {
    const byte = remaining % 128;
    remaining = Math.floor(remaining / 128);
    bytes.push(byte + (remaining ? 128 : 0));
  } while (remaining > 0);
  return Uint8Array.from(bytes);
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const result = new Uint8Array(
    chunks.reduce((length, chunk) => length + chunk.length, 0),
  );
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

function encodeLengthDelimited(
  tag: number,
  payload: Uint8Array,
): Uint8Array {
  return concatBytes([encodeVarint(tag), encodeVarint(payload.length), payload]);
}

function sanitizeMessage(
  bytes: Uint8Array,
  kind: MessageKind,
): Uint8Array {
  const chunks: Uint8Array[] = [];
  let cursor = 0;
  let changed = false;

  while (cursor < bytes.length) {
    const fieldStart = cursor;
    const tag = readVarint(bytes, cursor);
    cursor = tag.nextOffset;
    const fieldNumber = Math.floor(tag.value / 8);
    const wireType = tag.value % 8;
    const payloadOffset = cursor;
    const end = fieldEnd(bytes, payloadOffset, wireType);
    if (end > bytes.length) {
      throw new RangeError("GTFS-Realtime protobuf field exceeds its payload.");
    }

    if (
      kind === "alert" &&
      (fieldNumber === 12 || fieldNumber === 13) &&
      wireType !== 2
    ) {
      // WMATA currently sends malformed scalar values for tts_header_text and
      // tts_description_text. Those fields are not used by this display.
      changed = true;
      cursor = end;
      continue;
    }

    if (wireType === 2) {
      const length = readVarint(bytes, payloadOffset);
      const payload = bytes.subarray(length.nextOffset, end);
      const nestedKind =
        kind === "feed" && fieldNumber === 2
          ? "entity"
          : kind === "entity" && fieldNumber === 5
            ? "alert"
            : null;
      if (nestedKind) {
        const sanitizedPayload = sanitizeMessage(payload, nestedKind);
        if (sanitizedPayload.length !== payload.length) {
          chunks.push(encodeLengthDelimited(tag.value, sanitizedPayload));
          changed = true;
        } else {
          chunks.push(bytes.subarray(fieldStart, end));
        }
        cursor = end;
        continue;
      }
    }

    chunks.push(bytes.subarray(fieldStart, end));
    cursor = end;
  }

  return changed ? concatBytes(chunks) : bytes;
}

/** Remove only the malformed TTS fields WMATA emits in Alert messages. */
export function sanitizeWmataAlertFeed(bytes: Uint8Array): Uint8Array {
  return sanitizeMessage(bytes, "feed");
}


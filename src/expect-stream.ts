import { Readable } from "stream";

const checkWaitEvent = 'checkWait';

export type ExpectStream = ReturnType<typeof expectStream>;

export interface WaitMatch {
  index: number;
  match: string;
}

/**
 * Get a stream into a string.
 * Wait for the stream to end, or wait till some pattern appears in the stream.
 */
export function expectStream(stream: Readable) {
  let resolve: (value: string) => void;
  const promise = new Promise<string>((res) => {
    resolve = res;
  });
  const buffers: Buffer[] = [];
  let asBuffer: Buffer = Buffer.concat([]);
  let asString: string = '';
  /**
   * Next `wait` call will search from this point in the string onward
   * Every time a `wait` finds something, this is updated to be immediately
   * after the matched pattern.
   */
  let waitStart = 0;

  stream.on('data', (data) => {
    buffers.push(data);
    asBuffer = Buffer.concat(buffers);
    asString = asBuffer.toString('utf8');
    stream.emit(checkWaitEvent);
  });
  stream.on('end', () => {
    resolve(asString);
  });

  return Object.assign(promise, {
    string,
    buffer,
    wait,
    stream,
  });

  /**
   * Get everything received so far as a string.
   */
  function string() {
    return asString;
  }
  
  /**
   * Get everything received so far as a Buffer.
   */
  function buffer() {
    return asBuffer;
  }

  /**
   * Wait for a pattern to appear in the stream, resolving with the matched text.
   * Begins searching from immediately after a previously-successful `wait`, so
   * you can sequence multiple `wait` calls.
   * 
   * @param required if true and stream ends or timeout is reached before encountering the pattern, will reject.
   * Default is to resolve with `undefined`
   */
  function wait(pattern: string | RegExp, required = false, timeout?: number) {
    return new Promise<WaitMatch | undefined>((resolve, reject) => {
      const start = waitStart;
      stream.on(checkWaitEvent, checkWaitFor);
      stream.on('end', endOrTimeout);
      if(timeout != null) {
        setTimeout(endOrTimeout, timeout);
      }
      // Pattern may already be in the buffer
      checkWaitFor();

      function checkWaitFor() {
        if (typeof pattern === 'string') {
          const index = asString.indexOf(pattern, start);
          if (index >= 0) {
            waitStart = index + pattern.length;
            const match = asString.slice(index, waitStart);
            resolve({
              index,
              match,
            });
          }
        } else if (pattern instanceof RegExp) {
          const reMatch = asString.slice(start).match(pattern);
          if (reMatch != null) {
            const index = start + reMatch.index!;
            waitStart = index + reMatch[0].length;
            resolve({
              index,
              match: reMatch[0]
            });
          }
        }
      }

      function endOrTimeout() {
        required ? reject() : resolve(undefined);
      }
    });
  }
}
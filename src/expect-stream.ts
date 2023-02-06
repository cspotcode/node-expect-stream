import { Readable } from "stream";

const checkWaitEvent = 'checkWait';

export type ExpectStream = ReturnType<typeof expectStream>;

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
  let buffer: Buffer = Buffer.concat([]);
  let string: string = '';
  /**
   * Next `wait` call will search from this point in the string onward
   * Every time a `wait` finds something, this is updated to be immediately
   * after the matched pattern.
   */
  let waitStart = 0;

  stream.on('data', (data) => {
    buffers.push(data);
    buffer = Buffer.concat(buffers);
    string = buffer.toString('utf8');
    stream.emit(checkWaitEvent);
  });
  stream.on('end', () => {
    resolve(string);
  });

  return Object.assign(promise, {
    get,
    wait,
    stream,
  });

  /**
   * Get everything received so far as a string.
   */
  function get() {
    return string;
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
    return new Promise<string | undefined>((resolve, reject) => {
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
          const index = string.indexOf(pattern, start);
          if (index >= 0) {
            waitStart = index + pattern.length;
            resolve(string.slice(index, waitStart));
          }
        } else if (pattern instanceof RegExp) {
          const match = string.slice(start).match(pattern);
          if (match != null) {
            waitStart = start + match.index!;
            resolve(match[0]);
          }
        }
      }

      function endOrTimeout() {
        required ? reject() : resolve(undefined);
      }
    });
  }
}
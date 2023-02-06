A simple utility to wait for text to appear in a stream and get the whole stream as a string.

Meant for writing efficient automated tests that spawn external processes or deal with interactive streams.

- Wait for stream to end
- Wait for a string to appear in the stream
  - searching from where the most recent wait left off
- synchronously get everything received thus far as a string

> Note: initially, this utility is not published to npm.  You can install it directly from git:
> 
>     npm i -D https://github.com/cspotcode/node-expect-stream
>
> If necessary, we can publish to npm in the future.

## Basic usage

```typescript
// Assuming we spawned some interactive CLI
const stream = expectStream(child.stdout);
await stream.wait('Expected prompt (y/n):', true);
// Synchronously inspect everything received so far.
expect(stream.get()).toMatch(/CLITool output/);
child.stdin.write('y');
// Wait for stream to close
const output = await stream;
expect(output).toMatch(/CLI operation complete/);
```

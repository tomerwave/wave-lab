export function writeLine(message: string) {
  console.log(message);
}

export function printResult(value: unknown) {
  writeLine(JSON.stringify(value, null, 2));
}

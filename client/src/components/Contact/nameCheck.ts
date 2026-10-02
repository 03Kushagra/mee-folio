const PLACEHOLDERS = new Set([
  "a", "abc", "abcd", "admin", "anon", "anonymous", "asd", "asdf", "bar", "blah", "example",
  "foo", "foo bar", "hello", "hi", "jane doe", "john doe", "lorem ipsum", "me", "my name",
  "n/a", "na", "name", "nobody", "none", "null", "qwerty", "sample", "someone", "test",
  "test test", "tester", "testing", "undefined", "user", "xxx", "xyz", "your name",
]);

const KEYBOARD_RUNS = ["asdf", "sdfg", "dfgh", "fghj", "ghjk", "hjkl", "qwer", "wert", "erty", "zxcv", "xcvb"];

/**
 * A light heuristic for names that are probably placeholders or keyboard mashing.
 * It only triggers a gentle "is this right?" note, never blocks anyone outright.
 */
export function looksLikePlaceholderName(raw: string) {
  const name = raw.trim().toLowerCase().replace(/\s+/g, " ");

  if (name.length < 2) return true;
  if (PLACEHOLDERS.has(name)) return true;
  if (/\d/.test(name)) return true;
  if (!/\p{L}/u.test(name)) return true;
  if (/(.)\1{2,}/.test(name.replace(/\s/g, ""))) return true;
  if (KEYBOARD_RUNS.some((run) => name.replace(/\s/g, "").includes(run))) return true;

  // A long word with no vowels at all is almost always mashing ("sdfghk").
  return name
    .split(" ")
    .some((word) => /^[a-z]{5,}$/.test(word) && !/[aeiouy]/.test(word));
}

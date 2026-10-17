// 開発サーバー用の JSX 変換先（jsx-runtime.ts と同じく日本語の文節改行を足す）
import { Fragment, jsxDEV as reactJsxDEV } from "react/jsx-dev-runtime";
import { withPhrases } from "./phrase";

export { Fragment };
export function jsxDEV(...args: Parameters<typeof reactJsxDEV>) {
  const [type, props, ...rest] = args;
  return reactJsxDEV(type, withPhrases(type, props), ...rest);
}

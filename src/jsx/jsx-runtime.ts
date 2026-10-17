// JSX の変換先（vite.config.ts の react({ jsxImportSource })）。React の jsx をそのまま使い、日本語の文節改行だけ足す（phrase.ts）
import { Fragment, jsx as reactJsx, jsxs as reactJsxs } from "react/jsx-runtime";
import { withPhrases } from "./phrase";

export { Fragment };
export function jsx(type: Parameters<typeof reactJsx>[0], props: Parameters<typeof reactJsx>[1], key?: Parameters<typeof reactJsx>[2]) {
  return reactJsx(type, withPhrases(type, props), key);
}
export function jsxs(type: Parameters<typeof reactJsxs>[0], props: Parameters<typeof reactJsxs>[1], key?: Parameters<typeof reactJsxs>[2]) {
  return reactJsxs(type, withPhrases(type, props), key);
}

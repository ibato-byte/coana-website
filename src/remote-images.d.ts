// ビルド時に生成される外部画像の対応表（元のURL → 自社ドメインのパス）。vite.config.ts の coanaRemoteImages を参照
declare module "virtual:remote-images" {
  const map: Record<string, string>;
  export default map;
}

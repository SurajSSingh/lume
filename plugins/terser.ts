import { minify } from "../deps/terser.ts";
import { merge } from "../core/utils.ts";
import { Exception } from "../core/errors.ts";
import { Page } from "../core/filesystem.ts";
import { prepareAsset, saveAsset } from "./source_maps.ts";

import type { DeepPartial, Helper, Site } from "../core.ts";
import type { TerserOptions } from "../deps/terser.ts";

export interface Options {
  /** The list of extensions this plugin applies to */
  extensions: string[];

  /** Options passed to `terser` */
  options: TerserOptions;
}

// Default options
export const defaults: Options = {
  extensions: [".js"],
  options: {
    module: true,
    compress: true,
    mangle: true,
  },
};

/** A plugin to load all JavaScript files and minify them using Terser */
export default function (userOptions?: DeepPartial<Options>) {
  const options = merge(defaults, userOptions);

  return (site: Site) => {
    site.loadAssets(options.extensions);
    site.process(options.extensions, terser);
    site.filter("terser", filter as Helper, true);

    async function terser(page: Page) {
      const { content, filename, sourceMap } = prepareAsset(site, page);

      const terserOptions = {
        ...options.options,
        sourceMap: {
          content: JSON.stringify(sourceMap),
          filename: filename,
        },
      };

      try {
        const output = await minify({ [filename]: content }, terserOptions);
        saveAsset(site, page, output.code, output.map);
      } catch (cause) {
        throw new Exception(
          "Error processing the file",
          { name: "Plugin Terser", cause, page, content },
        );
      }
    }

    async function filter(code: string) {
      const output = await minify(code, options.options);
      return output.code;
    }
  };
}

import { ParsingOptions, read, utils } from "../deps/sheetjs.ts";
import { merge } from "../core/utils/object.ts";
import loadFile from "../core/loaders/binary.ts";

import type Site from "../core/site.ts";
import type { RawData } from "../core/file.ts";

export interface Options {
  /** Extensions processed by this plugin */
  extensions?: string[];

  /** Return the first sheet only or all sheets if the document have more */
  sheets?: "first" | "auto";

  /** Options passed to Sheetjs */
  options?: ParsingOptions;
}

export const defaults: Options = {
  extensions: [".xlsx", ".numbers", ".csv"],
  sheets: "auto",
  options: {},
};

/**
 * A plugin to load Excel, Numbers, and CSV files
 * @see https://lume.land/plugins/sheets/
 */
export function sheets(userOptions?: Options) {
  const options = merge(defaults, userOptions);

  async function loader(path: string): Promise<RawData> {
    const { content } = await loadFile(path);
    const wb = read(content, options.options);

    // Return only the first sheet
    if (options.sheets === "first" || wb.SheetNames.length === 1) {
      const sheet = wb.Sheets[wb.SheetNames[0]];
      return utils.sheet_to_json(sheet) as unknown as RawData;
    }

    // Return all sheets by name
    const sheets: Record<string, unknown[]> = {};
    wb.SheetNames.forEach((name) => {
      sheets[name] = utils.sheet_to_json(wb.Sheets[name]);
    });

    return { content: sheets };
  }

  return (site: Site) => {
    site.loadData(options.extensions, loader);

    // Ignore temp files generated by Numbers (https://github.com/lumeland/lume/issues/245)
    if (options.extensions.includes(".numbers")) {
      site.options.watcher.ignore.push((path) =>
        !!path.match(/\.numbers\.[\w-]+$/)
      );
    }
  };
}

export default sheets;

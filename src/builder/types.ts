import * as t from 'io-ts';

export const BuildCmdRuntime = t.intersection([
    t.type({ module_name: t.string }),
    t.partial({ module_version: t.string }),
  ]);

export type BuildCmd = t.TypeOf<typeof BuildCmdRuntime>;

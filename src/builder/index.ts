import * as tar from 'tar';
import * as request from 'request';
import * as webpack from 'webpack';
import * as R from 'ramda';
import { Request } from 'hapi';
import { mkdirSync, readFileSync, statSync } from 'fs';
import { execSync } from 'child_process';
import { BuildCmd, BuildCmdRuntime } from './types';
import { badRequest } from 'boom';
import { PathReporter } from 'io-ts/lib/PathReporter';
const REGISTRY_URL = 'http://registry.npmjs.org';
const components_prefix = 'components/';

export function download(url: string, targetPath: string): Promise<string> {
  return new Promise((res, rej) => {
    console.log(`Downloading tarball from ${url}...`);
    const s = request(url).pipe(
      tar.x({
        strip: 1,
        C: targetPath,
      }),
    );
    s.on('end', () => res(targetPath));
  });
}

function folderExists(path: string) {
  try {
      const stat = statSync(path);
      return stat.isDirectory();
  } catch (err) {
      if (err.code === 'ENOENT') {
          return false;
      }
      throw err;
  }
}

export async function handleRequest(req: Request, rep: any): Promise<any> {
  const { payload } = req;
  const payloadValidation = BuildCmdRuntime.decode(payload);
  return payloadValidation
    .map((p) => build(p))
    .getOrElseL(() => {
      const errString: string = PathReporter.report(payloadValidation).join();
      console.log(errString);
      const err = new Error(errString);
      const newError: any = R.test(/invalid/gi, err.message) ?
        badRequest(err.message, 'INVALID_PAYLOAD') :
        badRequest(err.message);

      // this is so Hapi passes the data along, see https://github.com/hapijs/boom/issues/49
      newError.output.payload.data = newError.data;
      throw newError;
    });
}

export function build(options: BuildCmd): Promise<string> {
  const { module_name, module_version } = options;
  const local_path = `${process.cwd()}/${components_prefix}${module_name}/${module_version}`;
  // check if build folder exists
  if (folderExists(local_path)) {
    return Promise.resolve(`${local_path}/biojs-build/build.js`);
  }
  console.log(`No build available for ${module_name}@${module_version}`);
  console.log('Creating directory...');
  mkdirSync(local_path, { recursive: true });
  // download if not
  const module_path = module_name.indexOf('@') > -1 ? `${module_name}/` : '';
  const url = `${REGISTRY_URL}/${module_path}-/${module_name}-${module_version}.tgz`;
  return download(url, local_path)
    .then((downloaded_path: string) => {
      // run npm i
      execSync('npm i', { cwd: downloaded_path });
      // build
      const file = readFileSync(`${downloaded_path}/package.json`);
      const pack = JSON.parse(file.toString());
      const entry = `${downloaded_path}/${pack.main || 'index.js'}`;

      const compiler = webpack({
        entry,
        output: {
          path: `${downloaded_path}/biojs-build/`,
          library: module_name,
          libraryTarget: 'umd',
        },
        node: {
          fs: 'empty',
        },
        target: 'web',
        mode: 'none',
      });
      compiler.run((err: any, stats: any) => {
        if (err || stats.hasErrors()) {
          console.log(err);
          throw new Error('Couldn\'t build component!');
        }
      });
      // return link to build.js
      return `${downloaded_path}/biojs-build/build.js`;
    });
}

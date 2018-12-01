import * as tar from 'tar';
import * as request from 'request';
import * as webpack from 'webpack';
import { mkdirSync, readFileSync, statSync } from 'fs';
import { execSync } from 'child_process';
const REGISTRY_URL = 'http://registry.npmjs.org';
const components_prefix = 'components/';

export function download(url: string, targetPath: string): Promise<string> {
  // const module_path = '';
  // const module_name = 'mplexviz-ngraph';
  // const module_name = 'cytoscape';
  // const module_version = '1.1.4';

  return new Promise((res, rej) => {
    console.log(`Downloading tarball from ${url}...`);
    const s = request(url).pipe(
      tar.x({
        strip: 1,
        C: targetPath, // alias for cwd:'some-dir', also ok
      }),
    );
    s.on('end', () => res(targetPath));
  });
}

export interface BuildCmd {
  module_name: string;
  module_version: string;
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

export function build(options: BuildCmd): Promise<string> {
  const { module_name, module_version } = options;
  const local_path = `${process.cwd()}/${components_prefix}${module_name}/${module_version}`;
  // check if build folder exists
  if (folderExists(local_path)) {
    console.log('exists!');
    return Promise.resolve(`${local_path}/biojs-build/build.js`);
  }
  // https://registry.npmjs.org/@repositive/iris/-/iris-1.0.0-alpha.8.tgz
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
          // Handle errors here
          console.log(err);
        }
        console.log(stats);
        console.log(stats.warnings);
      });
      // return link to build.js
      return `${downloaded_path}/biojs-build/build.js`;
    });
}

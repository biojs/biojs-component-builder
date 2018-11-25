import * as tar from 'tar';
import * as request from 'request';
import * as webpack from 'webpack';
import { mkdirSync, readFileSync } from 'fs';
import { execSync } from 'child_process';
const REGISTRY_URL = 'http://registry.npmjs.org';
const components_prefix = 'components/';
const module_path = '';
const module_name = 'mplexviz-ngraph';
// const module_name = 'cytoscape';
const module_version = '1.1.4';
// const module_version = '3.2.20';

export function download(): Promise<string> {
  return new Promise((res, rej) => {
    console.log('Creating path...');
    const component_path = components_prefix + module_name;
    mkdirSync(component_path, { recursive: true });
    const url = `${REGISTRY_URL}/${module_path}/-/${module_name}-${module_version}.tgz`;
    console.log(`Downloading tarball from ${url}...`);
    const s = request(url).pipe(
      tar.x({
        strip: 1,
        C: component_path, // alias for cwd:'some-dir', also ok
      }),
    );
    s.on('end', () => res(component_path));
  });
}

export function build(path: string) {
  console.log(path);
  const file = readFileSync(`./${path}/package.json`);
  const pack = JSON.parse(file.toString());
  const cwd = `${process.cwd()}/${path}/`;
  const entry = `${cwd}${pack.main || 'index.js'}`;

  execSync('npm i', { cwd });

  const compiler = webpack({
    entry,
    output: {
      path: `${process.cwd()}/asdsa/${path}`,
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
}

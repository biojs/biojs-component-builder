import * as tar from 'tar';
import * as request from 'request';
import * as webpack from 'webpack';
import { Request, ResponseToolkit } from 'hapi';
import { mkdirSync, readFileSync, createReadStream, rmdirSync, existsSync } from 'fs';
import { execSync } from 'child_process';
const REGISTRY_URL = 'http://registry.npmjs.org';
const components_prefix = 'components/';
const bundle_filename = 'main.js';

export interface ComponentInfo {
  module_name: string;
  module_version: string;
}

export function download(url: string, targetPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    console.log(`Downloading tarball from ${url}...`);
    const req = request
      .get(url)
      .on('response', (res) => {
        if (res.statusCode === 200) {
          const s = req.pipe(
            tar.x({
              strip: 1,
              C: targetPath,
            }),
          );
          s.on('end', () => resolve(targetPath));
        } else {
          reject(`Error downloading file at ${url}! ${res.statusCode} - ${res.statusMessage}`);
        }
      });
  });
}

export async function build(options: ComponentInfo, h: ResponseToolkit): Promise<{ built: boolean, path?: string }> {
  const { module_name, module_version } = options;
  const local_path = `${process.cwd()}/${components_prefix}${module_name}/${module_version}`;
  const bundle_path = `${local_path}/biojs-build/${bundle_filename}`;

  if (existsSync(bundle_path)) {
    return { built: true, path: bundle_path };
  }

  console.log(`No build available for ${module_name}@${module_version}`);
  console.log('Creating directory...');
  mkdirSync(local_path, { recursive: true });
  // download if not
  const module_path = module_name.indexOf('@') > -1 ? `${module_name}/` : '';
  const url = `${REGISTRY_URL}/${module_path}-/${module_name}-${module_version}.tgz`;
  download(url, local_path)
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
    })
    .catch((err) => {
      console.log('There was an error building the component!', err);
      rmdirSync(local_path);
    });
  return { built: false };
}

export async function handleRequest(req: Request, h: ResponseToolkit): Promise<any> {
  const query = req.query as any; // Compiler doesn't get this.
  return build(query, h)
    .then((res) => {
      const { built, path } = res;
      if (built && path) {
        const stream = createReadStream(path);
        return h.response(stream)
          .type('application/javascript')
          .header('Content-type', 'application/javascript');
      } else {
        return h.response(`building...`);
      }
    });
}

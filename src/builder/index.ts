import * as tar from 'tar';
import * as request from 'request';
import * as webpack from 'webpack';
import { promisify } from 'util';
import { Request, ResponseToolkit } from 'hapi';
import { mkdirSync, readFileSync, createReadStream, rmdirSync, existsSync } from 'fs';
import { exec as execCB } from 'child_process';
const exec = promisify(execCB);
const REGISTRY_URL = 'http://registry.npmjs.org';
const components_prefix = 'components/';
const bundle_filename = 'main.js';

export interface ComponentInfo {
  module_name: string;
  module_version: string;
}

export function download(module_name: string, module_version: string, targetPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const module_path = module_name.indexOf('@') > -1 ? `${module_name}/` : '';
    const url = `${REGISTRY_URL}/${module_path}-/${module_name}-${module_version}.tgz`;
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
          s.on('end', () => {
            console.log(`Done dowloading to ${targetPath}!`);
            resolve(targetPath);
          });
        } else {
          reject(`Error downloading file at ${url}! ${res.statusCode} - ${res.statusMessage}`);
        }
      });
  });
}

export function compile(downloaded_path: string, module_name: string) {
  return async () => {
    console.log('Compiling bundle....');
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
      console.log(`Done compiling ${module_name}`);
    });
  };
}

export async function install(downloaded_path: string) {
  console.log(`Starting to install dependecies in ${downloaded_path}...`);
  return exec('npm i', { cwd: downloaded_path })
    .then((res) => {
      console.log(`Done installing! ${res.stdout}${res.stderr}`);
      return res;
    });
}

export async function build(options: ComponentInfo, h: ResponseToolkit): Promise<{ built: boolean, path?: string }> {
  const { module_name, module_version } = options;
  const local_path = `${process.cwd()}/${components_prefix}${module_name}/${module_version}`;
  const bundle_path = `${local_path}/biojs-build/${bundle_filename}`;

  // TODO: Maybe store broken builts in folder names or sth and return an error on retry.
  if (existsSync(bundle_path)) {
    return { built: true, path: bundle_path };
  } else if (existsSync(local_path)) {
    // This means it's been downloaded but not yet built
    return { built: false };
  }

  console.log(`No build available for ${module_name}@${module_version}`);
  console.log('Creating directory...');
  mkdirSync(local_path, { recursive: true });

  download(module_name, module_version, local_path)
    .then(install)
    .then(compile(local_path, module_name))
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
        return h.response('Compnent bundle not available. Building now...')
          .code(302)
          .header('Retry-After', '20');
      }
    });
}

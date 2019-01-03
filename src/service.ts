import * as config from 'config';
import { string } from 'joi';
import { handleRequest } from './builder';
import { Server } from 'hapi';

export default async function init({
  _config = config,
}: {
  _config?: typeof config,
}): Promise<Server> {

  // const module_name = 'mplexviz-ngraph';
  // const module_name = '@chgibb/angularplasmid';
  // const module_name = 'cytoscape';
  // const module_version = '1.1.4';
  // const module_version = '1.0.5';
  // const module_version = '3.2.20';
  // const payload: BuildCmd = { module_name, module_version };

  // Hapi server
  const server = new Server({
    port: _config.get('server.port'),
    routes: {
      cors: true,
    },
  });

  const options = {
    validate: {
      query: {
        module_name: string().min(1),
        module_version: string().min(1).default('latest'),
      },
    },
  };

  server.route([
    { method: 'GET', path: '/status', handler: () => 'ok' },
    { method: 'GET', path: '/component', options, handler: handleRequest },
  ]);
  return server;
}

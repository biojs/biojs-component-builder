import * as config from 'config';
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
    port: config.get('server.port'),
    routes: {
      cors: true,
    },
  });

  server.route([
    { method: 'GET', path: '/status', handler: () => 'ok' },
    { method: 'POST', path: '/build', handler: handleRequest },
  ]);
  return server;
}

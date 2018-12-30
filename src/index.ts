import init from './service';
import { Server } from 'hapi';

function onError(error: Error) {
  console.log(error);
  process.exit(1);
}

try {
  init({})
    .then((server: Server) => {
      console.log('Starting server...');
      return server.start().then(() => {
        console.log(`Server started in ${server.info.uri}`);
      });
    })
    .then(() => {
      console.log('Service started');
    })
    .catch(onError);
} catch (error) {
  onError(error);
}

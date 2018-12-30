import * as config from 'config';
import { build, BuildCmd } from './builder';
import { connect } from 'amqplib';

export default async function init({
  _config = config,
}: {
    _config?: typeof config,
  }): Promise<string> {

  const conn = await connect('amqp://guest:guest@rabbit:5672');
  conn.on('error', (err) => console.log(err));
  conn.createChannel()
    .then((ch) => {
      return ch.assertQueue('biojs')
        .then((queue) => {
          console.log('queue!', queue);
        });
    });

  // const module_name = 'mplexviz-ngraph';
  const module_name = '@chgibb/angularplasmid';
  // const module_name = 'cytoscape';
  // const module_version = '1.1.4';
  const module_version = '1.0.5';
  // const module_version = '3.2.20';
  const payload: BuildCmd = { module_name, module_version };
  return build(payload)
    .then((buildFile) => {
      console.log(buildFile);
      return buildFile;
    });
}

import * as config from 'config';
import { build, BuildCmd } from './builder';

export default async function init({
  _config = config,
}: {
  _config?: typeof config,
}): Promise<string> {
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

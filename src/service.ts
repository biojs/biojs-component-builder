import * as config from 'config';
import { download, build } from './builder';

export default async function init({
  _config = config,
}: {
  _config?: typeof config,
}): Promise<void> {
  download()
    .then((res) => {
      console.log(res);
      build(res);
    });
}

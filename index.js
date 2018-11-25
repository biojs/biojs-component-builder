const webpack = require('webpack');

webpack({
  // Configuration Object
}, (err, stats) => {
  if (err || stats.hasErrors()) {
    // Handle errors here
  }
  // Done processing
});

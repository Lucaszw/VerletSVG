var webConfigs = [{
  entry: './src/magicFabric.js',
  output: {
    filename: './build/magicFabric.web.js',
    library: 'magicFabric',
    libraryTarget: 'var'
  },
  module:{
      loaders: [
        { test: /\.css$/,
          use: [
            { loader: 'style-loader' },
            { loader: 'css-loader' }
          ]
        }
      ]
    },
},

{
  entry: './src/graphToD3.js',
  output: {
    filename: './build/graphToD3.web.js',
    library: 'graphToD3',
    libraryTarget: 'var'
  },
  module:{
      loaders: [
        { test: /\.css$/,
          use: [
            { loader: 'style-loader' },
            { loader: 'css-loader' }
          ]
        }
      ]
    }
  },

  {
    entry: './src/perspective.js',
    output: {
      filename: './build/perspective.web.js',
      library: 'perspective',
      libraryTarget: 'var'
    },
    module: {
      loaders: [
        { test: /\.css$/,
          use: [
            { loader: 'style-loader' },
            { loader: 'css-loader' }
          ]
        }
      ]
    }
  }
];

module.exports = webConfigs;

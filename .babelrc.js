const pkg    = require('./package.json');
const semver = require('semver');

function getVersion() {
    const engineVer = semver.coerce(pkg.engines.node);
    const nodeVer   = semver.coerce(process.version);
    
    if (semver.lt(nodeVer, engineVer)) {
        process.stderr.write(`Node version mismatch. Expecting ${nodeVer.version} >= ${engineVer.version}.\n`);
        process.exit(1);
    }
    
    return engineVer.version;
}

module.exports = ({ cache, env }) => {
    
    const ENV = process.env.BABEL_ENV || process.env.NODE_ENV;
    
    const isDev  = () => /^dev/i.test(ENV);
    const isProd = () => /^prod/i.test(ENV);
    
    // Cached based on the value of some function. If this function returns a value different from
    // a previously-encountered value, the plugins will re-evaluate.
    cache(() => ENV);
    
    // .cache(fn) will perform a linear search though instances to find the matching plugin based
    // based on previous instantiated plugins. If you want to recreate the plugin and discard the
    // previous instance whenever something changes, you may use:
    cache.invalidate(() => isProd());
    
    const resolver = pkg['module-resolver'] || {};
    
    const presets = [
        [
            '@babel/preset-env',
            {
                targets: {
                    node: `${getVersion()}`
                },
                useBuiltIns: 'usage',
                modules: 'commonjs',
                debug: false
            }
        ],
        '@babel/preset-flow'
    ];
    
    const plugins = [
        '@babel/plugin-proposal-class-properties',
        '@babel/plugin-proposal-export-default-from',
        ['module-resolver', resolver],
        'lodash',
    ];
    
    const environments = {
        test: {}
    };
    
    const sourceMaps = 'inline';
    
    // Return the value that will be cached.
    return { presets, env: environments, plugins, sourceMaps };
};

import esbuild from 'esbuild';
import path from 'path';
import {readdir, readFile} from 'fs/promises';

let actualDependencies = new Set();

let makeAllPackagesExternalPlugin = {
  name: 'make-all-packages-external',
  setup(build) {
    let filter = /^[^./]|^\.[^./]|^\.\.[^/]/; // Must not start with "/" or "./" or "../"
    build.onResolve({filter}, args => {
      actualDependencies.add(args.path);
      return {path: args.path, external: true};
    });
  },
};

let makeYarnWorkspacesExternalPlugin = {
  name: 'make-yarn-workspaces-external',
  async setup(build) {
    let workspaces = await findWorkspaceSiblings();
    let filter = /^(\/|\.\/|\.\.\/)/; // Must start with "/" or "./" or "../"

    build.onResolve({filter}, ({resolveDir, path: importPath}) => {
      let absPath = path.resolve(resolveDir, importPath);
      if (absPath in workspaces) {
        let {name} = workspaces[absPath];
        actualDependencies.add(name);
        console.log(`importing "${importPath}" as "${name}"`);
        return {
          path: name,
          external: true,
        };
      } else {
        return {};
      }
    });
  },
};

main();

async function main() {
  let {proxy, dependencies, peerDependencies} = await getPackageJson('.');
  let declaredDependencies = new Set(
    Object.keys({...dependencies, ...peerDependencies})
  );

  await esbuild.build({
    entryPoints: [proxy],
    outfile: './dist/index.js',
    bundle: true,
    format: 'esm',
    plugins: [makeAllPackagesExternalPlugin, makeYarnWorkspacesExternalPlugin],
  });

  checkDependencies(declaredDependencies, actualDependencies);
}

async function findWorkspaceSiblings() {
  let {dependencies, peerDependencies} = await getPackageJson('.');
  dependencies = {...dependencies, ...peerDependencies};

  // traverse directory tree upwards
  for (
    let cwd = path.resolve('.');
    cwd !== '/';
    cwd = path.resolve(cwd, '..')
  ) {
    // console.log(cwd);

    let workspaces = (await getPackageJson(cwd))?.workspaces;
    if (workspaces) {
      // return workspaces.map(ws => path.resolve(cwd, ws));
      let workspaceSiblings = {};

      for (let ws of workspaces) {
        let absPath = path.resolve(cwd, ws);
        let {name, version, proxy} = await getPackageJson(absPath);
        if (proxy) {
          absPath = path.resolve(cwd, path.parse(proxy).name);
        }
        if (name in dependencies) {
          // check if version is correct
          if (dependencies[name] !== version) {
            throw Error(
              `Sibling workspace "${name}" should have version ${version}, not ${dependencies[name]}`
            );
          }
          workspaceSiblings[absPath] = {name, version};
        }
      }
      return workspaceSiblings;
    }
  }
  return {};
}

async function getPackageJson(dir) {
  let files = await readdir(dir);
  if (!files.includes('package.json')) return null;
  let packageJson = await readFile(path.resolve(dir, 'package.json'), {
    encoding: 'utf-8',
  });
  return JSON.parse(packageJson);
}

function checkDependencies(declared, actual) {
  for (let x of actual) {
    if (!declared.has(x)) {
      throw Error('Missing dependency: ' + x);
    }
  }
  for (let x of declared) {
    if (!actual.has(x)) {
      throw Error('Unused dependency: ' + x);
    }
  }
  return;
}
